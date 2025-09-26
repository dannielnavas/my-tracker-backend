import { Module } from '@nestjs/common';
import { UsersModule } from 'src/users/users.module';
import { CloudinaryProvider } from './cloudinary.provider';
import { CloudinaryController } from './controller/cloudinary.controller';
import { CloudinaryService } from './service/cloudinary.service';

@Module({
  providers: [CloudinaryService, CloudinaryProvider],
  controllers: [CloudinaryController],
  imports: [UsersModule],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
