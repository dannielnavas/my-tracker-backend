import { registerAs } from '@nestjs/config';

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

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
    jwt: {
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '24h',
      refreshTtlDays: parsePositiveInt(process.env.JWT_REFRESH_TTL_DAYS, 30),
    },
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
    cors: {
      origins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    },
    ai: {
      timeoutMs: parsePositiveInt(process.env.AI_TIMEOUT_MS, 15_000),
      maxTokens: parsePositiveInt(process.env.AI_MAX_TOKENS, 800),
      maxPromptChars: parsePositiveInt(process.env.AI_MAX_PROMPT_CHARS, 8_000),
      maxContentChars: parsePositiveInt(
        process.env.AI_MAX_CONTENT_CHARS,
        8_000,
      ),
      dailyLimit: parsePositiveInt(process.env.AI_DAILY_LIMIT, 10),
      // AI_PROVIDER: auto | openai | gemini | openrouter | mock
      provider:
        process.env.AI_PROVIDER?.trim().toLowerCase() || 'auto',
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        model:
          process.env.OPENROUTER_MODEL?.trim() || 'openai/gpt-4o-mini',
        baseUrl:
          process.env.OPENROUTER_BASE_URL?.trim() ||
          'https://openrouter.ai/api/v1',
        siteUrl:
          process.env.OPENROUTER_SITE_URL?.trim() ||
          process.env.CLIENT_URL?.trim() ||
          'http://localhost:4200',
        appTitle:
          process.env.OPENROUTER_APP_TITLE?.trim() || 'Focus Loop',
      },
    },
  };
});
