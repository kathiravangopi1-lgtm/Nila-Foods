const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.RAZORPAY_KEY_ID = 'rzp_test_unit_test_key';
process.env.RAZORPAY_KEY_SECRET = 'unit-test-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'unit-test-webhook-secret';

const {
  verifyCheckoutSignature,
  verifyWebhookSignature,
} = require('../services/razorpay_service');

test('checkout signature verifies only the exact Razorpay order and payment pair', () => {
  const orderId = 'order_test_123';
  const paymentId = 'pay_test_456';
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  assert.equal(verifyCheckoutSignature({ orderId, paymentId, signature }), true);
  assert.equal(verifyCheckoutSignature({ orderId, paymentId: 'pay_test_other', signature }), false);
  assert.equal(verifyCheckoutSignature({ orderId, paymentId, signature: 'not-a-signature' }), false);
});

test('webhook signature is checked against the original raw body', () => {
  const body = Buffer.from('{"event":"payment.captured","payload":{}}');
  const signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  assert.equal(verifyWebhookSignature(body, signature), true);
  assert.equal(verifyWebhookSignature(Buffer.from(`${body.toString()} `), signature), false);
});
