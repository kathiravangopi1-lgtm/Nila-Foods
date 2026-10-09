const cloudinary = require('cloudinary').v2;

const createCloudinaryService = ({ client = cloudinary, env = process.env } = {}) => {
  const getClient = () => {
    if (!env.CLOUDINARY_URL?.startsWith('cloudinary://')) {
      const error = new Error('Cloudinary image storage is not configured.');
      error.status = 503;
      throw error;
    }
    const config = client.config();
    if (!config.cloud_name || !config.api_key || !config.api_secret) {
      const error = new Error('Cloudinary image storage is not configured.');
      error.status = 503;
      throw error;
    }
    return client;
  };

  const uploadImage = (file) => new Promise((resolve, reject) => {
    let stream;
    try {
      stream = getClient().uploader.upload_stream({
        folder: 'nila-foods/products',
        resource_type: 'image',
        overwrite: false,
      }, (error, result) => {
        if (error) {
          const uploadError = new Error('Cloudinary could not store the uploaded image.');
          uploadError.status = 502;
          return reject(uploadError);
        }
        if (!result?.secure_url || !result?.public_id) {
          const uploadError = new Error('Cloudinary returned an incomplete image upload result.');
          uploadError.status = 502;
          return reject(uploadError);
        }
        return resolve({ url: result.secure_url, publicId: result.public_id });
      });
      stream.end(file.buffer);
    } catch (error) {
      reject(error);
    }
  });

  const deleteImage = async (publicId) => {
    if (!publicId || typeof publicId !== 'string') return false;
    const result = await getClient().uploader.destroy(publicId, { resource_type: 'image' });
    if (result.result !== 'ok' && result.result !== 'not found') {
      const error = new Error('Cloudinary could not delete the product image.');
      error.status = 502;
      throw error;
    }
    return true;
  };

  return { uploadImage, deleteImage };
};

module.exports = { ...createCloudinaryService(), createCloudinaryService };
