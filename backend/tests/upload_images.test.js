const assert = require('node:assert/strict');
const test = require('node:test');
const { matchesImageType } = require('../middleware/upload_images');

test('image validation checks the JPEG, PNG, and WebP file signatures', () => {
  assert.equal(matchesImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'), true);
  assert.equal(
    matchesImageType(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'image/png'),
    true,
  );
  assert.equal(
    matchesImageType(Buffer.from('RIFF0000WEBP'), 'image/webp'),
    true,
  );
  assert.equal(matchesImageType(Buffer.from('GIF89a'), 'image/gif'), false);
  assert.equal(matchesImageType(Buffer.from('not an image'), 'image/jpeg'), false);
  assert.equal(matchesImageType(Buffer.from([0xff, 0xd8, 0xff]), 'image/png'), false);
});
