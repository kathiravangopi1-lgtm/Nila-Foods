const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Order = require('../models/order');
const Product = require('../models/product');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
const allowedStatusTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

const rollbackStockChanges = async (changes, direction) => {
  const errors = [];
  for (let index = changes.length - 1; index >= 0; index -= 1) {
    const { productId, quantity } = changes[index];
    try {
      const result = await Product.updateOne(
        { _id: productId },
        { $inc: { stock: direction * quantity } },
      );
      if (result.matchedCount !== 1) {
        throw new Error(`Could not restore stock for product ${productId}.`);
      }
      changes.splice(index, 1);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) {
    throw new AggregateError(errors, 'One or more stock changes could not be rolled back.');
  }
};

const createOrder = async (req, res, next) => {
  const { shippingAddress } = req.body || {};
  const requiredAddressFields = ['recipient', 'addressLine1', 'city', 'postalCode', 'country'];
  if (
    !shippingAddress
    || requiredAddressFields.some((field) => (
      typeof shippingAddress[field] !== 'string' || !shippingAddress[field].trim()
    ))
  ) {
    return res.status(400).json({
      error: `shippingAddress must include ${requiredAddressFields.join(', ')}.`,
    });
  }

  const reservedItems = [];
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate({
      path: 'items.product',
      select: 'name sku price currency images stock isActive',
    });
    if (!cart || !cart.items.length) {
      return res.status(400).json({ error: 'Your cart is empty.' });
    }

    const quantities = new Map();
    for (const item of cart.items) {
      if (!item.product || !item.product.isActive) {
        return res.status(409).json({ error: 'A product in your cart is no longer available.' });
      }
      const id = item.product._id.toString();
      quantities.set(id, (quantities.get(id) || 0) + item.quantity);
    }

    const items = cart.items.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      sku: item.product.sku,
      image: item.product.images[0],
      unitPrice: item.product.price,
      quantity: item.quantity,
    }));
    const subtotal = Number(items.reduce(
      (total, item) => total + item.unitPrice * item.quantity,
      0,
    ).toFixed(2));
    const order = new Order({
      user: req.user.id,
      items,
      shippingAddress,
      subtotal,
      shippingCost: 0,
      tax: 0,
      total: subtotal,
    });
    await order.validate();

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

    try {
      await order.save();
    } catch (error) {
      await rollbackStockChanges(reservedItems, 1);
      throw error;
    }

    reservedItems.length = 0;
    let cartCleared = true;
    try {
      await Cart.updateOne({ user: req.user.id }, { $set: { items: [] } });
    } catch (error) {
      cartCleared = false;
      console.error('Order was created but the cart could not be cleared:', error);
    }
    return res.status(201).json({
      message: cartCleared ? 'Order created.' : 'Order created, but the cart could not be cleared.',
      data: order,
      cartCleared,
    });
  } catch (error) {
    if (reservedItems.length) {
      try {
        await rollbackStockChanges(reservedItems, 1);
      } catch (rollbackError) {
        console.error('Failed to restore product stock after order failure:', rollbackError);
        return next(rollbackError);
      }
    }
    return next(error);
  }
};

const getOrders = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    const sortBy = req.query.sortBy || 'createdAt';
    const direction = req.query.direction || 'desc';
    const sortableFields = ['createdAt', 'total', 'status'];
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }
    if (!sortableFields.includes(sortBy) || !['asc', 'desc'].includes(direction)) {
      return res.status(400).json({
        error: `sortBy must be one of ${sortableFields.join(', ')} and direction must be asc or desc.`,
      });
    }
    const filter = req.user.role === 'admin' ? {} : { user: req.user.id };
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate('user', 'name email')
        .sort({ [sortBy]: direction === 'asc' ? 1 : -1, _id: direction === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Order.countDocuments(filter),
    ]);
    return res.status(200).json({
      data: orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
};

const getOrderById = async (req, res, next) => {
  if (!isValidId(req.params.orderId)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }
  try {
    const filter = { _id: req.params.orderId };
    if (req.user.role !== 'admin') {
      filter.user = req.user.id;
    }
    const order = await Order.findOne(filter).populate('user', 'name email');
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    return res.status(200).json({ data: order });
  } catch (error) {
    return next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body || {};
  if (!isValidId(orderId)) {
    return res.status(400).json({ error: 'Invalid order id.' });
  }
  if (!orderStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${orderStatuses.join(', ')}.` });
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (status === order.status) {
      return res.status(200).json({ message: 'Order status is unchanged.', data: order });
    }
    if (!allowedStatusTransitions[order.status].includes(status)) {
      return res.status(409).json({
        error: `An order in "${order.status}" status cannot be changed to "${status}".`,
      });
    }

    const updatedOrder = await Order.findOneAndUpdate(
      { _id: orderId, status: order.status },
      { $set: { status } },
      { new: true, runValidators: true },
    );
    if (!updatedOrder) {
      return res.status(409).json({ error: 'Order status changed; reload and try again.' });
    }

    if (status === 'cancelled') {
      const quantities = new Map();
      for (const item of order.items) {
        if (!item.product) {
          continue;
        }
        const productId = item.product.toString();
        quantities.set(productId, (quantities.get(productId) || 0) + item.quantity);
      }
      const restockedItems = [];
      try {
        for (const [productId, quantity] of quantities) {
          const result = await Product.updateOne(
            { _id: productId },
            { $inc: { stock: quantity } },
          );
          if (result.matchedCount !== 1) {
            throw new Error(`Could not restore stock for product ${productId}.`);
          }
          restockedItems.push({ productId, quantity });
        }
      } catch (error) {
        let rollbackError;
        try {
          await rollbackStockChanges(restockedItems, -1);
        } catch (errorDuringRollback) {
          rollbackError = errorDuringRollback;
        }
        if (!rollbackError) {
          const revertedOrder = await Order.findOneAndUpdate(
            { _id: orderId, status: 'cancelled' },
            { $set: { status: order.status } },
            { new: true },
          );
          if (!revertedOrder) {
            rollbackError = new Error('Could not restore the order status after stock rollback.');
          }
        }
        if (rollbackError) {
          console.error('Failed to roll back order cancellation:', rollbackError);
          return next(rollbackError);
        }
        return next(error);
      }
      return res.status(200).json({
        message: 'Order status updated.',
        data: updatedOrder,
      });
    }
    return res.status(200).json({ message: 'Order status updated.', data: updatedOrder });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
};
