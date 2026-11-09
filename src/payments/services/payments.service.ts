import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import config from '../../config';
import { UsersService } from '../../users/services/users.service';
import { CreateCheckoutSessionDto } from '../dtos/payments.dto';
import { StripeEvent } from '../entities/stripe-event.entity';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: InstanceType<typeof Stripe> | null = null;

  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
    private readonly usersService: UsersService,
    @Optional()
    @InjectRepository(StripeEvent)
    private stripeEventRepo?: Repository<StripeEvent>,
  ) {
    const stripeSecret = this.configService.stripe.secretKey;
    if (stripeSecret) {
      this.stripe = new Stripe(stripeSecret, {
        apiVersion: '2022-11-15' as any,
      });
      this.logger.log('Stripe client initialized successfully.');
    } else {
      this.logger.warn(
        'Stripe API Key not found. Running in MOCK/SIMULATION mode for local development.',
      );
    }
  }

  private async markEventProcessed(
    eventId: string,
    type: string,
  ): Promise<boolean> {
    // Returns true if newly processed, false if duplicate.
    if (!eventId || !this.stripeEventRepo) return true;
    const existing = await this.stripeEventRepo.findOne({
      where: { stripe_event_id: eventId },
    });
    if (existing) return false;
    try {
      await this.stripeEventRepo.save(
        this.stripeEventRepo.create({ stripe_event_id: eventId, type }),
      );
      return true;
    } catch (err: any) {
      // Unique race -> another worker already processed it.
      if (err?.code === '23505') return false;
      throw err;
    }
  }

  private planIdForPlanKey(planKey: string): number {
    return planKey === 'lifetime' ? 3 : 2;
  }

  private planKeyForSession(session: any): string | null {
    const planKey =
      session?.metadata?.planKey ??
      session?.subscription_details?.metadata?.planKey;
    if (planKey === 'monthly' || planKey === 'lifetime') return planKey;
    // Fallback by price/amount (monthly $5.99 = 599, lifetime $59 = 5900)
    const amount = session?.amount_total;
    if (amount === 599) return 'monthly';
    if (amount === 5900) return 'lifetime';
    return null;
  }

  async createCheckoutSession(userId: number, dto: CreateCheckoutSessionDto) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const clientUrl = this.configService.stripe.clientUrl;

    if (!this.stripe) {
      this.logger.log(
        `[MOCK] Simulating checkout session creation for user ${userId} and plan ${dto.plan_key}`,
      );
      const planId = this.planIdForPlanKey(dto.plan_key);
      await this.usersService.update(userId, {
        subscription_plan_id: planId,
      } as any);
      return {
        url: `${clientUrl}/dashboard?payment_mock_success=true&plan_key=${dto.plan_key}`,
      };
    }

    try {
      let stripeCustomerId = user.stripe_customer_id;

      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.full_name,
          metadata: { userId: String(userId) },
        });
        stripeCustomerId = customer.id;
        await this.usersService.update(userId, {
          stripe_customer_id: stripeCustomerId,
        } as any);
      }

      const priceId =
        dto.plan_key === 'monthly'
          ? this.configService.stripe.monthlyPriceId
          : this.configService.stripe.lifetimePriceId;

      if (!priceId) {
        throw new BadRequestException(
          `Stripe Price ID for plan '${dto.plan_key}' is not configured in env variables.`,
        );
      }

      const session = await this.stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: dto.plan_key === 'monthly' ? 'subscription' : 'payment',
        success_url: `${clientUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/billing?cancelled=true`,
        metadata: {
          userId: String(userId),
          planKey: dto.plan_key,
        },
      });

      return { url: session.url };
    } catch (error) {
      this.logger.error('Stripe Checkout Session Error:', error);
      throw new BadRequestException(error.message);
    }
  }

  async customerPortal(userId: number) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const clientUrl = this.configService.stripe.clientUrl;

    if (!this.stripe) {
      this.logger.log(
        `[MOCK] Simulating customer portal access for user ${userId}`,
      );
      return { url: `${clientUrl}/dashboard` };
    }

    if (!user.stripe_customer_id) {
      throw new BadRequestException(
        'User does not have a registered Stripe customer ID yet (no previous purchase).',
      );
    }

    try {
      const portalSession = await this.stripe.billingPortal.sessions.create({
        customer: user.stripe_customer_id,
        return_url: `${clientUrl}/dashboard`,
      });
      return { url: portalSession.url };
    } catch (error) {
      this.logger.error('Stripe Customer Portal Error:', error);
      throw new BadRequestException(error.message);
    }
  }

  async handleWebhook(rawBody: Buffer, signature?: string) {
    // Real Stripe mode: signature verification is mandatory.
    if (this.stripe) {
      const webhookSecret = this.configService.stripe.webhookSecret;
      if (!webhookSecret) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Stripe webhook secret is not configured',
        });
      }
      if (!signature) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: 'Missing stripe-signature header',
        });
      }
      let event: any;
      try {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
      } catch (err: any) {
        this.logger.error(
          `Webhook signature verification failed: ${err.message}`,
        );
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message: `Webhook signature verification failed`,
        });
      }
      return this.processEvent(event);
    }

    // Mock mode (no Stripe key): accept JSON event but still enforce idempotency.
    let event: any;
    try {
      event =
        typeof rawBody === 'string' || Buffer.isBuffer(rawBody)
          ? JSON.parse(rawBody.toString('utf8'))
          : rawBody;
    } catch {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Invalid webhook payload',
      });
    }
    if (!event?.id || !event?.type) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'Webhook event missing id/type',
      });
    }
    this.logger.warn(
      '[MOCK] Webhook received without Stripe configured; processing as mock event.',
    );
    const result = await this.processEvent(event);
    return { ...result, mock: true };
  }

  private async processEvent(event: any) {
    const isNew = await this.markEventProcessed(event.id, event.type);
    if (!isNew) {
      this.logger.log(
        `Duplicate Stripe event ${event.id} ignored (idempotent)`,
      );
      return { received: true, duplicate: true };
    }

    this.logger.log(`Received Stripe event type: ${event.type}`);

    if (
      event.type !== 'checkout.session.completed' &&
      event.type !== 'invoice.payment_succeeded'
    ) {
      return { received: true };
    }

    const session = event.data.object;
    const planKey = this.planKeyForSession(session);
    const userIdRaw =
      session.metadata?.userId ??
      session.subscription_details?.metadata?.userId;

    if (userIdRaw) {
      if (!planKey) {
        this.logger.warn(
          `Webhook ${event.id} has no planKey; ignoring upgrade`,
        );
        return { received: true };
      }
      const planId = this.planIdForPlanKey(planKey);
      this.logger.log(
        `Webhook success: Upgrading user ${userIdRaw} to plan ${planKey} (plan ID ${planId})`,
      );
      await this.usersService.update(Number(userIdRaw), {
        subscription_plan_id: planId,
      } as any);
      return { received: true };
    }

    // Fallback: resolve by stripe customer id
    const customerId = session.customer;
    if (customerId && planKey) {
      try {
        const user =
          await this.usersService.findOneByStripeCustomerId(customerId);
        const planId = this.planIdForPlanKey(planKey);
        this.logger.log(
          `Webhook success (by customer): Upgrading user ${user.user_id} to plan ${planKey}`,
        );
        await this.usersService.update(user.user_id, {
          subscription_plan_id: planId,
        } as any);
      } catch (err) {
        this.logger.warn(
          `Webhook fallback customer lookup failed: ${(err as Error).message}`,
        );
      }
    }

    return { received: true };
  }
}
