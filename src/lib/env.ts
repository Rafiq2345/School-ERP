import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().default('3000'),
  APP_URL: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  SESSION_SECRET: z.string().min(16).default('development-session-secret-change-in-prod-12345'),
  CSRF_SECRET: z.string().min(16).default('development-csrf-secret-change-in-prod-12345'),
  DEFAULT_LOCALE: z.enum(['en', 'ur']).default('en'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  APP_URL: process.env.APP_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CSRF_SECRET: process.env.CSRF_SECRET,
  DEFAULT_LOCALE: process.env.DEFAULT_LOCALE,
  LOG_LEVEL: process.env.LOG_LEVEL,
});
