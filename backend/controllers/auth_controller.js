const userModel = require('../models/user');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateAccessToken } = require('../utils/jwt');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  const { name, email, password, phone } = req.body || {};
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

  try {
    const hashedPassword = await hashPassword(password);
    const user = new userModel({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone,
      role: 'customer',
    });
    const savedUser = await user.save();

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        phone: savedUser.phone,
        role: savedUser.role,
      },
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
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        addresses: user.addresses,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
    register,
    login,
    getCurrentUser,
};
