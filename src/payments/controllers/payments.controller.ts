import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  RawBody,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUserId } from 'src/common/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import { CreateCheckoutSessionDto } from '../dtos/payments.dto';
import { PaymentsService } from '../services/payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('create-checkout-session')
  createCheckoutSession(
    @CurrentUserId() userId: number,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.paymentsService.createCheckoutSession(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('customer-portal')
  customerPortal(@CurrentUserId() userId: number) {
    return this.paymentsService.customerPortal(userId);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('webhook')
  async webhook(
    @RawBody() rawBody: Buffer,
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    // rawBody is populated when Nest rawBody is enabled; fall back to parsed body reconstruction for compat.
    const raw =
      rawBody && rawBody.length
        ? Buffer.isBuffer(rawBody)
          ? rawBody
          : Buffer.from(String(rawBody))
        : Buffer.from(JSON.stringify((req as any).body ?? {}));
    return this.paymentsService.handleWebhook(raw, signature);
  }
}
