const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/product_controller');
const {
  uploadImages,
  validateUploadedImageFiles,
} = require('../middleware/upload_images');
const { requireAuth, requireRole } = require('../middleware/require_auth');
const { listProductReviews, createProductReview } = require('../controllers/review_controller');

router.get('/:productId/reviews', listProductReviews);
router.post('/:productId/reviews', requireAuth, createProductReview);
router.get('/', getAllProducts);
router.get('/:productId', getProductById);
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  uploadImages.array('images', 8),
  validateUploadedImageFiles,
  createProduct,
);
router.patch(
  '/:productId',
  requireAuth,
  requireRole('admin'),
  uploadImages.array('images', 8),
  validateUploadedImageFiles,
  updateProduct,
);
router.delete('/:productId', requireAuth, requireRole('admin'), deleteProduct);

module.exports = router;