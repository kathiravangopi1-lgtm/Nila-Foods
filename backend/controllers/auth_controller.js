const userModel = require('../models/user');
const mongoose = require('mongoose');
const Product = require('../models/product');
const { hashPassword, verifyPassword } = require('../utils/password');
const { generateAccessToken } = require('../utils/jwt');
const { verifyGoogleIdToken } = require('../services/google_auth_service');
const { createOtpService } = require('../services/otp_service');
const { sendEmailVerificationOTP } = require('../services/email_service');

const otpService = createOtpService();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const phoneLoginCandidates = (value) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return [];

  const candidates = new Set([digits]);
  if (digits.startsWith('91') && digits.length === 12) candidates.add(digits.slice(2));
  if (digits.length === 10) candidates.add(`91${digits}`);
  if (digits.startsWith('0091') && digits.length === 14) candidates.add(digits.slice(4));

  return [...candidates].map((candidate) => ({
    phone: new RegExp(`^\\+?[\\s().-]*${candidate.split('').join('[\\s().-]*')}[\\s().-]*$`),
  }));
};

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
  const { email, identifier, password } = req.body || {};
  const loginIdentifier = typeof identifier === 'string' ? identifier.trim() : (
    typeof email === 'string' ? email.trim() : ''
  );
  const isEmailLogin = isEmail(loginIdentifier);
  if (
    !loginIdentifier
    || (!isEmailLogin && !phoneLoginCandidates(loginIdentifier).length)
    || typeof password !== 'string' || !password
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ error: 'A valid email address or phone number and password are required.' });
  }

  try {
    const matchingUsers = isEmailLogin
      ? [await userModel.findOne({ email: loginIdentifier.toLowerCase() }).select('+password')].filter(Boolean)
      : await userModel.find({ $or: phoneLoginCandidates(loginIdentifier) }).select('+password').limit(2);
    const user = matchingUsers.length === 1 ? matchingUsers[0] : null;
    if (!user || !await verifyPassword(password, user.password)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (user.emailVerified === false) {
      return res.status(403).json({
        error: 'Verify your email before signing in.',
        code: 'EMAIL_VERIFICATION_REQUIRED',
      });
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

    if (!user) {
      user = new userModel({
        name: identity.name,
        email: identity.email,
        googleId: identity.googleId,
        emailVerified: true,
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
    }
    if (user.googleId && user.googleId !== identity.googleId) {
      return res.status(409).json({ error: 'This email is linked to a different Google account.' });
    }
    if (!user.googleId) user.googleId = identity.googleId;
    user.emailVerified = true;
    await user.save();

    return res.status(200).json({
      message: 'Google login successful',
      token: generateAccessToken(user),
      user: toSafeUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const createRegisterHandler = ({
  User = userModel,
  passwordHasher = hashPassword,
  service = otpService,
  sendVerificationEmail = sendEmailVerificationOTP,
} = {}) => async (req, res, next) => {
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
    const emailAddress = email.trim().toLowerCase();
    if (await User.findOne({ email: emailAddress })) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    const user = new User({
      name: name.trim(),
      email: emailAddress,
      password: await passwordHasher(password),
      emailVerified: false,
      phone,
      emailOffersOptIn,
      role: 'customer',
    });
    const savedUser = await user.save();
    await service.issue({
      email: savedUser.email,
      userId: savedUser._id,
      purpose: 'EMAIL_VERIFICATION',
      sendEmail: sendVerificationEmail,
    });

    return res.status(201).json({
      message: 'Registration successful. Verify your email to finish creating your account.',
      requiresEmailVerification: true,
      email: savedUser.email,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    return next(error);
  }
};

const register = createRegisterHandler();

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

const createUpdateCurrentUserHandler = ({
  User = userModel,
  service = otpService,
  sendVerificationEmail = sendEmailVerificationOTP,
} = {}) => async (req, res, next) => {
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
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });

    if (body.name !== undefined) user.name = body.name.trim();
    const updatedEmail = body.email === undefined ? user.email : body.email.trim().toLowerCase();
    const emailChanged = updatedEmail !== user.email;
    if (emailChanged) {
      user.email = updatedEmail;
      user.emailVerified = false;
    }
    if (body.phone !== undefined) user.phone = body.phone.trim();
    if (body.emailOffersOptIn !== undefined) user.emailOffersOptIn = body.emailOffersOptIn;
    if (body.restockProductIds !== undefined) user.restockProductIds = [...new Set(body.restockProductIds)];
    await user.save();
    if (emailChanged) {
      await service.issue({
        email: user.email,
        userId: user._id,
        purpose: 'EMAIL_VERIFICATION',
        sendEmail: sendVerificationEmail,
      });
    }

    return res.status(200).json({
      message: emailChanged
        ? 'Profile updated. Verify your new email address before signing in again.'
        : 'Profile updated successfully.',
      requiresEmailVerification: emailChanged,
      data: toSafeUser(user),
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }
    if (error.code === 11000) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    return next(error);
  }
};

const updateCurrentUser = createUpdateCurrentUserHandler();

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
    phoneLoginCandidates,
    createRegisterHandler,
    createUpdateCurrentUserHandler,
};
