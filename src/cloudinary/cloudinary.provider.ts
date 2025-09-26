import { ConfigService } from '@nestjs/config';
import { v2 } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'Cloudinary',
  useFactory: (configService: ConfigService) => {
    v2.config({
      cloud_name: configService.get<string>('config.cloudinary.cloudName'),
      api_key: configService.get<string>('config.cloudinary.apiKey'),
      api_secret: configService.get<string>('config.cloudinary.apiSecret'),
    });
    return v2;
  },
  inject: [ConfigService],
};
