import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from '../../config';
import { UsersService } from '../../users/services/users.service';
import { CreateCheckoutSessionDto } from '../dtos/payments.dto';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: any = null;

  constructor(
    @Inject(config.KEY)
    private readonly configService: ConfigType<typeof config>,
    private readonly usersService: UsersService,
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

  async createCheckoutSession(userId: number, dto: CreateCheckoutSessionDto) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const clientUrl = this.configService.stripe.clientUrl;

    // --- MOCK MODE ---
    if (!this.stripe) {
      this.logger.log(
        `[MOCK] Simulating checkout session creation for user ${userId} and plan ${dto.plan_key}`,
      );
      // Automatically upgrade the user on mock checkout to provide a seamless local dev experience
      const planId = dto.plan_key === 'monthly' ? 2 : 3;
      await this.usersService.update(userId, { subscription_plan_id: planId });

      this.logger.log(
        `[MOCK] User ${userId} upgraded to plan ${dto.plan_key} (ID: ${planId})`,
      );
      return {
        url: `${clientUrl}/dashboard?payment_mock_success=true&plan_key=${dto.plan_key}`,
      };
    }

    // --- REAL STRIPE MODE ---
    try {
      let stripeCustomerId = user.stripe_customer_id;

      // 1. Ensure user has a Stripe Customer ID
      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.full_name,
          metadata: { userId: String(userId) },
        });
        stripeCustomerId = customer.id;
        await this.usersService.update(userId, {
          stripe_customer_id: stripeCustomerId,
        });
      }

      // 2. Determine price ID based on the plan key
      const priceId =
        dto.plan_key === 'monthly'
          ? this.configService.stripe.monthlyPriceId
          : this.configService.stripe.lifetimePriceId;

      if (!priceId) {
        throw new BadRequestException(
          `Stripe Price ID for plan '${dto.plan_key}' is not configured in env variables.`,
        );
      }

      // 3. Create checkout session
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

    // --- MOCK MODE ---
    if (!this.stripe) {
      this.logger.log(`[MOCK] Simulating customer portal access for user ${userId}`);
      return { url: `${clientUrl}/dashboard` };
    }

    // --- REAL STRIPE MODE ---
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

  async handleWebhook(rawBody: Buffer, signature: string) {
    // If Stripe is disabled, webhooks aren't processed
    if (!this.stripe) {
      this.logger.warn('[MOCK] Webhook received but Stripe is not configured.');
      return { received: true, mock: true };
    }

    let event: any;

    try {
      const webhookSecret = this.configService.stripe.webhookSecret;
      if (webhookSecret && signature) {
        event = this.stripe.webhooks.constructEvent(
          rawBody,
          signature,
          webhookSecret,
        );
      } else {
        // Fallback for testing without signature validation
        const jsonBody = JSON.parse(rawBody.toString('utf8'));
        event = jsonBody;
        this.logger.warn(
          'Stripe webhook signature check skipped (no signature or secret provided).',
        );
      }
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Received Stripe event type: ${event.type}`);

    // Handle events
    if (
      event.type === 'checkout.session.completed' ||
      event.type === 'invoice.payment_succeeded'
    ) {
      const session = event.data.object as any;
      const userId = session.metadata?.userId || session.subscription_details?.metadata?.userId;
      const planKey = session.metadata?.planKey || session.subscription_details?.metadata?.planKey;

      if (userId && planKey) {
        const planId = planKey === 'monthly' ? 2 : 3;
        this.logger.log(
          `Webhook success: Upgrading user ${userId} to plan ${planKey} (plan ID ${planId})`,
        );
        await this.usersService.update(Number(userId), {
          subscription_plan_id: planId,
        });
      } else {
        // If metadata is missing, look up by customer
        const customerId = session.customer;
        if (customerId) {
          this.logger.log(
            `Looking up user with stripe customer ID ${customerId}`,
          );
          // We can query users by customer id
          const users = await this.usersService.findOneByEmail(session.customer_email || '');
          if (users) {
            const planId = planKey === 'monthly' ? 2 : 3;
            await this.usersService.update(users.user_id, {
              subscription_plan_id: planId,
            });
          }
        }
      }
    }

    return { received: true };
  }
}
