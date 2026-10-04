const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');

const uploadsDirectory = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDirectory, { recursive: true });

const imageTypes = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: uploadsDirectory,
  filename: (req, file, callback) => {
    callback(null, `${randomUUID()}${imageTypes[file.mimetype]}`);
  },
});

const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (req, file, callback) => {
    if (!imageTypes[file.mimetype]) {
      return callback(new Error('Only JPEG, PNG, WebP, and GIF images are allowed.'));
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
  if (mimetype === 'image/gif') {
    return /^GIF8[79]a$/.test(buffer.subarray(0, 6).toString('ascii'));
  }
  if (mimetype === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
};

const removeUploadedFiles = async (files = []) => {
  await Promise.all(files.map(async (file) => {
    try {
      await fsPromises.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }));
};

const validateUploadedImageFiles = async (req, res, next) => {
  const files = req.files || [];
  try {
    for (const file of files) {
      const handle = await fsPromises.open(file.path, 'r');
      try {
        const header = Buffer.alloc(12);
        const { bytesRead } = await handle.read(header, 0, header.length, 0);
        if (!matchesImageType(header.subarray(0, bytesRead), file.mimetype)) {
          const error = new Error(`Uploaded file "${file.originalname}" is not a valid supported image.`);
          error.status = 400;
          throw error;
        }
      } finally {
        await handle.close();
      }
    }
    return next();
  } catch (error) {
    try {
      await removeUploadedFiles(files);
    } catch (cleanupError) {
      console.error('Failed to remove rejected image uploads:', cleanupError);
      return next(cleanupError);
    }
    return next(error);
  }
};

module.exports = {
  uploadImages,
  uploadsDirectory,
  removeUploadedFiles,
  validateUploadedImageFiles,
};
