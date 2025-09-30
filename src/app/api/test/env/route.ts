import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const envCheck = {
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    MONGODB_URI: !!process.env.MONGODB_URI,
    EMAIL_SERVER_HOST: !!process.env.EMAIL_SERVER_HOST,
    EMAIL_SERVER_USER: !!process.env.EMAIL_SERVER_USER,
    EMAIL_SERVER_PASSWORD: !!process.env.EMAIL_SERVER_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Check for missing critical variables
  const missing = [];
  if (!process.env.NEXTAUTH_SECRET) missing.push('NEXTAUTH_SECRET');
  if (!process.env.NEXTAUTH_URL) missing.push('NEXTAUTH_URL');
  if (!process.env.GOOGLE_CLIENT_ID) missing.push('GOOGLE_CLIENT_ID');
  if (!process.env.GOOGLE_CLIENT_SECRET) missing.push('GOOGLE_CLIENT_SECRET');
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI');

  return NextResponse.json({
    success: missing.length === 0,
    environment: envCheck,
    missing: missing,
    message: missing.length > 0 
      ? `Missing required environment variables: ${missing.join(', ')}`
      : 'All required environment variables are present'
  });
}