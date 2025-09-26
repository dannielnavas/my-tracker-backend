import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../service/cloudinary.service';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private cloudinary: CloudinaryService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo.');
    }

    if (!userId) {
      throw new BadRequestException('El userId es requerido.');
    }

    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de archivo no válido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP).',
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'El archivo es demasiado grande. El tamaño máximo permitido es 10MB.',
      );
    }

    try {
      const result = await this.cloudinary.uploadImage(file, userId);

      return {
        success: true,
        message: 'Imagen cargada exitosamente',
        imageUrl: result.secure_url,
        publicId: result.public_id,
        userId: userId,
      };
    } catch (error) {
      throw new HttpException(
        'Error al cargar la imagen',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':publicId')
  async deleteImage(@Param('publicId') publicId: string) {
    try {
      const result = await this.cloudinary.deleteImage(publicId);
      return {
        success: true,
        message: 'Imagen eliminada exitosamente',
        result: result.result,
      };
    } catch (error) {
      throw new HttpException(
        'Error al eliminar la imagen',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('info/:publicId')
  async getImageInfo(@Param('publicId') publicId: string) {
    try {
      const result = await this.cloudinary.getImageInfo(publicId);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        'Error al obtener información de la imagen',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
