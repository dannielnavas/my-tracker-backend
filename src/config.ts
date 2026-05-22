import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      name: process.env.DATABASE_NAME,
      port: process.env.DATABASE_PORT,
    },
    postgres: {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
    },
    apiKey: process.env.API_KEY,
    apiKeyProd: process.env.API_KEY,
    jwtSecret: process.env.JWT_SECRET,
    apiOpenAi: process.env.API_OPEN_AI,
    apiKeyResend: process.env.API_KEY_RESEND,
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      monthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
      lifetimePriceId: process.env.STRIPE_LIFETIME_PRICE_ID,
      clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
    },
  };
});
