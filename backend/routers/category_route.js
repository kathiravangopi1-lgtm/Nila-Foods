const express = require('express');
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/category_controller');
const { requireAuth, requireRole } = require('../middleware/require_auth');

const router = express.Router();

router.get('/', getAllCategories);
router.get('/:categoryId', getCategoryById);
router.post('/', requireAuth, requireRole('admin'), createCategory);
router.patch('/:categoryId', requireAuth, requireRole('admin'), updateCategory);
router.delete('/:categoryId', requireAuth, requireRole('admin'), deleteCategory);

module.exports = router;
