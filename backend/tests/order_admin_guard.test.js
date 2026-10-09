const assert = require('node:assert/strict');
const test = require('node:test');
const Order = require('../models/order');
const { createOrder, updateOrderStatus } = require('../controllers/order_controller');

const callStatusUpdate = async (order, status, t) => {
  let updateCount = 0;
  t.mock.method(Order, 'findById', async () => order);
  t.mock.method(Order, 'findOneAndUpdate', async () => {
    updateCount += 1;
    return order;
  });
  const result = { statusCode: 200, body: null, error: null };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  await updateOrderStatus({
    params: { orderId: '507f1f77bcf86cd799439011' },
    body: { status },
  }, res, (error) => { result.error = error; });
  return { ...result, updateCount };
};

test('admin cannot confirm an unpaid order', async (t) => {
  const result = await callStatusUpdate({
    status: 'pending',
    paymentStatus: 'pending',
  }, 'confirmed', t);
  assert.equal(result.statusCode, 409);
  assert.equal(result.updateCount, 0);
});

test('admin cannot cancel a paid order before refund processing', async (t) => {
  const result = await callStatusUpdate({
    status: 'confirmed',
    paymentStatus: 'paid',
  }, 'cancelled', t);
  assert.equal(result.statusCode, 409);
  assert.equal(result.updateCount, 0);
});

test('legacy direct order creation is disabled in favor of the payment checkout flow', () => {
  const result = { statusCode: 200, body: null };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  createOrder({}, res);
  assert.equal(result.statusCode, 410);
  assert.match(result.body.error, /\/api\/payments\/create-order/);
});
