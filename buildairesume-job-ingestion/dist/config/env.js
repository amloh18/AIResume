"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().default(4001),
    LOG_LEVEL: zod_1.z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    SERVICE_NAME: zod_1.z.string().default('buildairesume-job-ingestion'),
    // MongoDB
    MONGODB_URI: zod_1.z.string().min(1, 'MONGODB_URI is required').default('mongodb://localhost:27017/buildairesume'),
    MONGODB_DATABASE: zod_1.z.string().default('buildairesume'),
    MONGODB_MAX_POOL_SIZE: zod_1.z.coerce.number().default(50),
    MONGODB_MIN_POOL_SIZE: zod_1.z.coerce.number().default(10),
    // Worker & Scheduler
    JOB_WORKER_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true || val === undefined, zod_1.z.boolean().default(true)),
    DEFAULT_CONCURRENCY: zod_1.z.coerce.number().default(5),
    DEFAULT_TIMEOUT_MS: zod_1.z.coerce.number().default(30000),
    DEFAULT_RETRY_COUNT: zod_1.z.coerce.number().default(3),
    BATCH_SIZE: zod_1.z.coerce.number().default(500),
    DISTRIBUTED_LOCK_TTL_SECONDS: zod_1.z.coerce.number().default(900),
    // API Sources Credentials & Switches
    ADZUNA_APP_ID: zod_1.z.string().optional().default(''),
    ADZUNA_APP_KEY: zod_1.z.string().optional().default(''),
    REMOTIVE_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true || val === undefined, zod_1.z.boolean().default(true)),
    REMOTEOK_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true || val === undefined, zod_1.z.boolean().default(true)),
    JOBSPY_ENABLED: zod_1.z.preprocess((val) => val === 'true' || val === true, zod_1.z.boolean().default(false)),
    JOBSPY_WORKER_URL: zod_1.z.string().default('http://localhost:8000'),
    // Stale & Expiration thresholds
    STALE_THRESHOLD_DAYS: zod_1.z.coerce.number().default(7),
    EXPIRATION_THRESHOLD_DAYS: zod_1.z.coerce.number().default(14),
});
function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        console.error('❌ Environment validation failed:', JSON.stringify(result.error.format(), null, 2));
        throw new Error('Invalid environment configuration');
    }
    return result.data;
}
exports.env = parseEnv();
//# sourceMappingURL=env.js.map