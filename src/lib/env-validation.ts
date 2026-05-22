/**
 * Comprehensive environment variable validation
 * Validates all required environment variables on application startup
 */

interface EnvValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

interface EnvConfig {
  // Database
  MONGODB_URI: string;
  
  // Authentication
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  JWT_SECRET: string;
  
  // Google OAuth
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: string;
  GOOGLE_REDIRECT_URI: string;
  
  // Email Service
  EMAIL_SERVER_HOST: string;
  EMAIL_SERVER_PORT: string;
  EMAIL_SERVER_USER: string;
  EMAIL_SERVER_PASSWORD: string;
  
  // AI Services
  GEMINI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  
  // Payment Processing
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  
  // Firebase
  NEXT_PUBLIC_FIREBASE_API_KEY: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
  NEXT_PUBLIC_FIREBASE_APP_ID: string;
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_CLIENT_EMAIL: string;
  FIREBASE_PRIVATE_KEY: string;
  
  // File Upload
  UPLOAD_DIR: string;
  
  // AWS S3 (Required for file storage)
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_S3_REGION: string;
  AWS_S3_BUCKET_NAME: string;
  
  // Optional Services
  SENDGRID_API_KEY?: string;
  SENDGRID_FROM_EMAIL?: string;
  MAILGUN_API_KEY?: string;
  MAILGUN_DOMAIN?: string;
  AWS_SES_ACCESS_KEY_ID?: string;
  AWS_SES_SECRET_ACCESS_KEY?: string;
  AWS_SES_REGION?: string;
  NEXT_PUBLIC_HERO_BANNER_S3_URL?: string;
  NEXT_PUBLIC_S3_BASE_URL?: string;
}

const REQUIRED_VARS: (keyof EnvConfig)[] = [
  'MONGODB_URI',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXT_PUBLIC_GOOGLE_CLIENT_ID',
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_PORT',
  'EMAIL_SERVER_USER',
  'EMAIL_SERVER_PASSWORD',
  'GEMINI_API_KEY',
  'PERPLEXITY_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_PUBLISHABLE_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
  'NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'UPLOAD_DIR',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_REGION',
  'AWS_S3_BUCKET_NAME'
];

const PRODUCTION_VARS: (keyof EnvConfig)[] = [
  'MONGODB_URI',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_USER',
  'EMAIL_SERVER_PASSWORD',
  'GEMINI_API_KEY',
  'PERPLEXITY_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_PRIVATE_KEY'
];

const SENSITIVE_VARS: (keyof EnvConfig)[] = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'JWT_SECRET',
  'GOOGLE_CLIENT_SECRET',
  'EMAIL_SERVER_PASSWORD',
  'GEMINI_API_KEY',
  'PERPLEXITY_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'FIREBASE_PRIVATE_KEY',
  'SENDGRID_API_KEY',
  'MAILGUN_API_KEY',
  'AWS_SES_ACCESS_KEY_ID',
  'AWS_SES_SECRET_ACCESS_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY'
];

export function validateEnvironment(): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    missing: [],
    warnings: [],
    errors: []
  };

  const isProduction = process.env.NODE_ENV === 'production';
  const env = process.env as Partial<EnvConfig>;

  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!env[varName] || env[varName]!.trim() === '') {
      result.missing.push(varName);
      result.isValid = false;
    }
  }

  // Additional production checks
  if (isProduction) {
    for (const varName of PRODUCTION_VARS) {
      if (!env[varName] || env[varName]!.trim() === '') {
        result.errors.push(`Production requires ${varName} to be set`);
        result.isValid = false;
      }
    }

    // Check for placeholder values
    const placeholderValues = [
      'your-mongodb-connection-string-here',
      'your-super-secret-jwt-key-change-this-in-production',
      'your-nextauth-secret-key-change-this-in-production',
      'your-google-client-id',
      'your-google-client-secret',
      'your-hostinger-email-password',
      'sk_test_your_stripe_secret_key',
      'pk_test_your_stripe_publishable_key',
      'whsec_your_webhook_secret'
    ];

    for (const varName of SENSITIVE_VARS) {
      const value = env[varName];
      if (value && placeholderValues.some(placeholder => value.includes(placeholder))) {
        result.errors.push(`${varName} contains placeholder value - must be set to actual value in production`);
        result.isValid = false;
      }
    }
  }

  // Validate specific formats
  if (env.NEXTAUTH_URL && !env.NEXTAUTH_URL.startsWith('http')) {
    result.errors.push('NEXTAUTH_URL must start with http:// or https://');
    result.isValid = false;
  }

  if (env.EMAIL_SERVER_PORT && isNaN(parseInt(env.EMAIL_SERVER_PORT))) {
    result.errors.push('EMAIL_SERVER_PORT must be a valid number');
    result.isValid = false;
  }

  if (env.GOOGLE_CLIENT_ID && !env.GOOGLE_CLIENT_ID.includes('.')) {
    result.warnings.push('GOOGLE_CLIENT_ID format may be invalid');
  }

  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_')) {
    result.warnings.push('STRIPE_SECRET_KEY format may be invalid');
  }

  // Check for development values in production
  if (isProduction) {
    if (env.NEXTAUTH_URL?.includes('localhost')) {
      result.errors.push('NEXTAUTH_URL cannot contain localhost in production');
      result.isValid = false;
    }

    if (env.STRIPE_SECRET_KEY?.includes('test')) {
      result.warnings.push('Using Stripe test keys in production - ensure this is intentional');
    }
  }

  return result;
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  
  console.log('🔍 Environment Validation Results:');
  console.log('================================');
  
  if (result.isValid) {
    console.log('✅ All required environment variables are set');
  } else {
    console.log('❌ Environment validation failed');
  }

  if (result.missing.length > 0) {
    console.log('\n❌ Missing required variables:');
    result.missing.forEach(varName => {
      console.log(`   - ${varName}`);
    });
  }

  if (result.errors.length > 0) {
    console.log('\n❌ Configuration errors:');
    result.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   - ${warning}`);
    });
  }

  console.log('================================\n');
}

export function getEnvironmentConfig(): Partial<EnvConfig> {
  return process.env as Partial<EnvConfig>;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

// Validate on module load
if (typeof window === 'undefined') {
  logEnvironmentStatus();
}
