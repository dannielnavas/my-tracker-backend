import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../../auth/guard/jwt-auth/jwt-auth.guard';
import { CreateCheckoutSessionDto } from '../dtos/payments.dto';
import { PaymentsService } from '../services/payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout-session')
  createCheckoutSession(
    @Req() req: Request,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    const user = req.user as any;
    const userId = user.sub || user.user_id;
    return this.paymentsService.createCheckoutSession(userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('customer-portal')
  customerPortal(@Req() req: Request) {
    const user = req.user as any;
    const userId = user.sub || user.user_id;
    return this.paymentsService.customerPortal(userId);
  }

  @Public()
  @Post('webhook')
  async webhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    let rawBody: Buffer;
    if (Buffer.isBuffer(req.body)) {
      rawBody = req.body;
    } else if (typeof req.body === 'object') {
      rawBody = Buffer.from(JSON.stringify(req.body));
    } else {
      rawBody = Buffer.from(req.body || '');
    }
    return this.paymentsService.handleWebhook(rawBody, signature);
  }
}
