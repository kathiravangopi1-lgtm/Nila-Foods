const multer = require('multer');

const imageTypes = ['image/jpeg', 'image/png', 'image/webp'];

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 8, fields: 20, parts: 28 },
  fileFilter: (_req, file, callback) => {
    if (!imageTypes.includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, and WebP images are allowed.');
      error.status = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const matchesImageType = (buffer, mimetype) => {
  if (mimetype === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimetype === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

const validateUploadedImageFiles = (req, res, next) => {
  for (const file of req.files || []) {
    if (!matchesImageType(file.buffer, file.mimetype)) {
      const error = new Error(`Uploaded file "${file.originalname}" is not a valid supported image.`);
      error.status = 400;
      return next(error);
    }
  }
  return next();
};

module.exports = { uploadImages, matchesImageType, validateUploadedImageFiles };
