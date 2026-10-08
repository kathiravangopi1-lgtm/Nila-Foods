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

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.get('/me', requireAuth, getCurrentUser);
router.patch('/me', requireAuth, updateCurrentUser);
router.post('/change-password', requireAuth, changePassword);
router.get('/addresses', requireAuth, getAddresses);
router.post('/addresses', requireAuth, createAddress);
router.patch('/addresses/:addressId', requireAuth, updateAddress);
router.delete('/addresses/:addressId', requireAuth, deleteAddress);

module.exports = router;
