const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const test = require('node:test');
const Order = require('../models/order');
const RazorpayWebhookEvent = require('../models/razorpay_webhook_event');
const Cart = require('../models/cart');
const Product = require('../models/product');
const { processPaymentWebhook } = require('../controllers/payment_controller');

process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret';

const requestFor = (event, eventId = 'evt_test_123') => {
  const body = Buffer.from(JSON.stringify(event));
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return {
    body,
    get: (header) => {
      if (header === 'x-razorpay-signature') return signature;
      if (header === 'x-razorpay-event-id') return eventId;
      return undefined;
    },
  };
};

const callWebhook = async (req) => {
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
  await processPaymentWebhook(req, res, (error) => { result.error = error; });
  if (result.error) throw result.error;
  return result;
};

const capturedEvent = {
  event: 'payment.captured',
  payload: {
    payment: {
      entity: {
        order_id: 'order_1',
        id: 'pay_1',
        amount: 2500,
        currency: 'INR',
        method: 'upi',
        created_at: 1791520000,
      },
    },
  },
};

test('captured webhook events require an event ID and update payment only after amount validation', async (t) => {
  const order = {
    _id: '507f1f77bcf86cd799439011',
    user: '507f1f77bcf86cd799439012',
    total: 25,
    status: 'pending',
    paymentStatus: 'pending',
  };
  let orderUpdate;
  t.mock.method(Order, 'findOne', async () => order);
  t.mock.method(Order, 'updateOne', async (filter, update) => {
    orderUpdate = { filter, update };
    return { matchedCount: 1 };
  });
  const webhookRecord = {
    _id: 'event-1',
    status: 'processing',
    async save() { this.status = 'processed'; },
  };
  t.mock.method(RazorpayWebhookEvent, 'create', async () => webhookRecord);

  const noEventId = await callWebhook(requestFor(capturedEvent, ''));
  assert.equal(noEventId.statusCode, 400);
  const result = await callWebhook(requestFor(capturedEvent));
  assert.equal(result.statusCode, 200);
  assert.equal(orderUpdate.update.$set.paymentStatus, 'paid');
  assert.equal(orderUpdate.filter.razorpayPaymentId.$in.includes('pay_1'), true);
  assert.equal(webhookRecord.status, 'processed');
});

test('duplicate captured webhook deliveries do not update the order twice', async (t) => {
  let orderFindCount = 0;
  let orderUpdateCount = 0;
  const order = {
    _id: '507f1f77bcf86cd799439011',
    user: '507f1f77bcf86cd799439012',
    total: 25,
    status: 'pending',
    paymentStatus: 'pending',
  };
  const webhookRecord = {
    _id: 'event-2',
    status: 'processing',
    async save() { this.status = 'processed'; },
  };
  let isDuplicate = false;
  t.mock.method(Order, 'findOne', async () => {
    orderFindCount += 1;
    return order;
  });
  t.mock.method(Order, 'updateOne', async () => {
    orderUpdateCount += 1;
    return { matchedCount: 1 };
  });
  t.mock.method(RazorpayWebhookEvent, 'create', async () => {
    if (isDuplicate) {
      const error = new Error('duplicate webhook event');
      error.code = 11000;
      throw error;
    }
    isDuplicate = true;
    return webhookRecord;
  });
  t.mock.method(RazorpayWebhookEvent, 'findOne', async () => webhookRecord);

  await callWebhook(requestFor(capturedEvent));
  const duplicate = await callWebhook(requestFor(capturedEvent));
  assert.equal(duplicate.body.duplicate, true);
  assert.equal(orderFindCount, 1);
  assert.equal(orderUpdateCount, 1);
});

test('stale in-progress webhook records can be safely reclaimed after a crashed handler', async (t) => {
  let orderUpdateCount = 0;
  const webhookRecord = {
    _id: 'event-stale',
    status: 'processing',
    updatedAt: new Date(Date.now() - 10 * 60 * 1000),
    async save() { this.status = 'processed'; },
  };
  const order = {
    _id: '507f1f77bcf86cd799439011',
    user: '507f1f77bcf86cd799439012',
    total: 25,
    status: 'pending',
    paymentStatus: 'pending',
  };
  t.mock.method(RazorpayWebhookEvent, 'create', async () => {
    const error = new Error('duplicate webhook event');
    error.code = 11000;
    throw error;
  });
  t.mock.method(RazorpayWebhookEvent, 'findOne', async () => webhookRecord);
  t.mock.method(RazorpayWebhookEvent, 'findOneAndUpdate', async (_query, update) => {
    webhookRecord.updatedAt = update.$set.updatedAt;
    return webhookRecord;
  });
  t.mock.method(Order, 'findOne', async () => order);
  t.mock.method(Order, 'updateOne', async () => {
    orderUpdateCount += 1;
    return { matchedCount: 1 };
  });
  const result = await callWebhook(requestFor(capturedEvent, 'evt_stale'));
  assert.equal(result.statusCode, 200);
  assert.equal(orderUpdateCount, 1);
  assert.equal(webhookRecord.status, 'processed');
});

test('failed payment webhooks do not cancel orders, restore stock, or return cart items', async (t) => {
  let update;
  const order = {
    _id: '507f1f77bcf86cd799439011',
    user: '507f1f77bcf86cd799439012',
    status: 'pending',
    paymentStatus: 'pending',
  };
  const webhookRecord = {
    _id: 'event-3',
    status: 'processing',
    async save() { this.status = 'processed'; },
  };
  t.mock.method(Order, 'findOne', async () => order);
  t.mock.method(Order, 'updateOne', async (_filter, value) => {
    update = value;
    return { matchedCount: 1 };
  });
  t.mock.method(RazorpayWebhookEvent, 'create', async () => webhookRecord);
  t.mock.method(Cart, 'findOne', async () => {
    throw new Error('failed payment must not restore cart');
  });
  t.mock.method(Product, 'updateOne', async () => {
    throw new Error('failed payment must not adjust stock');
  });
  const failureEvent = {
    ...capturedEvent,
    event: 'payment.failed',
    payload: {
      payment: {
        entity: { ...capturedEvent.payload.payment.entity, id: 'pay_failed' },
      },
    },
  };
  const result = await callWebhook(requestFor(failureEvent, 'evt_test_failed'));
  assert.equal(result.statusCode, 200);
  assert.equal(update.$set.paymentStatus, 'failed');
});

test('a capture racing with cancellation is recorded for refund reconciliation', async (t) => {
  let updateCount = 0;
  let capturedUpdate;
  const cancelledOrder = {
    _id: '507f1f77bcf86cd799439011',
    user: '507f1f77bcf86cd799439012',
    total: 25,
    status: 'cancelled',
    paymentStatus: 'failed',
  };
  const webhookRecord = {
    _id: 'event-race',
    status: 'processing',
    async save() { this.status = 'processed'; },
  };
  t.mock.method(Order, 'findOne', async () => cancelledOrder);
  t.mock.method(Order, 'updateOne', async (_filter, update) => {
    updateCount += 1;
    if (updateCount === 2) capturedUpdate = update;
    return { matchedCount: updateCount === 1 ? 0 : 1 };
  });
  t.mock.method(Order, 'findById', async () => cancelledOrder);
  t.mock.method(RazorpayWebhookEvent, 'create', async () => webhookRecord);
  t.mock.method(console, 'error', () => {});

  const result = await callWebhook(requestFor(capturedEvent, 'evt_test_cancel_race'));
  assert.equal(result.statusCode, 200);
  assert.equal(capturedUpdate.$set.paymentStatus, 'paid');
  assert.equal(capturedUpdate.$set.razorpayPaymentId, 'pay_1');
});

test('webhook event model defines unique IDs and a finite retention TTL', () => {
  const indexes = RazorpayWebhookEvent.schema.indexes();
  assert.equal(indexes.some(([keys, options]) => keys.eventId === 1 && options.unique), true);
  assert.equal(
    indexes.some(([keys, options]) => keys.createdAt === 1 && options.expireAfterSeconds === 7776000),
    true,
  );
});
