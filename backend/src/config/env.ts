import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const optionalEnvString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const optionalEnvNumber = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.coerce.number().optional(),
);

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().url().optional(),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  SMTP_HOST: optionalEnvString,
  SMTP_PORT: optionalEnvNumber,
  SMTP_USER: optionalEnvString,
  SMTP_PASS: optionalEnvString,
  SMTP_FROM: optionalEnvString,
});

export const env = envSchema.parse(process.env);

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const;

export const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg'] as const;
