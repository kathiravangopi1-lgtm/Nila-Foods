const mongoose = require('mongoose');

const emailOtpSchema = new mongoose.Schema({
  email: { type: String, required: true, lowercase: true, trim: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['EMAIL_VERIFICATION', 'PASSWORD_RESET'], required: true },
  otpHash: { type: String, default: null },
  attempts: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date, default: null },
  resetTokenHash: { type: String, default: null },
  resetTokenExpiresAt: { type: Date, default: null },
}, { timestamps: true });

emailOtpSchema.index({ email: 1, purpose: 1 }, { unique: true });
emailOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.EmailOtp || mongoose.model('EmailOtp', emailOtpSchema);
