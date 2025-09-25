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
  };
});
