const assert = require('node:assert/strict');
const test = require('node:test');
const { PassThrough } = require('node:stream');
const { createCloudinaryService } = require('../services/cloudinary_service');

test('Cloudinary uploads a validated file buffer and returns only secure URL and public ID', async () => {
  const uploaded = [];
  const client = {
    config: () => ({ cloud_name: 'test-cloud', api_key: 'test-key', api_secret: 'test-secret' }),
    uploader: {
      upload_stream: (options, callback) => {
        const stream = new PassThrough();
        stream.on('data', (buffer) => uploaded.push(buffer));
        stream.on('end', () => callback(null, {
          secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/test.jpg',
          public_id: 'nila-foods/products/test',
        }));
        return stream;
      },
      destroy: async (publicId) => ({ result: publicId ? 'ok' : 'not found' }),
    },
  };
  const service = createCloudinaryService({
    client,
    env: { CLOUDINARY_URL: 'cloudinary://test-key:test-secret@test-cloud' },
  });
  const result = await service.uploadImage({ buffer: Buffer.from('mock-image') });
  assert.deepEqual(result, {
    url: 'https://res.cloudinary.com/test-cloud/image/upload/test.jpg',
    publicId: 'nila-foods/products/test',
  });
  assert.deepEqual(uploaded, [Buffer.from('mock-image')]);
  assert.equal(await service.deleteImage('nila-foods/products/test'), true);
});

test('Cloudinary operations fail with safe configuration errors when CLOUDINARY_URL is absent', async () => {
  const service = createCloudinaryService({ client: {}, env: {} });
  await assert.rejects(
    service.uploadImage({ buffer: Buffer.from('mock-image') }),
    (error) => error.status === 503 && error.message === 'Cloudinary image storage is not configured.',
  );
  await assert.rejects(
    service.deleteImage('nila-foods/products/test'),
    (error) => error.status === 503,
  );
});

test('Cloudinary upload provider errors become safe gateway errors', async () => {
  const client = {
    config: () => ({ cloud_name: 'test-cloud', api_key: 'test-key', api_secret: 'test-secret' }),
    uploader: {
      upload_stream: (_options, callback) => ({
        end: () => callback(new Error('private provider response with credentials')),
      }),
    },
  };
  const service = createCloudinaryService({
    client,
    env: { CLOUDINARY_URL: 'cloudinary://test-key:test-secret@test-cloud' },
  });
  await assert.rejects(
    service.uploadImage({ buffer: Buffer.from('mock-image') }),
    (error) => error.status === 502 && !error.message.includes('credentials'),
  );
});
