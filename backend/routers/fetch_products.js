const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getAdminProducts,
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
const {
  createProductReview,
  deleteProductReview,
  listProductReviews,
  updateProductReview,
} = require('../controllers/review_controller');

router.get('/:productId/reviews', listProductReviews);
router.post('/:productId/reviews', requireAuth, createProductReview);
router.patch('/:productId/reviews/:reviewId', requireAuth, updateProductReview);
router.delete('/:productId/reviews/:reviewId', requireAuth, deleteProductReview);
router.get('/admin/catalog', requireAuth, requireRole('admin'), getAdminProducts);
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