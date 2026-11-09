import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import toStream = require('buffer-to-stream');

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {}

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    this.logger.log(`Iniciando carga de imagen: ${file.originalname}`);

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `bk-201/${userId}`,
          transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Error al cargar imagen: ${error.message}`);
            return reject(error);
          }
          this.logger.log(`Imagen cargada exitosamente: ${result?.public_id}`);
          resolve(result as UploadApiResponse);
        },
      );

      toStream(file.buffer).pipe(upload);
    });
  }

  /**
   * Upload a data URI (data:image/...;base64,...) to Cloudinary, return secure_url.
   * If Cloudinary is not configured, returns null so callers can store the data URI as fallback.
   */
  async uploadBase64(dataUri: string, userId: number): Promise<string | null> {
    const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUri.trim());
    if (!match) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid base64 image data URI',
      });
    }
    const [, mime, base64] = match;
    if (!ALLOWED_MIME.includes(mime.toLowerCase())) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid image type. Allowed: jpeg, png, gif, webp',
      });
    }
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Empty image content',
      });
    }
    if (buffer.length > MAX_SIZE) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Image too large. Max 10MB',
      });
    }

    const config = v2.config() as any;
    const configured = config?.cloud_name || process.env.CLOUDINARY_CLOUD_NAME;
    if (!configured) {
      this.logger.warn(
        'Cloudinary not configured; caller will store data URI fallback',
      );
      return null;
    }

    const result = (await this.uploadImage(
      {
        buffer,
        originalname: `avatar_${userId}`,
        mimetype: mime,
      } as Express.Multer.File,
      String(userId),
    )) as UploadApiResponse;
    return result.secure_url ?? result.url ?? null;
  }

  async deleteImage(publicId: string): Promise<{ result: string }> {
    this.logger.log(`Eliminando imagen: ${publicId}`);

    try {
      const result = await v2.uploader.destroy(publicId);
      this.logger.log(`Imagen eliminada: ${publicId}`);
      return result;
    } catch (error) {
      this.logger.error(`Error al eliminar imagen: ${error.message}`);
      throw error;
    }
  }

  async getImageInfo(publicId: string): Promise<any> {
    this.logger.log(`Obteniendo información de imagen: ${publicId}`);

    try {
      const result = await v2.api.resource(publicId);
      return result;
    } catch (error) {
      this.logger.error(
        `Error al obtener información de imagen: ${error.message}`,
      );
      throw error;
    }
  }
}
