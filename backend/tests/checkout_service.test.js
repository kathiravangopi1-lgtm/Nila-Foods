const { test } = require('node:test');
const assert = require('node:assert/strict');
const Cart = require('../models/cart');
const Order = require('../models/order');
const Product = require('../models/product');
const { cancelUnpaidCheckoutOrder } = require('../services/checkout_service');

test('cancelling an unpaid checkout restores reserved stock and cart items only once', async (t) => {
  const originalFindOneAndUpdate = Order.findOneAndUpdate;
  const originalFindOne = Order.findOne;
  const originalProductUpdateOne = Product.updateOne;
  const originalCartFindOne = Cart.findOne;
  const productId = '507f1f77bcf86cd799439011';
  const order = {
    _id: '507f1f77bcf86cd799439012',
    user: '507f1f77bcf86cd799439013',
    status: 'pending',
    paymentStatus: 'pending',
    items: [
      { product: { toString: () => productId }, quantity: 1 },
      { product: { toString: () => productId }, quantity: 3 },
    ],
  };
  const cart = {
    items: [{ product: { toString: () => productId }, quantity: 2 }],
    async save() {},
  };
  const stockAdjustments = [];
  let cancellationCount = 0;

  t.after(() => {
    Order.findOneAndUpdate = originalFindOneAndUpdate;
    Order.findOne = originalFindOne;
    Product.updateOne = originalProductUpdateOne;
    Cart.findOne = originalCartFindOne;
  });

  Order.findOneAndUpdate = async (filter, update) => {
    if (filter.status !== 'pending' || order.status !== 'pending') return null;
    cancellationCount += 1;
    order.status = update.$set.status;
    order.paymentStatus = update.$set.paymentStatus;
    return order;
  };
  Order.findOne = async () => order;
  Product.updateOne = async (filter, update) => {
    stockAdjustments.push({ productId: filter._id, quantity: update.$inc.stock });
    return { matchedCount: 1 };
  };
  Cart.findOne = async () => cart;

  const firstResult = await cancelUnpaidCheckoutOrder({ orderId: order._id, userId: order.user });
  const secondResult = await cancelUnpaidCheckoutOrder({ orderId: order._id, userId: order.user });

  assert.equal(firstResult.cancelled, true);
  assert.equal(firstResult.alreadyCancelled, false);
  assert.equal(secondResult.cancelled, true);
  assert.equal(secondResult.alreadyCancelled, true);
  assert.equal(cancellationCount, 1);
  assert.deepEqual(stockAdjustments, [{ productId, quantity: 4 }]);
  assert.equal(cart.items[0].quantity, 6);
  assert.equal(order.status, 'cancelled');
  assert.equal(order.paymentStatus, 'failed');
});
