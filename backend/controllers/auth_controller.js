const userModel = require('../models/user');
const mongoose = require('mongoose');
const Product = require('../models/product');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateAccessToken } = require('../utils/jwt');
const { verifyGoogleIdToken } = require('../services/google_auth_service');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const toSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  emailOffersOptIn: Boolean(user.emailOffersOptIn),
  restockProductIds: (user.restockProductIds || []).map((id) => id.toString()),
});

const login = async (req, res, next) => {
  const { email, password } = req.body || {};
  if (
    typeof email !== 'string' || !isEmail(email.trim())
    || typeof password !== 'string' || !password
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ error: 'A valid email and password are required.' });
  }

  try {
    const user = await userModel.findOne({ email: email.trim().toLowerCase() }).select('+password');
    if (!user || !await verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateAccessToken(user);
    return res.status(200).json({
      message: 'Login successful',
      token,
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const googleLogin = async (req, res, next) => {
  const { credential } = req.body || {};
  if (typeof credential !== 'string' || !credential || credential.length > 8192) {
    return res.status(400).json({ error: 'A valid Google credential is required.' });
  }

  try {
    const identity = await verifyGoogleIdToken(credential);
    let user = await userModel.findOne({
      $or: [{ googleId: identity.googleId }, { email: identity.email }],
    }).select('+googleId');

    if (user?.googleId && user.googleId !== identity.googleId) {
      return res.status(409).json({ error: 'This email is linked to a different Google account.' });
    }

    if (!user) {
      user = new userModel({
        name: identity.name,
        email: identity.email,
        googleId: identity.googleId,
        role: 'customer',
      });
      try {
        await user.save();
      } catch (error) {
        if (error.code !== 11000) throw error;
        user = await userModel.findOne({
          $or: [{ googleId: identity.googleId }, { email: identity.email }],
        }).select('+googleId');
        if (!user) throw error;
      }
    } else if (!user.googleId) {
      user.googleId = identity.googleId;
      await user.save();
    }

    return res.status(200).json({
      message: 'Google login successful',
      token: generateAccessToken(user),
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  const { name, email, password, phone, emailOffersOptIn = false } = req.body || {};
  if (
    typeof name !== 'string' || !name.trim()
    || typeof email !== 'string' || !isEmail(email.trim())
    || typeof password !== 'string' || password.length < 8
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'Name and valid email are required; password must be at least 8 characters and at most 72 UTF-8 bytes.',
    });
  }
  if (typeof emailOffersOptIn !== 'boolean') {
    return res.status(400).json({ error: 'emailOffersOptIn must be a boolean.' });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const user = new userModel({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone,
      emailOffersOptIn,
      role: 'customer',
    });
    const savedUser = await user.save();

    return res.status(201).json({
      message: 'User registered successfully',
      user: toSafeUser(savedUser),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(error);
  }
};

const getCurrentUser = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    return res.status(200).json({
      data: {
        ...toSafeUser(user),
        addresses: user.addresses,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateCurrentUser = async (req, res, next) => {
  const body = req.body || {};
  const allowedFields = ['name', 'email', 'phone', 'emailOffersOptIn', 'restockProductIds'];
  const fields = Object.keys(body);
  if (!fields.length || fields.some((field) => !allowedFields.includes(field))) {
    return res.status(400).json({ error: 'Provide one or more supported profile fields: name, email, phone.' });
  }
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return res.status(400).json({ error: 'Name must be a non-empty string.' });
  }
  if (body.email !== undefined && (typeof body.email !== 'string' || !isEmail(body.email.trim()))) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }
  if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.trim().length > 40)) {
    return res.status(400).json({ error: 'Phone number must be a string no longer than 40 characters.' });
  }
  if (body.emailOffersOptIn !== undefined && typeof body.emailOffersOptIn !== 'boolean') {
    return res.status(400).json({ error: 'emailOffersOptIn must be a boolean.' });
  }
  if (
    body.restockProductIds !== undefined
    && (
      !Array.isArray(body.restockProductIds)
      || body.restockProductIds.length > 100
      || body.restockProductIds.some((id) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))
    )
  ) {
    return res.status(400).json({ error: 'restockProductIds must be an array of at most 100 valid product IDs.' });
  }

  try {
    if (body.restockProductIds !== undefined) {
      const uniqueIds = [...new Set(body.restockProductIds)];
      const existingProducts = await Product.countDocuments({ _id: { $in: uniqueIds }, isActive: true });
      if (existingProducts !== uniqueIds.length) {
        return res.status(400).json({ error: 'Restock preferences can include only active products.' });
      }
    }
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });

    if (body.name !== undefined) user.name = body.name.trim();
    if (body.email !== undefined) user.email = body.email.trim().toLowerCase();
    if (body.phone !== undefined) user.phone = body.phone.trim();
    if (body.emailOffersOptIn !== undefined) user.emailOffersOptIn = body.emailOffersOptIn;
    if (body.restockProductIds !== undefined) user.restockProductIds = [...new Set(body.restockProductIds)];
    await user.save();

    return res.status(200).json({
      message: 'Profile updated successfully.',
      data: toSafeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  const { currentPassword, newPassword } = req.body || {};
  if (
    typeof currentPassword !== 'string'
    || !currentPassword
    || typeof newPassword !== 'string'
    || newPassword.length < 8
    || Buffer.byteLength(newPassword, 'utf8') > 72
  ) {
    return res.status(400).json({
      error: 'Current password is required; new password must be at least 8 characters and at most 72 UTF-8 bytes.',
    });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'New password must be different from the current password.' });
  }

  try {
    const user = await userModel.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    if (!user.password) {
      return res.status(409).json({ error: 'This account uses Google sign-in and does not have a password.' });
    }
    if (!await verifyPassword(currentPassword, user.password)) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = await hashPassword(newPassword);
    await user.save();
    return res.status(200).json({
      message: 'Password changed successfully.',
      token: generateAccessToken(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
    register,
    login,
    googleLogin,
    getCurrentUser,
    updateCurrentUser,
    changePassword,
};
