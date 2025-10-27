/**
 * Environment Configuration
 * 
 * This file ensures environment variables are properly loaded
 * before NextAuth configuration is initialized.
 */

// Validate required environment variables
export const env = {
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  MONGODB_URI: process.env.MONGODB_URI,
} as const;

// Validate required variables
if (!env.NEXTAUTH_URL) {
  throw new Error('NEXTAUTH_URL is required');
}

if (!env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required');
}

if (!env.GOOGLE_CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is required');
}

if (!env.GOOGLE_CLIENT_SECRET) {
  throw new Error('GOOGLE_CLIENT_SECRET is required');
}

console.log('✅ Environment variables loaded:', {
  NEXTAUTH_URL: env.NEXTAUTH_URL ? '✅ Set' : '❌ Missing',
  NEXTAUTH_SECRET: env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
  GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing',
  GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
});

export default env;
