const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  recipient: { type: String, trim: true },
  phone: { type: String, trim: true },
  addressLine1: { type: String, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, trim: true },
  state: { type: String, trim: true },
  postalCode: { type: String, trim: true },
  country: { type: String, trim: true },
  isDefault: { type: Boolean, default: false },
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, select: false },
  googleId: { type: String, unique: true, sparse: true, select: false },
  emailVerified: { type: Boolean },
  role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  emailOffersOptIn: { type: Boolean, default: false },
  restockProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  addresses: { type: [addressSchema], default: [] },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
