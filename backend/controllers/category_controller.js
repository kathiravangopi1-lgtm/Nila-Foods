const mongoose = require('mongoose');
const Category = require('../models/category');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (value) => value.trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return res.status(200).json({ data: categories });
  } catch (error) {
    return next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  if (!isValidId(req.params.categoryId)) {
    return res.status(400).json({ error: 'Invalid category id.' });
  }
  try {
    const category = await Category.findOne({
      _id: req.params.categoryId,
      isActive: true,
    });
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    return res.status(200).json({ data: category });
  } catch (error) {
    return next(error);
  }
};

const createCategory = async (req, res, next) => {
  const { name, description, slug } = req.body || {};
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required.' });
  }
  const normalizedSlug = typeof slug === 'string' && slug.trim()
    ? slugify(slug)
    : slugify(name);
  if (!normalizedSlug) {
    return res.status(400).json({ error: 'Category name must contain letters or numbers.' });
  }
  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'description must be a string.' });
  }
  try {
    const category = await Category.create({
      name: name.trim(),
      slug: normalizedSlug,
      description,
    });
    return res.status(201).json({ message: 'Category created.', data: category });
  } catch (error) {
    return next(error);
  }
};

const updateCategory = async (req, res, next) => {
  if (!isValidId(req.params.categoryId)) {
    return res.status(400).json({ error: 'Invalid category id.' });
  }
  const { name, description, slug, isActive } = req.body || {};
  const updates = {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name must be a non-empty string.' });
    }
    updates.name = name.trim();
    if (slug === undefined) {
      updates.slug = slugify(name);
    }
  }
  if (slug !== undefined) {
    if (typeof slug !== 'string' || !slug.trim()) {
      return res.status(400).json({ error: 'slug must be a non-empty string.' });
    }
    updates.slug = slugify(slug);
  }
  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'description must be a string.' });
    }
    updates.description = description.trim();
  }
  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean.' });
    }
    updates.isActive = isActive;
  }
  if (!Object.keys(updates).length) {
    return res.status(400).json({ error: 'At least one supported category field is required.' });
  }
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      { $set: updates },
      { new: true, runValidators: true },
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    return res.status(200).json({ message: 'Category updated.', data: category });
  } catch (error) {
    return next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  if (!isValidId(req.params.categoryId)) {
    return res.status(400).json({ error: 'Invalid category id.' });
  }
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.categoryId,
      { $set: { isActive: false } },
      { new: true },
    );
    if (!category) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    return res.status(200).json({ message: 'Category deactivated.', data: category });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
