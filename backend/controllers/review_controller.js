const mongoose = require('mongoose');
const Product = require('../models/product');
const ProductReview = require('../models/product_review');

const listProductReviews = async (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const exists = await Product.exists({ _id: req.params.productId, isActive: true });
    if (!exists) return res.status(404).json({ error: 'Product not found.' });

    const [reviews, summary] = await Promise.all([
      ProductReview.find({ product: req.params.productId })
        .populate('user', 'name')
        .sort({ createdAt: -1 })
        .limit(100),
      ProductReview.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(req.params.productId) } },
        { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ]),
    ]);
    return res.status(200).json({
      data: reviews,
      summary: summary[0] || { average: 0, count: 0 },
    });
  } catch (error) {
    return next(error);
  }
};

const createProductReview = async (req, res, next) => {
  const { rating, title = '', comment = '' } = req.body || {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'rating must be a whole number from 1 to 5.' });
  }
  if (typeof title !== 'string' || title.length > 100 || typeof comment !== 'string' || comment.length > 2000) {
    return res.status(400).json({ error: 'Review title or comment exceeds the allowed length.' });
  }
  if (!mongoose.Types.ObjectId.isValid(req.params.productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const exists = await Product.exists({ _id: req.params.productId, isActive: true });
    if (!exists) return res.status(404).json({ error: 'Product not found.' });
    const review = await ProductReview.create({
      product: req.params.productId,
      user: req.user.id,
      rating,
      title: title.trim(),
      comment: comment.trim(),
    });
    await review.populate('user', 'name');
    return res.status(201).json({ message: 'Review submitted.', data: review });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this product.' });
    }
    return next(error);
  }
};

module.exports = { listProductReviews, createProductReview };
