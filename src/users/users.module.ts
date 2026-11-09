import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { EmailsModule } from '../emails/emails.module';
import { UsersController } from './controllers/users.controller';
import { SubscriptionPlans } from './entities/subscriptionPlans';
import { Users } from './entities/user.entity';
import { UsersService } from './services/users.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Users, SubscriptionPlans]),
    EmailsModule,
    forwardRef(() => CloudinaryModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
