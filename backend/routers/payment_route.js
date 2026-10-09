const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  cancelPaymentOrder,
} = require('../controllers/payment_controller');
const { requireAuth } = require('../middleware/require_auth');
const { paymentRequestLimiter } = require('../middleware/auth_rate_limit');

const router = express.Router();

router.use(requireAuth);
router.post('/create-order', paymentRequestLimiter, createPaymentOrder);
router.post('/verify', paymentRequestLimiter, verifyPayment);
router.post('/cancel', paymentRequestLimiter, cancelPaymentOrder);

module.exports = router;
