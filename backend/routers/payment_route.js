const express = require('express');
const {
  createPaymentOrder,
  verifyPayment,
  cancelPaymentOrder,
} = require('../controllers/payment_controller');
const { requireAuth } = require('../middleware/require_auth');

const router = express.Router();

router.use(requireAuth);
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);
router.post('/cancel', cancelPaymentOrder);

module.exports = router;
