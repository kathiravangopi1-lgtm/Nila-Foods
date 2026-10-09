const userModel = require('../models/user');
const { hashPassword } = require('../utils/password');
const { createOtpService } = require('../services/otp_service');
const {
  sendEmailVerificationOTP,
  sendPasswordResetOTP,
} = require('../services/email_service');

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const genericForgotPasswordMessage = 'If an account exists for this email, a verification code has been sent.';

const sendError = (res, next, error) => {
  if (error.status) {
    const response = { error: error.message, code: error.code };
    if (error.retryAfterSeconds) response.retryAfterSeconds = error.retryAfterSeconds;
    return res.status(error.status).json(response);
  }
  return next(error);
};

const getEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

const createAuthOtpController = ({
  User = userModel,
  otpService = createOtpService(),
  passwordHasher = hashPassword,
  sendVerificationEmail = sendEmailVerificationOTP,
  sendResetEmail = sendPasswordResetOTP,
} = {}) => {
  const resendEmailOtp = async (req, res, next) => {
    const email = getEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email address is required.' });

    try {
      const user = await User.findOne({ email });
      if (!user || user.emailVerified === true) {
        return res.status(202).json({ message: 'If your account needs verification, a code has been sent.' });
      }
      try {
        await otpService.issue({
          email,
          userId: user._id,
          purpose: 'EMAIL_VERIFICATION',
          sendEmail: sendVerificationEmail,
        });
      } catch (error) {
        if (error.code !== 'OTP_RESEND_COOLDOWN') {
          if (error.code === 'OTP_EMAIL_UNAVAILABLE') {
            return res.status(202).json({ message: 'If your account needs verification, a code has been sent.' });
          }
          throw error;
        }
      }
      return res.status(202).json({ message: 'If your account needs verification, a code has been sent.' });
    } catch (error) {
      return sendError(res, next, error);
    }
  };

  const verifyEmail = async (req, res, next) => {
    const email = getEmail(req.body?.email);
    const { otp } = req.body || {};
    if (!isEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'A valid email address and 6-digit code are required.' });
    }

    try {
      const { record } = await otpService.verify({ email, purpose: 'EMAIL_VERIFICATION', otp });
      const user = await User.findOneAndUpdate(
        { _id: record.userId, email },
        { $set: { emailVerified: true } },
        { new: true },
      );
      if (!user) return res.status(404).json({ error: 'User account not found.' });
      return res.status(200).json({ message: 'Email verified successfully.' });
    } catch (error) {
      return sendError(res, next, error);
    }
  };

  const forgotPassword = async (req, res, next) => {
    const email = getEmail(req.body?.email);
    if (!isEmail(email)) return res.status(400).json({ error: 'A valid email address is required.' });

    try {
      const user = await User.findOne({ email });
      if (user) {
        try {
          await otpService.issue({
            email,
            userId: user._id,
            purpose: 'PASSWORD_RESET',
            sendEmail: sendResetEmail,
          });
        } catch (error) {
          if (error.code === 'OTP_EMAIL_UNAVAILABLE') {
            return res.status(202).json({ message: genericForgotPasswordMessage });
          }
          if (error.code !== 'OTP_RESEND_COOLDOWN') throw error;
        }
      }
      return res.status(202).json({ message: genericForgotPasswordMessage });
    } catch (error) {
      return sendError(res, next, error);
    }
  };

  const verifyResetOtp = async (req, res, next) => {
    const email = getEmail(req.body?.email);
    const { otp } = req.body || {};
    if (!isEmail(email) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ error: 'A valid email address and 6-digit code are required.' });
    }

    try {
      const { resetToken } = await otpService.verify({ email, purpose: 'PASSWORD_RESET', otp });
      return res.status(200).json({ message: 'Code verified. Choose a new password.', resetToken });
    } catch (error) {
      return sendError(res, next, error);
    }
  };

  const resetPassword = async (req, res, next) => {
    const email = getEmail(req.body?.email);
    const { resetToken, newPassword } = req.body || {};
    if (
      !isEmail(email)
      || typeof resetToken !== 'string'
      || resetToken.length < 40
      || typeof newPassword !== 'string'
      || newPassword.length < 8
      || Buffer.byteLength(newPassword, 'utf8') > 72
    ) {
      return res.status(400).json({
        error: 'A valid email, reset authorization, and password of 8-72 UTF-8 bytes are required.',
      });
    }

    try {
      const password = await passwordHasher(newPassword);
      const grant = await otpService.consumeResetToken({ email, resetToken });
      const user = await User.findOneAndUpdate(
        { _id: grant.userId, email },
        { $set: { password } },
        { new: true },
      );
      if (!user) return res.status(404).json({ error: 'User account not found.' });
      return res.status(200).json({ message: 'Password reset successfully. Sign in with your new password.' });
    } catch (error) {
      return sendError(res, next, error);
    }
  };

  return { resendEmailOtp, verifyEmail, forgotPassword, verifyResetOtp, resetPassword };
};

module.exports = { ...createAuthOtpController(), createAuthOtpController };
