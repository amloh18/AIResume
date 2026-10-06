import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  SERVICE_NAME: z.string().default('buildairesume-job-ingestion'),

  // MongoDB
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required').default('mongodb://localhost:27017/buildairesume'),
  MONGODB_DATABASE: z.string().default('buildairesume'),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().default(50),
  MONGODB_MIN_POOL_SIZE: z.coerce.number().default(10),

  // Worker & Scheduler
  JOB_WORKER_ENABLED: z.preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean().default(true)),
  DEFAULT_CONCURRENCY: z.coerce.number().default(5),
  DEFAULT_TIMEOUT_MS: z.coerce.number().default(30000),
  DEFAULT_RETRY_COUNT: z.coerce.number().default(3),
  BATCH_SIZE: z.coerce.number().default(500),
  DISTRIBUTED_LOCK_TTL_SECONDS: z.coerce.number().default(900),

  // API Sources Credentials & Switches
  ADZUNA_APP_ID: z.string().optional().default(''),
  ADZUNA_APP_KEY: z.string().optional().default(''),
  REMOTIVE_ENABLED: z.preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean().default(true)),
  REMOTEOK_ENABLED: z.preprocess((val) => val === 'true' || val === true || val === undefined, z.boolean().default(true)),
  JOBSPY_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean().default(false)),
  JOBSPY_WORKER_URL: z.string().default('http://localhost:8000'),

  // Stale & Expiration thresholds
  STALE_THRESHOLD_DAYS: z.coerce.number().default(7),
  EXPIRATION_THRESHOLD_DAYS: z.coerce.number().default(14),
});

export type EnvConfig = z.infer<typeof envSchema>;

function parseEnv(): EnvConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Environment validation failed:', JSON.stringify(result.error.format(), null, 2));
    throw new Error('Invalid environment configuration');
  }
  return result.data;
}

export const env = parseEnv();
