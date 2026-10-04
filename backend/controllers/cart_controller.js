const mongoose = require('mongoose');
const Cart = require('../models/cart');
const Product = require('../models/product');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const parseQuantity = (value) => Number.isInteger(value) && value > 0;

const loadCart = async (userId) => {
  const cart = await Cart.findOne({ user: userId })
    .populate('items.product', 'name slug sku price currency images stock isActive');
  if (!cart) {
    return { items: [] };
  }
  return {
    id: cart._id,
    items: cart.items
      .filter((item) => item.product)
      .map((item) => ({
        product: item.product,
        quantity: item.quantity,
        lineTotal: Number((item.product.price * item.quantity).toFixed(2)),
      })),
    updatedAt: cart.updatedAt,
  };
};

const getCart = async (req, res, next) => {
  try {
    return res.status(200).json({ data: await loadCart(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

const addCartItem = async (req, res, next) => {
  const { productId, quantity = 1 } = req.body || {};
  if (!isValidId(productId) || !parseQuantity(quantity)) {
    return res.status(400).json({ error: 'A valid productId and positive integer quantity are required.' });
  }
  const normalizedProductId = new mongoose.Types.ObjectId(productId).toString();
  try {
    const product = await Product.findOne({ _id: normalizedProductId, isActive: true });
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      cart = new Cart({ user: req.user.id, items: [] });
    }
    const item = cart.items.find((entry) => entry.product.toString() === normalizedProductId);
    const nextQuantity = quantity + (item ? item.quantity : 0);
    if (nextQuantity > product.stock) {
      return res.status(409).json({ error: 'Requested quantity exceeds available stock.' });
    }
    if (item) {
      item.quantity = nextQuantity;
    } else {
      cart.items.push({ product: product._id, quantity });
    }
    try {
      await cart.save();
    } catch (error) {
      if (error.code !== 11000 || item) {
        throw error;
      }
      cart = await Cart.findOne({ user: req.user.id });
      const existingItem = cart.items.find((entry) => entry.product.toString() === normalizedProductId);
      const combinedQuantity = quantity + (existingItem ? existingItem.quantity : 0);
      if (combinedQuantity > product.stock) {
        return res.status(409).json({ error: 'Requested quantity exceeds available stock.' });
      }
      if (existingItem) {
        existingItem.quantity = combinedQuantity;
      } else {
        cart.items.push({ product: product._id, quantity });
      }
      await cart.save();
    }
    return res.status(200).json({ message: 'Cart updated.', data: await loadCart(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  const { productId } = req.params;
  const { quantity } = req.body || {};
  if (!isValidId(productId) || !parseQuantity(quantity)) {
    return res.status(400).json({ error: 'A valid product id and positive integer quantity are required.' });
  }
  const normalizedProductId = new mongoose.Types.ObjectId(productId).toString();
  try {
    const [cart, product] = await Promise.all([
      Cart.findOne({ user: req.user.id }),
      Product.findOne({ _id: normalizedProductId, isActive: true }),
    ]);
    if (!cart || !product) {
      return res.status(404).json({ error: !product ? 'Product not found.' : 'Cart item not found.' });
    }
    if (quantity > product.stock) {
      return res.status(409).json({ error: 'Requested quantity exceeds available stock.' });
    }
    const item = cart.items.find((entry) => entry.product.toString() === normalizedProductId);
    if (!item) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }
    item.quantity = quantity;
    await cart.save();
    return res.status(200).json({ message: 'Cart item updated.', data: await loadCart(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

const removeCartItem = async (req, res, next) => {
  const { productId } = req.params;
  if (!isValidId(productId)) {
    return res.status(400).json({ error: 'Invalid product id.' });
  }
  const normalizedProductId = new mongoose.Types.ObjectId(productId).toString();
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }
    const initialLength = cart.items.length;
    cart.items = cart.items.filter((item) => item.product.toString() !== normalizedProductId);
    if (cart.items.length === initialLength) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }
    await cart.save();
    return res.status(200).json({ message: 'Cart item removed.', data: await loadCart(req.user.id) });
  } catch (error) {
    return next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user.id },
      { $set: { items: [] } },
      { new: true },
    );
    return res.status(200).json({ message: 'Cart cleared.', data: { items: [] } });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};
