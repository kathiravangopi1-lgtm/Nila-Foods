const crypto = require('crypto');
const EmailOtp = require('../models/email_otp');

const OTP_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

const otpError = (status, code, message, retryAfterSeconds) => Object.assign(
  new Error(message),
  { status, code, ...(retryAfterSeconds ? { retryAfterSeconds } : {}) },
);

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const getHashSecret = () => {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('OTP_HASH_SECRET or a JWT_SECRET of at least 32 bytes must be configured.');
  }
  return secret;
};

const hashOtp = (otp, email, purpose, secret = getHashSecret()) => crypto
  .createHmac('sha256', secret)
  .update(`${email.toLowerCase()}:${purpose}:${otp}`)
  .digest('hex');

const hashResetToken = (token, secret = getHashSecret()) => crypto
  .createHmac('sha256', secret)
  .update(`PASSWORD_RESET_TOKEN:${token}`)
  .digest('hex');

const securelyMatches = (left, right) => {
  const leftBuffer = Buffer.from(left || '', 'hex');
  const rightBuffer = Buffer.from(right || '', 'hex');
  return leftBuffer.length === rightBuffer.length && leftBuffer.length > 0
    && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createOtpService = ({ Otp = EmailOtp, clock = Date.now } = {}) => {
  const issue = async ({ email, userId, purpose, sendEmail }) => {
    const normalizedEmail = email.toLowerCase();
    const now = clock();
    const previous = await Otp.findOne({ email: normalizedEmail, purpose });
    const throwIfCoolingDown = (record) => {
      if (!record) return;
      const elapsedSinceIssue = Math.max(0, now - new Date(record.createdAt).getTime());
      if (elapsedSinceIssue >= RESEND_COOLDOWN_MS) return;
      const retryAfterSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsedSinceIssue) / 1000);
      throw otpError(429, 'OTP_RESEND_COOLDOWN', 'Please wait before requesting another code.', retryAfterSeconds);
    };
    throwIfCoolingDown(previous);

    const otp = generateOtp();
    const otpHash = hashOtp(otp, normalizedEmail, purpose);
    const expiresAt = new Date(now + OTP_LIFETIME_MS);
    let record;
    try {
      record = await Otp.findOneAndUpdate(
        {
          email: normalizedEmail,
          purpose,
          $or: [{ createdAt: { $lte: new Date(now - RESEND_COOLDOWN_MS) } }],
        },
        {
          $set: {
            userId,
            otpHash,
            attempts: 0,
            expiresAt,
            verifiedAt: null,
            resetTokenHash: null,
            resetTokenExpiresAt: null,
          },
          $setOnInsert: { email: normalizedEmail, purpose },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      if (error.code !== 11000) throw error;
      const latest = await Otp.findOne({ email: normalizedEmail, purpose });
      if (!latest) throw error;
      throwIfCoolingDown(latest);
      throw error;
    }

    try {
      await sendEmail(email, otp);
    } catch (error) {
      await Otp.deleteOne({ _id: record._id, otpHash });
      console.error('OTP email delivery failed:', error.name);
      throw otpError(503, 'OTP_EMAIL_UNAVAILABLE', 'The verification email could not be sent. Please try again.');
    }
    return { expiresAt };
  };

  const verify = async ({ email, purpose, otp }) => {
    const normalizedEmail = email.toLowerCase();
    const now = clock();
    const record = await Otp.findOne({ email: normalizedEmail, purpose });
    if (!record || !record.otpHash) {
      throw otpError(400, 'OTP_INVALID', 'The verification code is invalid or has already been used.');
    }
    if (new Date(record.expiresAt).getTime() <= now) {
      await Otp.deleteOne({ _id: record._id });
      throw otpError(410, 'OTP_EXPIRED', 'The verification code has expired. Request a new one.');
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      await Otp.deleteOne({ _id: record._id });
      throw otpError(429, 'OTP_MAX_ATTEMPTS', 'Too many incorrect attempts. Request a new code.');
    }

    const submittedHash = hashOtp(otp, normalizedEmail, purpose);
    if (!securelyMatches(submittedHash, record.otpHash)) {
      const updated = await Otp.findOneAndUpdate(
        { _id: record._id, attempts: { $lt: MAX_ATTEMPTS }, expiresAt: { $gt: new Date(now) } },
        { $inc: { attempts: 1 } },
        { new: true },
      );
      if (!updated || updated.attempts >= MAX_ATTEMPTS) {
        await Otp.deleteOne({ _id: record._id });
        throw otpError(429, 'OTP_MAX_ATTEMPTS', 'Too many incorrect attempts. Request a new code.');
      }
      throw otpError(400, 'OTP_INVALID', 'The verification code is incorrect.');
    }

    if (purpose === 'EMAIL_VERIFICATION') {
      const consumed = await Otp.findOneAndDelete({
        _id: record._id,
        otpHash: record.otpHash,
        expiresAt: { $gt: new Date(now) },
      });
      if (!consumed) throw otpError(400, 'OTP_INVALID', 'The verification code is invalid or has already been used.');
      return { record: consumed };
    }

    const resetToken = crypto.randomBytes(32).toString('base64url');
    const grantExpiresAt = new Date(now + OTP_LIFETIME_MS);
    const consumed = await Otp.findOneAndUpdate(
      {
        _id: record._id,
        otpHash: record.otpHash,
        expiresAt: { $gt: new Date(now) },
      },
      {
        $set: {
          otpHash: null,
          verifiedAt: new Date(now),
          resetTokenHash: hashResetToken(resetToken),
          resetTokenExpiresAt: grantExpiresAt,
          expiresAt: grantExpiresAt,
        },
      },
      { new: true },
    );
    if (!consumed) throw otpError(400, 'OTP_INVALID', 'The verification code is invalid or has already been used.');
    return { record: consumed, resetToken };
  };

  const consumeResetToken = async ({ email, resetToken }) => {
    const normalizedEmail = email.toLowerCase();
    const record = await Otp.findOne({
      email: normalizedEmail,
      purpose: 'PASSWORD_RESET',
      verifiedAt: { $ne: null },
    });
    if (
      !record
      || !record.resetTokenHash
      || new Date(record.resetTokenExpiresAt).getTime() <= clock()
      || !securelyMatches(hashResetToken(resetToken), record.resetTokenHash)
    ) {
      throw otpError(400, 'RESET_TOKEN_INVALID', 'The password reset authorization is invalid or expired.');
    }
    const claimed = await Otp.findOneAndDelete({
      _id: record._id,
      resetTokenHash: record.resetTokenHash,
      resetTokenExpiresAt: { $gt: new Date(clock()) },
    });
    if (!claimed) {
      throw otpError(400, 'RESET_TOKEN_INVALID', 'The password reset authorization is invalid or expired.');
    }
    return claimed;
  };

  return { issue, verify, consumeResetToken };
};

module.exports = {
  OTP_LIFETIME_MS,
  RESEND_COOLDOWN_MS,
  MAX_ATTEMPTS,
  createOtpService,
  generateOtp,
  hashOtp,
  securelyMatches,
};
