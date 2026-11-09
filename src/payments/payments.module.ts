import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { PaymentsController } from './controllers/payments.controller';
import { StripeEvent } from './entities/stripe-event.entity';
import { PaymentsService } from './services/payments.service';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([StripeEvent])],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
