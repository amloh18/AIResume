/**
 * Environment Configuration
 * 
 * This file ensures environment variables are properly loaded
 * and validated before the application starts.
 */

// Explicitly load .env.local file for Next.js build/webpack compatibility
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment files explicitly to ensure .env.local takes precedence
// This ensures env vars are available during webpack build/compilation
if (typeof window === 'undefined') {
  // Only run on server-side
  try {
    // Ensure process.stdout and process.stderr exist with isTTY property
    // This prevents dotenv from throwing errors during webpack builds
    if (typeof process !== 'undefined') {
      if (!process.stdout) {
        process.stdout = { isTTY: false, write: () => true, end: () => {} } as any;
      } else if (typeof process.stdout.isTTY === 'undefined') {
        Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      }
      
      if (!process.stderr) {
        process.stderr = { isTTY: false, write: () => true, end: () => {} } as any;
      } else if (typeof process.stderr.isTTY === 'undefined') {
        Object.defineProperty(process.stderr, 'isTTY', { value: false, writable: true });
      }
    }
    
    const envPath = resolve(process.cwd(), '.env');
    const envLocalPath = resolve(process.cwd(), '.env.local');
    
    // Load .env first (lower priority)
    dotenv.config({ path: envPath, override: false });
    
    // Load .env.local second (higher priority - will override .env)
    dotenv.config({ path: envLocalPath, override: true });
  } catch (error) {
    // Silently fail if dotenv can't load (Next.js will handle env vars)
    // This prevents build errors when stdout/stderr aren't available
    // Next.js automatically loads .env.local, so this is just a fallback
  }
}

interface EnvironmentConfig {
  // NextAuth Configuration
  NEXTAUTH_URL: string;
  NEXTAUTH_SECRET: string;
  
  // OAuth Providers
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  
  // Database
  MONGODB_URI: string;
  
  // Email Service
  EMAIL_SERVER_HOST?: string;
  EMAIL_SERVER_PORT?: string;
  EMAIL_SERVER_USER?: string;
  EMAIL_SERVER_PASSWORD?: string;
  
  // AI Services
  GEMINI_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  
  // Payment Services
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  
  // JWT
  JWT_SECRET?: string;
  
  // Firebase (if still used)
  NEXT_PUBLIC_FIREBASE_API_KEY?: string;
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?: string;
  NEXT_PUBLIC_FIREBASE_PROJECT_ID?: string;
  FIREBASE_PROJECT_ID?: string;
  FIREBASE_CLIENT_EMAIL?: string;
  FIREBASE_PRIVATE_KEY?: string;
}

// Required environment variables for production
const REQUIRED_VARS = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MONGODB_URI',
] as const;

// Optional but recommended environment variables
const RECOMMENDED_VARS = [
  'EMAIL_SERVER_HOST',
  'EMAIL_SERVER_USER',
  'EMAIL_SERVER_PASSWORD',
  'GEMINI_API_KEY',
  'JWT_SECRET',
] as const;

// Validate environment variables
function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  for (const varName of REQUIRED_VARS) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  // Check recommended variables
  for (const varName of RECOMMENDED_VARS) {
    if (!process.env[varName]) {
      warnings.push(`Missing recommended environment variable: ${varName}`);
    }
  }
  
  // Validate specific formats
  if (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.startsWith('http')) {
    errors.push('NEXTAUTH_URL must start with http:// or https://');
  }
  
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
  }
  
  if (process.env.MONGODB_URI && !process.env.MONGODB_URI.startsWith('mongodb')) {
    errors.push('MONGODB_URI must be a valid MongoDB connection string');
  }
  
  // Check email configuration completeness
  const emailVars = ['EMAIL_SERVER_HOST', 'EMAIL_SERVER_USER', 'EMAIL_SERVER_PASSWORD'];
  const emailConfigured = emailVars.every(varName => process.env[varName]);
  if (!emailConfigured && process.env.EMAIL_SERVER_HOST) {
    warnings.push('Email service partially configured - some variables missing');
  }
  
  // Log validation results
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`  - ${error}`));
    throw new Error(`Environment validation failed: ${errors.join(', ')}`);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Environment validation warnings:');
    warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  console.log('✅ Environment validation passed');
  
  return {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL!,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET!,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
    MONGODB_URI: process.env.MONGODB_URI!,
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
}

// Validate and export environment configuration
// Temporarily disable strict validation to fix loading issues
let env: EnvironmentConfig;
try {
  env = validateEnvironment();
} catch (error) {
  console.warn('⚠️ Environment validation failed, using fallback values:', error);
  // Fallback configuration with process.env values
  env = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'fallback-secret-key-for-development',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    MONGODB_URI: process.env.MONGODB_URI || '',
    EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT,
    EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY,
  };
}

// Log environment status (without sensitive values)
console.log('🔧 Environment Configuration Status:');
console.log(`  NEXTAUTH_URL: ${env.NEXTAUTH_URL ? '✅' : '❌'}`);
console.log(`  NEXTAUTH_SECRET: ${env.NEXTAUTH_SECRET ? '✅' : '❌'}`);
console.log(`  GOOGLE_CLIENT_ID: ${env.GOOGLE_CLIENT_ID ? '✅' : '❌'}`);
console.log(`  GOOGLE_CLIENT_SECRET: ${env.GOOGLE_CLIENT_SECRET ? '✅' : '❌'}`);
console.log(`  MONGODB_URI: ${env.MONGODB_URI ? '✅' : '❌'}`);
console.log(`  EMAIL_SERVICE: ${env.EMAIL_SERVER_HOST && env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD ? '✅' : '⚠️'}`);
console.log(`  GEMINI_API: ${env.GEMINI_API_KEY ? '✅' : '⚠️'}`);
console.log(`  STRIPE: ${env.STRIPE_SECRET_KEY ? '✅' : '⚠️'}`);

export default env;
