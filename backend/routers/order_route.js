const express = require('express');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
} = require('../controllers/order_controller');
const { requireAuth, requireRole } = require('../middleware/require_auth');

const router = express.Router();

router.use(requireAuth);
router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:orderId', getOrderById);
router.patch('/:orderId/status', requireRole('admin'), updateOrderStatus);

module.exports = router;
