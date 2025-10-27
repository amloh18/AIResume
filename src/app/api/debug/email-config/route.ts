import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Check email configuration manually
    let config = null;
    
    // Check for Gmail configuration
    if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
      config = {
        host: process.env.EMAIL_SERVER_HOST,
        port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
        secure: process.env.EMAIL_SERVER_PORT === '465',
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      };
    }
    
    // Check for SendGrid configuration
    if (!config && process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
      config = {
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: process.env.SENDGRID_API_KEY,
        },
      };
    }
    
    // Check for Mailgun configuration
    if (!config && process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
      config = {
        host: `smtp.mailgun.org`,
        port: 587,
        secure: false,
        auth: {
          user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
          pass: process.env.MAILGUN_API_KEY,
        },
      };
    }
    
    // Check for Gmail configuration
    if (!config && process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
      config = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_PASSWORD,
        },
      };
    }
    
    const environmentCheck = {
      EMAIL_SERVER_HOST: process.env.EMAIL_SERVER_HOST || 'Not set',
      EMAIL_SERVER_PORT: process.env.EMAIL_SERVER_PORT || 'Not set',
      EMAIL_SERVER_USER: process.env.EMAIL_SERVER_USER || 'Not set',
      EMAIL_SERVER_PASSWORD: process.env.EMAIL_SERVER_PASSWORD ? 'Set (hidden)' : 'Not set',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY ? 'Set (hidden)' : 'Not set',
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'Not set',
      MAILGUN_API_KEY: process.env.MAILGUN_API_KEY ? 'Set (hidden)' : 'Not set',
      MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN || 'Not set',
      GMAIL_USER: process.env.GMAIL_USER || 'Not set',
      GMAIL_PASSWORD: process.env.GMAIL_PASSWORD ? 'Set (hidden)' : 'Not set',
    };

    const activeProvider = config ? {
      host: config.host,
      port: config.port,
      secure: config.secure,
      user: config.auth.user,
      hasPassword: !!config.auth.pass
    } : null;

    return NextResponse.json({
      success: true,
      hasConfiguration: !!config,
      activeProvider,
      environmentVariables: environmentCheck,
      recommendations: getRecommendations(environmentCheck)
    });

  } catch (error: any) {
    console.error('❌ Email config check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to check email configuration', 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

function getRecommendations(env: Record<string, string>) {
  const recommendations = [];

  if (env.EMAIL_SERVER_HOST === 'Not set' && 
      env.SENDGRID_API_KEY === 'Not set' && 
      env.MAILGUN_API_KEY === 'Not set' && 
      env.GMAIL_USER === 'Not set') {
    recommendations.push('No email service configured. Please set up one of the supported providers.');
  }

  if (env.EMAIL_SERVER_HOST !== 'Not set' && env.EMAIL_SERVER_USER === 'Not set') {
    recommendations.push('EMAIL_SERVER_HOST is set but EMAIL_SERVER_USER is missing.');
  }

  if (env.EMAIL_SERVER_USER !== 'Not set' && env.EMAIL_SERVER_PASSWORD === 'Not set') {
    recommendations.push('EMAIL_SERVER_USER is set but EMAIL_SERVER_PASSWORD is missing.');
  }

  if (env.SENDGRID_API_KEY !== 'Not set' && env.SENDGRID_FROM_EMAIL === 'Not set') {
    recommendations.push('SENDGRID_API_KEY is set but SENDGRID_FROM_EMAIL is missing.');
  }

  if (env.MAILGUN_API_KEY !== 'Not set' && env.MAILGUN_DOMAIN === 'Not set') {
    recommendations.push('MAILGUN_API_KEY is set but MAILGUN_DOMAIN is missing.');
  }

  return recommendations;
}
