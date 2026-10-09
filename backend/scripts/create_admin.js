require('dotenv').config();

const mongoose = require('mongoose');
const User = require('../models/user');
const { hashPassword } = require('../utils/password');

const createAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_NAME?.trim() || !ADMIN_EMAIL?.trim() || !ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD in the environment before running this script.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ADMIN_EMAIL.trim())) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }
  if (ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }
  if (Buffer.byteLength(ADMIN_PASSWORD, 'utf8') > 72) {
    throw new Error('ADMIN_PASSWORD must be no longer than 72 UTF-8 bytes for bcrypt.');
  }
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI must be set in backend/.env or the environment.');
  }

  const email = ADMIN_EMAIL.trim().toLowerCase();
  await mongoose.connect(process.env.MONGO_URI);
  try {
    const otherAdminCount = await User.countDocuments({
      role: 'admin',
      email: { $ne: email },
    });
    if (otherAdminCount > 0) {
      throw new Error('Another admin account already exists; refusing to create a second admin.');
    }

    const user = await User.findOne({ email }).select('+password') || new User({ email });
    user.name = ADMIN_NAME.trim();
    user.email = email;
    user.password = await hashPassword(ADMIN_PASSWORD);
    user.role = 'admin';
    await user.save();

    console.log('Admin account created or updated.');
  } finally {
    await mongoose.disconnect();
    delete process.env.ADMIN_PASSWORD;
  }
};

createAdmin().catch((error) => {
  console.error('Failed to create admin account:', error.message);
  process.exitCode = 1;
});
