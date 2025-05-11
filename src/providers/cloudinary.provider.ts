import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryProvider {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(file: Express.Multer.File, folder: string): Promise<any> {

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'raw',
          },
          (error, result) => {
            if (error) {
              console.error('Error subiendo archivo a Cloudinary:', error);
              return reject(error);
            }
            resolve(result.secure_url);
          },
        )
        .end(file.buffer);
    });
  }
}
