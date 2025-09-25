import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailsModule } from 'src/emails/emails.module';
import { UsersController } from './controllers/users.controller';
import { SubscriptionPlans } from './entities/subscriptionPlans';
import { Users } from './entities/user.entity';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([Users, SubscriptionPlans]), EmailsModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
