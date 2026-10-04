const fs = require('fs/promises');
const path = require('path');
const { uploadsDirectory } = require('../middleware/upload_images');

const deleteProductImage = async (imageUrl) => {
  const filename = path.basename(imageUrl);
  if (!filename || filename !== imageUrl.replace(/^\/uploads\//, '')) {
    return false;
  }
  try {
    await fs.unlink(path.join(uploadsDirectory, filename));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

module.exports = { deleteProductImage };
