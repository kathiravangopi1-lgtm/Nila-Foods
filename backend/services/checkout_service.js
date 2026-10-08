const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Order = require('../models/order');
const Product = require('../models/product');

const rollbackStockChanges = async (changes) => {
  const failures = [];
  for (const { productId, quantity } of changes.reverse()) {
    try {
      const result = await Product.updateOne(
        { _id: productId },
        { $inc: { stock: quantity } },
      );
      if (result.matchedCount !== 1) {
        throw new Error(`Could not restore stock for product ${productId}.`);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, 'One or more stock reservations could not be rolled back.');
  }
};

const rollbackStockAdjustments = async (changes, direction) => {
  const failures = [];
  for (const { productId, quantity } of [...changes].reverse()) {
    try {
      const result = await Product.updateOne(
        { _id: productId },
        { $inc: { stock: direction * quantity } },
      );
      if (result.matchedCount !== 1) {
        throw new Error(`Could not roll back stock for product ${productId}.`);
      }
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) {
    throw new AggregateError(failures, 'One or more stock adjustments could not be rolled back.');
  }
};

const cancelUnpaidCheckoutOrder = async ({ orderId, userId }) => {
  const order = await Order.findOneAndUpdate(
    {
      _id: orderId,
      user: userId,
      status: 'pending',
      paymentStatus: { $in: ['pending', 'failed'] },
    },
    {
      $set: {
        status: 'cancelled',
        paymentStatus: 'failed',
      },
    },
    { new: true },
  );

  if (!order) {
    const existingOrder = await Order.findOne({ _id: orderId, user: userId });
    if (!existingOrder) return null;
    const alreadyCancelled = existingOrder.status === 'cancelled'
      && existingOrder.paymentStatus === 'failed';
    return {
      order: existingOrder,
      cancelled: alreadyCancelled,
      alreadyCancelled,
    };
  }

  const quantities = new Map();
  for (const item of order.items) {
    if (!item.product) continue;
    const productId = item.product.toString();
    quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
  }

  const restoredItems = [];
  try {
    for (const [productId, quantity] of quantities) {
      const result = await Product.updateOne(
        { _id: productId },
        { $inc: { stock: quantity } },
      );
      if (result.matchedCount !== 1) {
        throw new Error(`Could not restore stock for product ${productId}.`);
      }
      restoredItems.push({ productId, quantity });
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) cart = new Cart({ user: userId, items: [] });
    for (const item of order.items) {
      if (!item.product) continue;
      const productId = item.product.toString();
      const cartItem = cart.items.find((entry) => entry.product.toString() === productId);
      if (cartItem) cartItem.quantity += item.quantity;
      else cart.items.push({ product: item.product, quantity: item.quantity });
    }
    await cart.save();

    return { order, cancelled: true, alreadyCancelled: false };
  } catch (error) {
    let rollbackError;
    try {
      await rollbackStockAdjustments(restoredItems, -1);
      const revertedOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: 'cancelled',
          paymentStatus: 'failed',
        },
        {
          $set: {
            status: 'pending',
            paymentStatus: 'pending',
          },
        },
        { new: true },
      );
      if (!revertedOrder) {
        rollbackError = new Error('Could not restore the checkout order after cancellation failed.');
      }
    } catch (errorDuringRollback) {
      rollbackError = errorDuringRollback;
    }
    if (rollbackError) {
      console.error('Failed to roll back unpaid checkout cancellation:', rollbackError);
      throw new AggregateError([error, rollbackError], 'Checkout cancellation could not be rolled back safely.');
    }
    throw error;
  }
};

const createCheckoutOrder = async ({ userId, shippingAddress, checkoutSessionId }) => {
  const existingOrder = await Order.findOne({ user: userId, checkoutSessionId });
  if (existingOrder) {
    return { order: existingOrder, created: false };
  }

  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    select: 'name sku price currency images stock isActive',
  });
  if (!cart || !cart.items.length) {
    const error = new Error('Your cart is empty.');
    error.status = 400;
    throw error;
  }

  const quantities = new Map();
  const items = cart.items.map((item) => {
    if (!item.product || !item.product.isActive) {
      const error = new Error('A product in your cart is no longer available.');
      error.status = 409;
      throw error;
    }
    if (item.product.currency !== 'INR') {
      const error = new Error('Razorpay checkout currently supports INR products only.');
      error.status = 400;
      throw error;
    }
    const productId = item.product._id.toString();
    quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
    return {
      product: item.product._id,
      name: item.product.name,
      sku: item.product.sku,
      image: item.product.images[0],
      unitPrice: item.product.price,
      quantity: item.quantity,
    };
  });

  const subtotal = Number(items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  ).toFixed(2));
  const order = new Order({
    user: userId,
    items,
    shippingAddress,
    subtotal,
    shippingCost: 0,
    tax: 0,
    total: subtotal,
    currency: 'INR',
    checkoutSessionId,
  });
  await order.validate();

  const reservedItems = [];
  try {
    for (const [productId, quantity] of quantities) {
      const result = await Product.updateOne(
        { _id: productId, isActive: true, stock: { $gte: quantity } },
        { $inc: { stock: -quantity } },
      );
      if (result.matchedCount !== 1) {
        const error = new Error('A product does not have enough stock to complete this order.');
        error.status = 409;
        throw error;
      }
      reservedItems.push({ productId, quantity });
    }

    await order.save();
    reservedItems.length = 0;
    let cartCleared = true;
    try {
      await Cart.updateOne({ user: userId }, { $set: { items: [] } });
    } catch (error) {
      cartCleared = false;
      console.error('Checkout order was created but the cart could not be cleared:', error);
    }
    return { order, created: true, cartCleared };
  } catch (error) {
    if (reservedItems.length) {
      await rollbackStockChanges(reservedItems);
    }
    if (error.code === 11000) {
      const duplicateOrder = await Order.findOne({ user: userId, checkoutSessionId });
      if (duplicateOrder) return { order: duplicateOrder, created: false };
    }
    if (error instanceof mongoose.Error.ValidationError) {
      error.status = 400;
    }
    throw error;
  }
};

module.exports = { createCheckoutOrder, cancelUnpaidCheckoutOrder };
