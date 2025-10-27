import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    emailHost: process.env.EMAIL_SERVER_HOST || 'Not set',
    emailUser: process.env.EMAIL_SERVER_USER || 'Not set',
    emailPassword: process.env.EMAIL_SERVER_PASSWORD ? 'Set' : 'Not set',
    nodeEnv: process.env.NODE_ENV || 'Not set',
    allEnvKeys: Object.keys(process.env).filter(key => key.includes('EMAIL') || key.includes('GMAIL') || key.includes('SENDGRID') || key.includes('MAILGUN'))
  });
}
