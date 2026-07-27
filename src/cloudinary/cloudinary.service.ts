import {
  Injectable,
  Inject,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { UploadApiResponse } from 'cloudinary';
import { CLOUDINARY, type CloudinaryType } from './cloudinary.provider';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinary: CloudinaryType,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
  ): Promise<{ secure_url: string; public_id: string }> {
    try {
      return new Promise((resolve, reject) => {
        const uploadStream = this.cloudinary.uploader.upload_stream(
          {
            folder: 'reports',
            resource_type: 'auto',
          },
          (uploadErr, result) => {
            if (uploadErr) {
              const err = uploadErr as Error;
              this.logger.error(`Cloudinary upload failed: ${err.message}`);
              reject(
                new InternalServerErrorException(
                  'File upload to Cloudinary failed',
                ),
              );
            } else {
              resolve({
                secure_url: (result as UploadApiResponse).secure_url,
                public_id: (result as UploadApiResponse).public_id,
              });
            }
          },
        );
        uploadStream.end(file.buffer);
      });
    } catch {
      this.logger.error('Cloudinary upload stream error');
      throw new InternalServerErrorException(
        'File upload to Cloudinary failed',
      );
    }
  }

  async uploadFiles(
    files: Express.Multer.File[],
  ): Promise<{ secure_url: string; public_id: string }[]> {
    const results = await Promise.allSettled(
      files.map((file) => this.uploadFile(file)),
    );

    const uploaded: { secure_url: string; public_id: string }[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        uploaded.push(result.value);
      } else {
        const reason = result.reason as Error | undefined;
        this.logger.error(
          `Batch upload failed: ${reason?.message ?? 'Unknown error'}`,
        );
      }
    }

    if (uploaded.length === 0 && files.length > 0) {
      throw new BadRequestException('All file uploads to Cloudinary failed');
    }

    return uploaded;
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await this.cloudinary.uploader.destroy(publicId);
    } catch (deleteErr) {
      const err = deleteErr as Error;
      this.logger.error(
        `Cloudinary delete failed for ${publicId}: ${err.message}`,
      );
    }
  }
}
