const express = require('express');
const {
  register,
  login,
  googleLogin,
  getCurrentUser,
  updateCurrentUser,
  changePassword,
} = require('../controllers/auth_controller');
const { requireAuth } = require('../middleware/require_auth');
const {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} = require('../controllers/address_controller');
const {
  resendEmailOtp,
  verifyEmail,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
} = require('../controllers/auth_otp_controller');
const {
  authRequestLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
} = require('../middleware/auth_rate_limit');

const router = express.Router();

router.post('/register', authRequestLimiter, register);
router.post('/login', authRequestLimiter, login);
router.post('/google', authRequestLimiter, googleLogin);
router.post('/verify-email', otpVerifyLimiter, verifyEmail);
router.post('/resend-email-otp', otpRequestLimiter, resendEmailOtp);
router.post('/forgot-password', otpRequestLimiter, forgotPassword);
router.post('/verify-reset-otp', otpVerifyLimiter, verifyResetOtp);
router.post('/reset-password', otpVerifyLimiter, resetPassword);
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateCurrentUser);
router.post('/change-password', requireAuth, authRequestLimiter, changePassword);
router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, createAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);

module.exports = router;
