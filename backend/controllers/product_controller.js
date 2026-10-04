const mongoose = require('mongoose');
const Category = require('../models/category');
const Product = require('../models/product');
const { removeUploadedFiles } = require('../middleware/upload_images');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const slugify = (value) => value.trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const isNonNegativeNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0;
const uploadedImageUrls = (files = []) => files.map((file) => `/uploads/${file.filename}`);

const parseImageUrls = (value) => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      return [value];
    }
  }
  return value;
};

const cleanupUploads = async (files, next) => {
  try {
    await removeUploadedFiles(files);
    return true;
  } catch (cleanupError) {
    console.error('Failed to clean up uploaded product images:', cleanupError);
    next(cleanupError);
    return false;
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Math.min(Number.parseInt(req.query.limit, 10) || 20, 100);
    if (page < 1 || limit < 1) {
      return res.status(400).json({ error: 'Page and limit must be positive numbers.' });
    }

    const filter = { isActive: true };
    if (req.query.category) {
      if (!isValidId(req.query.category)) {
        return res.status(400).json({ error: 'Invalid category id.' });
      }
      filter.category = req.query.category;
    }
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 100);
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      filter.price = {};
      if (req.query.minPrice !== undefined) {
        if (!isNonNegativeNumber(req.query.minPrice)) {
          return res.status(400).json({ error: 'minPrice must be a non-negative number.' });
        }
        filter.price.$gte = Number(req.query.minPrice);
      }
      if (req.query.maxPrice !== undefined) {
        if (!isNonNegativeNumber(req.query.maxPrice)) {
          return res.status(400).json({ error: 'maxPrice must be a non-negative number.' });
        }
        filter.price.$lte = Number(req.query.maxPrice);
      }
    }
    if (
      filter.price
      && filter.price.$gte !== undefined
      && filter.price.$lte !== undefined
      && filter.price.$gte > filter.price.$lte
    ) {
      return res.status(400).json({ error: 'minPrice cannot be greater than maxPrice.' });
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      'price-asc': { price: 1 },
      'price-desc': { price: -1 },
      name: { name: 1 },
    };
    const sort = sortOptions[req.query.sort] || sortOptions.newest;
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('category', 'name slug')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit),
      Product.countDocuments(filter),
    ]);

    return res.status(200).json({
      data: products,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
};

const getProductById = async (req, res, next) => {
  if (!isValidId(req.params.productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const product = await Product.findOne({
      _id: req.params.productId,
      isActive: true,
    }).populate('category', 'name slug');
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ data: product });
  } catch (error) {
    return next(error);
  }
};

const validateProductData = async (body, { isUpdate = false } = {}) => {
  const updates = {};
  const stringFields = ['name', 'sku', 'description', 'currency', 'slug'];

  for (const field of stringFields) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string' || !body[field].trim()) {
        return { error: `${field} must be a non-empty string.` };
      }
      updates[field] = body[field].trim();
    }
  }

  if (body.name !== undefined && body.slug === undefined && !isUpdate) {
    updates.slug = slugify(body.name);
  } else if (body.name !== undefined && body.slug === undefined && isUpdate) {
    updates.slug = slugify(body.name);
  }
  if (updates.slug !== undefined && !updates.slug) {
    return { error: 'Product name must contain letters or numbers.' };
  }

  for (const field of ['price', 'stock']) {
    if (body[field] !== undefined) {
      if (!isNonNegativeNumber(body[field])) {
        return { error: `${field} must be a non-negative number.` };
      }
      updates[field] = Number(body[field]);
      if (field === 'stock' && !Number.isInteger(updates[field])) {
        return { error: 'stock must be a whole number.' };
      }
    }
  }

  if (!isUpdate && updates.price === undefined) {
    return { error: 'price is required.' };
  }
  if (body.category !== undefined) {
    if (typeof body.category !== 'string' || !isValidId(body.category)) {
      return { error: 'A valid category id is required.' };
    }
    const category = await Category.findOne({ _id: body.category, isActive: true });
    if (!category) {
      return { error: 'Active category not found.' };
    }
    updates.category = category._id;
  }
  if (!isUpdate && !updates.category) {
    return { error: 'category is required.' };
  }
  if (body.images !== undefined) {
    const images = parseImageUrls(body.images);
    if (!Array.isArray(images) || images.some((image) => typeof image !== 'string' || !image.trim())) {
      return { error: 'images must be an array of up to 8 non-empty URLs.' };
    }
    updates.images = images.map((image) => image.trim());
  }

  return { updates };
};

const createProduct = async (req, res, next) => {
  try {
    const result = await validateProductData(req.body || {});
    if (result.error) {
      if (!await cleanupUploads(req.files, next)) {
        return undefined;
      }
      return res.status(400).json({ error: result.error });
    }
    const images = [...(result.updates.images || []), ...uploadedImageUrls(req.files)];
    if (images.length > 8) {
      if (!await cleanupUploads(req.files, next)) {
        return undefined;
      }
      return res.status(400).json({ error: 'A product can have at most 8 images.' });
    }
    const product = await Product.create({
      ...result.updates,
      images,
      currency: result.updates.currency || process.env.DEFAULT_CURRENCY || 'USD',
    });
    return res.status(201).json({ message: 'Product created.', data: product });
  } catch (error) {
    if (await cleanupUploads(req.files, next)) {
      return next(error);
    }
    return undefined;
  }
};

const updateProduct = async (req, res, next) => {
  if (!isValidId(req.params.productId)) {
    if (!await cleanupUploads(req.files, next)) {
      return undefined;
    }
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const result = await validateProductData(req.body || {}, { isUpdate: true });
    if (result.error) {
      if (!await cleanupUploads(req.files, next)) {
        return undefined;
      }
      return res.status(400).json({ error: result.error });
    }
    if (req.body && req.body.isActive !== undefined) {
      const isActive = req.body.isActive === 'true'
        ? true
        : req.body.isActive === 'false' ? false : req.body.isActive;
      if (typeof isActive !== 'boolean') {
        if (!await cleanupUploads(req.files, next)) {
          return undefined;
        }
        return res.status(400).json({ error: 'isActive must be a boolean.' });
      }
      result.updates.isActive = isActive;
    }
    if (!Object.keys(result.updates).length && !(req.files && req.files.length)) {
      return res.status(400).json({ error: 'At least one supported product field is required.' });
    }
    const currentProduct = await Product.findById(req.params.productId);
    if (!currentProduct) {
      if (!await cleanupUploads(req.files, next)) {
        return undefined;
      }
      return res.status(404).json({ error: 'Product not found.' });
    }
    const images = req.body && req.body.images !== undefined
      ? [...(result.updates.images || []), ...uploadedImageUrls(req.files)]
      : [...currentProduct.images, ...uploadedImageUrls(req.files)];
    if (images.length > 8) {
      if (!await cleanupUploads(req.files, next)) {
        return undefined;
      }
      return res.status(400).json({ error: 'A product can have at most 8 images.' });
    }
    if ((req.body && req.body.images !== undefined) || (req.files && req.files.length)) {
      result.updates.images = images;
    }
    const product = await Product.findByIdAndUpdate(req.params.productId, {
      $set: result.updates,
    }, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ message: 'Product updated.', data: product });
  } catch (error) {
    if (await cleanupUploads(req.files, next)) {
      return next(error);
    }
    return undefined;
  }
};

const deleteProduct = async (req, res, next) => {
  if (!isValidId(req.params.productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.productId,
      { $set: { isActive: false } },
      { new: true },
    );
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    return res.status(200).json({ message: 'Product deactivated.', data: product });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
