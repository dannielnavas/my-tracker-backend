import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AiFunctionsModule } from './ai-functions/ai-functions.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ErrorEnvelopeFilter } from './common/filters/error-envelope.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import config from './config';
import { DatabaseModule } from './database/database.module';
import { EmailsModule } from './emails/emails.module';
import { environments } from './environments';
import { SettingsModule } from './settings/settings.module';
import { SprintsModule } from './sprints/sprints.module';
import { TasksModule } from './tasks/tasks.module';
import { UsersModule } from './users/users.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { PromptModule } from './prompt/prompt.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: environments[process.env.NODE_ENV || 'dev'],
      load: [config],
      isGlobal: true,
      validationSchema: Joi.object({
        API_KEY: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        DATABASE_NAME: Joi.string().required(),
        DATABASE_PORT: Joi.number().required(),
        POSTGRES_PASSWORD: Joi.string().required(),
        POSTGRES_USER: Joi.string().required(),
        POSTGRES_DB: Joi.string().required(),
        POSTGRES_HOST: Joi.string().required(),
        POSTGRES_PORT: Joi.number().required(),
        API_OPEN_AI: Joi.string().required(),
        API_KEY_RESEND: Joi.string().required(),
        CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
        CLOUDINARY_API_KEY: Joi.string().optional(),
        CLOUDINARY_API_SECRET: Joi.string().optional(),
        STRIPE_SECRET_KEY: Joi.string().optional(),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
        STRIPE_MONTHLY_PRICE_ID: Joi.string().optional(),
        STRIPE_LIFETIME_PRICE_ID: Joi.string().optional(),
        CLIENT_URL: Joi.string().optional(),
        CORS_ORIGINS: Joi.string().optional(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().optional(),
        JWT_REFRESH_TTL_DAYS: Joi.number().optional(),
        AI_TIMEOUT_MS: Joi.number().optional(),
        AI_MAX_TOKENS: Joi.number().optional(),
        AI_MAX_PROMPT_CHARS: Joi.number().optional(),
        AI_MAX_CONTENT_CHARS: Joi.number().optional(),
        AI_DAILY_LIMIT: Joi.number().optional(),
        AI_PROVIDER: Joi.string()
          .valid('auto', 'openai', 'gemini', 'openrouter', 'mock')
          .optional(),
        OPENROUTER_API_KEY: Joi.string().optional(),
        OPENROUTER_MODEL: Joi.string().optional(),
        OPENROUTER_BASE_URL: Joi.string().optional(),
        OPENROUTER_SITE_URL: Joi.string().optional(),
        OPENROUTER_APP_TITLE: Joi.string().optional(),
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    SprintsModule,
    TasksModule,
    SettingsModule,
    AiFunctionsModule,
    EmailsModule,
    CloudinaryModule,
    PromptModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: ErrorEnvelopeFilter },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule {}
