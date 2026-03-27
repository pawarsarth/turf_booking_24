import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadImage(base64: string, folder = 'turfs'): Promise<string> {
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: 'image',
    transformation: [{ width: 1200, height: 800, crop: 'fill' }, { quality: 'auto' }, { fetch_format: 'auto' }],
  });
  return result.secure_url;
}

export default cloudinary;
