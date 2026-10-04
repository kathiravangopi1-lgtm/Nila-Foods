const express = require('express');
const { createPaymentOrder, verifyPayment } = require('../controllers/payment_controller');
const { requireAuth } = require('../middleware/require_auth');

const router = express.Router();

router.use(requireAuth);
router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

module.exports = router;
