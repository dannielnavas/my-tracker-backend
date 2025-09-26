import { Injectable, Logger } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
import { UsersService } from 'src/users/services/users.service';
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly usersService: UsersService) {}

  async uploadImage(
    file: Express.Multer.File,
    userId: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    this.logger.log(`Iniciando carga de imagen: ${file.originalname}`);

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: `bk-201/${userId}`, // Organizar imágenes por usuario
          transformation: [{ quality: 'auto' }, { fetch_format: 'auto' }],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Error al cargar imagen: ${error.message}`);
            return reject(error);
          }
          this.usersService.update(Number(userId), {
            profile_image: result?.url,
          });
          this.logger.log(`Imagen cargada exitosamente: ${result?.public_id}`);
          resolve(result as UploadApiResponse);
        },
      );

      toStream(file.buffer).pipe(upload);
    });
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
