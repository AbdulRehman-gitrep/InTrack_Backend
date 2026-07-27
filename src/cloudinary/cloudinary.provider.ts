import type { v2 } from 'cloudinary';
import { v2 as cloudinary } from 'cloudinary';
import { Provider } from '@nestjs/common';

export const CLOUDINARY = 'CLOUDINARY';

export type CloudinaryType = typeof v2;

export const CloudinaryProvider: Provider = {
  provide: CLOUDINARY,
  useFactory: () => {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    return cloudinary;
  },
};
