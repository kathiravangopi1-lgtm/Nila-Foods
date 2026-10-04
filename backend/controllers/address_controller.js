const userModel = require('../models/user');

const ADDRESS_FIELDS = [
  'recipient',
  'phone',
  'addressLine1',
  'addressLine2',
  'city',
  'state',
  'postalCode',
  'country',
];
const MAX_SAVED_ADDRESSES = 10;

const normalizeAddress = (input) => Object.fromEntries(
  ADDRESS_FIELDS.map((field) => [
    field,
    typeof input[field] === 'string' ? input[field].trim() : '',
  ]),
);

const validateAddress = (address) => {
  const requiredFields = ['recipient', 'addressLine1', 'city', 'postalCode', 'country'];
  return requiredFields.every((field) => address[field]);
};

const getAddresses = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id).select('addresses');
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    return res.status(200).json({ data: user.addresses });
  } catch (error) {
    return next(error);
  }
};

const createAddress = async (req, res, next) => {
  const address = normalizeAddress(req.body || {});
  if (!validateAddress(address)) {
    return res.status(400).json({
      error: 'Recipient, address line 1, city, postal code, and country are required.',
    });
  }

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    if (user.addresses.length >= MAX_SAVED_ADDRESSES) {
      return res.status(409).json({ error: `You can save up to ${MAX_SAVED_ADDRESSES} addresses.` });
    }

    const makeDefault = req.body.isDefault === true || user.addresses.length === 0;
    if (makeDefault) user.addresses.forEach((item) => { item.isDefault = false; });
    user.addresses.push({ ...address, isDefault: makeDefault });
    await user.save();

    const savedAddress = user.addresses[user.addresses.length - 1];
    return res.status(201).json({ data: savedAddress });
  } catch (error) {
    return next(error);
  }
};

const updateAddress = async (req, res, next) => {
  const updates = normalizeAddress(req.body || {});
  if (!validateAddress(updates)) {
    return res.status(400).json({
      error: 'Recipient, address line 1, city, postal code, and country are required.',
    });
  }

  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found.' });

    ADDRESS_FIELDS.forEach((field) => { address[field] = updates[field]; });
    if (req.body.isDefault === true) {
      user.addresses.forEach((item) => { item.isDefault = item._id.equals(address._id); });
    }
    await user.save();
    return res.status(200).json({ data: address });
  } catch (error) {
    return next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User account not found.' });
    const address = user.addresses.id(req.params.addressId);
    if (!address) return res.status(404).json({ error: 'Address not found.' });

    const wasDefault = address.isDefault;
    user.addresses.pull(address._id);
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    return res.status(200).json({ data: user.addresses });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getAddresses, createAddress, updateAddress, deleteAddress };
