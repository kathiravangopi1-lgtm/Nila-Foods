const crypto = require('crypto');
const Razorpay = require('razorpay');

let razorpayClient;

const getConfiguredMode = () => {
  const mode = process.env.RAZORPAY_MODE?.trim().toLowerCase() || 'test';
  if (!['test', 'live'].includes(mode)) {
    const error = new Error('RAZORPAY_MODE must be set to test or live.');
    error.status = 503;
    throw error;
  }
  return mode;
};

const isRazorpayKeyConfigured = () => {
  const mode = getConfiguredMode();
  return Boolean(
    process.env.RAZORPAY_KEY_SECRET
    && process.env.RAZORPAY_KEY_ID?.startsWith(`rzp_${mode}_`),
  );
};

const getRazorpayClient = () => {
  const { RAZORPAY_KEY_ID: key_id, RAZORPAY_KEY_SECRET: key_secret } = process.env;
  const mode = getConfiguredMode();
  if (!key_id || !key_secret || !key_id.startsWith(`rzp_${mode}_`)) {
    const error = new Error(`Razorpay ${mode} credentials are not configured.`);
    error.status = 503;
    throw error;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({ key_id, key_secret });
  }
  return razorpayClient;
};

const createGatewayOrder = ({ amount, receipt, notes }) => getRazorpayClient().orders.create({
  amount,
  currency: 'INR',
  receipt,
  notes,
});

const fetchPayment = (paymentId) => getRazorpayClient().payments.fetch(paymentId);

const safeCompareHex = (actual, expected) => {
  if (typeof actual !== 'string' || typeof expected !== 'string') return false;
  const actualBuffer = Buffer.from(actual, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length
    && actualBuffer.length > 0
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const verifyCheckoutSignature = ({ orderId, paymentId, signature }) => {
  if (!process.env.RAZORPAY_KEY_SECRET) {
    const error = new Error('Razorpay test credentials are not configured.');
    error.status = 503;
    throw error;
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return safeCompareHex(signature, expected);
};

const verifyWebhookSignature = (rawBody, signature) => {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    const error = new Error('Razorpay webhook secret is not configured.');
    error.status = 503;
    throw error;
  }
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return safeCompareHex(signature, expected);
};

module.exports = {
  createGatewayOrder,
  fetchPayment,
  verifyCheckoutSignature,
  verifyWebhookSignature,
  isRazorpayKeyConfigured,
};
