const assert = require('node:assert/strict');
const test = require('node:test');
const Category = require('../models/category');
const Product = require('../models/product');
const cloudinary = require('../services/cloudinary_service');
const { createProduct, updateProduct } = require('../controllers/product_controller');

const callController = async (handler, { body, params = {}, files = [] }) => {
  const result = { statusCode: 200, body: null, error: null };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(payload) {
      result.body = payload;
      return this;
    },
  };
  await handler({ body, params, files }, res, (error) => { result.error = error; });
  if (result.error) throw result.error;
  return result;
};

const validProductBody = {
  name: 'Test oil',
  sku: 'TEST-OIL',
  description: 'A test product',
  price: '10.50',
  currency: 'INR',
  category: '507f1f77bcf86cd799439011',
  stock: '5',
};

test('admin product creation saves Cloudinary secure URL and public ID', async (t) => {
  const asset = {
    url: 'https://res.cloudinary.com/test-cloud/image/upload/product.jpg',
    publicId: 'nila-foods/products/product',
  };
  t.mock.method(Category, 'findOne', async () => ({ _id: validProductBody.category }));
  t.mock.method(cloudinary, 'uploadImage', async () => asset);
  t.mock.method(Product, 'create', async (product) => product);
  const result = await callController(createProduct, {
    body: validProductBody,
    files: [{ buffer: Buffer.from('signature-validated-image') }],
  });
  assert.equal(result.statusCode, 201);
  assert.deepEqual(result.body.data.images, [asset.url]);
  assert.deepEqual(result.body.data.imageAssets, [asset]);
});

test('arbitrary client-supplied image URLs are rejected on product creation', async (t) => {
  t.mock.method(Category, 'findOne', async () => ({ _id: validProductBody.category }));
  let uploadCount = 0;
  t.mock.method(cloudinary, 'uploadImage', async () => {
    uploadCount += 1;
    return { url: 'https://example.invalid/image.jpg', publicId: 'not-cloudinary' };
  });
  const result = await callController(createProduct, {
    body: { ...validProductBody, images: '["https://example.invalid/image.jpg"]' },
  });
  assert.equal(result.statusCode, 400);
  assert.equal(uploadCount, 0);
});

test('failed product persistence cleans up newly uploaded Cloudinary assets', async (t) => {
  const asset = {
    url: 'https://res.cloudinary.com/test-cloud/image/upload/product.jpg',
    publicId: 'nila-foods/products/product',
  };
  const deleted = [];
  t.mock.method(Category, 'findOne', async () => ({ _id: validProductBody.category }));
  t.mock.method(cloudinary, 'uploadImage', async () => asset);
  t.mock.method(cloudinary, 'deleteImage', async (publicId) => {
    deleted.push(publicId);
    return true;
  });
  t.mock.method(Product, 'create', async () => {
    throw new Error('database write failed');
  });
  await assert.rejects(callController(createProduct, {
    body: validProductBody,
    files: [{ buffer: Buffer.from('signature-validated-image') }],
  }), /database write failed/);
  assert.deepEqual(deleted, [asset.publicId]);
});

test('editing without an image replacement preserves the existing asset', async (t) => {
  const asset = {
    url: 'https://res.cloudinary.com/test-cloud/image/upload/product.jpg',
    publicId: 'nila-foods/products/product',
  };
  const currentProduct = { _id: '507f1f77bcf86cd799439012', images: [asset.url], imageAssets: [asset] };
  let update;
  let deleteCount = 0;
  t.mock.method(Product, 'findById', async () => currentProduct);
  t.mock.method(Product, 'findByIdAndUpdate', async (_id, changes) => {
    update = changes;
    return { ...currentProduct, ...changes.$set };
  });
  t.mock.method(cloudinary, 'deleteImage', async () => {
    deleteCount += 1;
    return true;
  });
  const result = await callController(updateProduct, {
    params: { productId: currentProduct._id },
    body: { price: '12.00' },
  });
  assert.equal(result.statusCode, 200);
  assert.equal(update.$set.images, undefined);
  assert.equal(deleteCount, 0);
});

test('removed Cloudinary images are deleted only after database update and only when unreferenced', async (t) => {
  const oldAsset = {
    url: 'https://res.cloudinary.com/test-cloud/image/upload/old.jpg',
    publicId: 'nila-foods/products/shared',
  };
  const currentProduct = {
    _id: '507f1f77bcf86cd799439012',
    images: [oldAsset.url],
    imageAssets: [oldAsset],
  };
  const callOrder = [];
  let sharedReference = true;
  t.mock.method(Product, 'findById', async () => currentProduct);
  t.mock.method(Product, 'findByIdAndUpdate', async (_id, changes) => {
    callOrder.push('database');
    return { ...currentProduct, ...changes.$set };
  });
  t.mock.method(Product, 'exists', async () => {
    callOrder.push('reference-check');
    return sharedReference ? { _id: 'another-product' } : null;
  });
  t.mock.method(cloudinary, 'deleteImage', async () => {
    callOrder.push('delete');
    return true;
  });

  await callController(updateProduct, {
    params: { productId: currentProduct._id },
    body: { images: '[]' },
  });
  assert.deepEqual(callOrder, ['database', 'reference-check']);

  callOrder.length = 0;
  sharedReference = false;
  await callController(updateProduct, {
    params: { productId: currentProduct._id },
    body: { images: '[]' },
  });
  assert.deepEqual(callOrder, ['database', 'reference-check', 'delete']);
});
