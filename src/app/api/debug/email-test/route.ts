import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationCode } from '@/lib/email-service';
import { sendTestEmail } from '@/lib/email-service-enhanced';

export async function POST(request: NextRequest) {
  try {
    const { email, testType = 'verification' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Testing email sending to: ${email}`);
    console.log(`📧 Test type: ${testType}`);

    let result;
    let serviceUsed;

    if (testType === 'verification') {
      // Test verification code email
      result = await sendVerificationCode(email, '1234', 'passwordless-login');
      serviceUsed = 'email-service (verification)';
    } else {
      // Test general email
      result = await sendTestEmail(email);
      serviceUsed = 'email-service-enhanced (test)';
    }

    console.log(`📊 Email service result:`, result);
    console.log(`🔧 Service used: ${serviceUsed}`);

    // Check environment variables
    const emailConfig = {
      EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST ? '✅ Set' : '❌ Missing',
      EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT ? '✅ Set' : '❌ Missing',
      EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER ? '✅ Set' : '❌ Missing',
      EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ? '✅ Set' : '❌ Missing',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? '✅ Set' : '❌ Missing',
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL ? '✅ Set' : '❌ Missing',
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? '✅ Set' : '❌ Missing',
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN ? '✅ Set' : '❌ Missing',
    };

    return NextResponse.json({
      success: result.success,
      message: result.success ? 'Email sent successfully' : result.error || 'Failed to send email',
      serviceUsed,
      emailConfig,
      details: {
        email,
        testType,
        timestamp: new Date().toISOString(),
        result
      }
    });

  } catch (error: any) {
    console.error('❌ Email test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Email test failed', 
        error: error.message,
        stack: error.stack 
      },
      { status: 500 }
    );
  }
}
