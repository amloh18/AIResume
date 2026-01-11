import nodemailer from 'nodemailer';
import {
  getNewUserTemplate,
  getLimitExhaustedTemplate,
  getSpecialOffersTemplate,
  getVerificationCodeTemplate,
  getAccountDeletionTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  EmailTemplateData
} from './email-templates';
import SystemEmailTracker from './services/SystemEmailTracker';

// Enhanced email service configuration with multiple provider support
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email service configuration with multiple providers
const getEmailConfig = (): EmailConfig | null => {
  // Check for Gmail configuration
  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
    return {
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
  if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL) {
    return {
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
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return {
      host: `smtp.mailgun.org`,
      port: 587,
      secure: false,
      auth: {
        user: `postmaster@${process.env.MAILGUN_DOMAIN}`,
        pass: process.env.MAILGUN_API_KEY,
      },
    };
  }

  // Check for AWS SES configuration
  if (process.env.AWS_SES_ACCESS_KEY_ID && process.env.AWS_SES_SECRET_ACCESS_KEY && process.env.AWS_SES_REGION) {
    return {
      host: `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`,
      port: 587,
      secure: false,
      auth: {
        user: process.env.AWS_SES_ACCESS_KEY_ID,
        pass: process.env.AWS_SES_SECRET_ACCESS_KEY,
      },
    };
  }

  console.warn('⚠️ No email service configured. Please set up one of the following:');
  console.warn('   - Gmail: EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD');
  console.warn('   - SendGrid: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL');
  console.warn('   - Mailgun: MAILGUN_API_KEY, MAILGUN_DOMAIN');
  console.warn('   - AWS SES: AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, AWS_SES_REGION');

  return null;
};

// Create email transporter
const createTransporter = () => {
  const config = getEmailConfig();

  if (!config) {
    return null;
  }

  return nodemailer.createTransport(config);
};

// Get sender email address
const getSenderEmail = (): string => {
  if (process.env.SENDGRID_FROM_EMAIL) {
    return process.env.SENDGRID_FROM_EMAIL;
  }

  if (process.env.MAILGUN_DOMAIN) {
    return `noreply@${process.env.MAILGUN_DOMAIN}`;
  }

  if (process.env.AWS_SES_FROM_EMAIL) {
    return process.env.AWS_SES_FROM_EMAIL;
  }

  if (process.env.EMAIL_SERVER_USER) {
    return process.env.EMAIL_SERVER_USER;
  }

  return 'noreply@cvcircle.com';
};

// Send email verification
export async function sendEmailVerification(email: string, verificationLink: string, firstName: string) {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    const templateData: EmailTemplateData = {
      firstName,
      email,
      link: verificationLink
    };

    const html = getEmailVerificationTemplate(templateData);
    const text = `Verify Your Email - CVCircle\n\nHello ${firstName},\n\nPlease click the link below to verify your email address:\n${verificationLink}\n\nIf you didn't create an account with CVCircle, you can safely ignore this email.\n\n©2024 CVCircle. All rights reserved.`;

    const mailOptions = {
      from: `"CVCircle" <${senderEmail}>`,
      to: email,
      subject: 'Verify Your Email - CVCircle',
      text,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email verification sent successfully:', result.messageId);
    // Track in system
    SystemEmailTracker.trackEmail('verification_code');
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email verification:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetLink: string, firstName: string) {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    const templateData: EmailTemplateData = {
      firstName,
      email,
      link: resetLink
    };

    const html = getPasswordResetTemplate(templateData);
    const text = `Reset Your Password - CVCircle\n\nHello ${firstName},\n\nWe received a request to reset your password. Click the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour. If you didn't request this password reset, please ignore this email.\n\n©2024 CVCircle. All rights reserved.`;

    const mailOptions = {
      from: `"CVCircle" <${senderEmail}>`,
      to: email,
      subject: 'Reset Your Password - CVCircle',
      text,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    // Track in system
    SystemEmailTracker.trackEmail('password_reset');
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Test email service configuration
export async function testEmailService() {
  const transporter = createTransporter();

  if (!transporter) {
    return {
      success: false,
      error: 'Email service not configured. Please set up one of the supported email providers.'
    };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Email service is properly configured' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Generic email sending function
export async function sendEmail({ to, subject, text, html, from }: { to: string; subject: string; text: string; html: string; from?: string }) {
  const transporter = createTransporter();

  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    const mailOptions = {
      from: from || `"CVCircle" <${senderEmail}>`,
      to,
      subject,
      text,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send email:', error);
    return { success: false, error: error.message };
  }
}

// Get email service status
export function getEmailServiceStatus() {
  const config = getEmailConfig();

  if (!config) {
    return {
      configured: false,
      provider: 'none',
      message: 'No email service configured'
    };
  }

  let provider = 'unknown';
  if (config.host.includes('gmail.com')) provider = 'Gmail';
  else if (config.host.includes('sendgrid')) provider = 'SendGrid';
  else if (config.host.includes('mailgun')) provider = 'Mailgun';
  else if (config.host.includes('amazonaws')) provider = 'AWS SES';

  return {
    configured: true,
    provider,
    host: config.host,
    port: config.port,
    secure: config.secure,
    message: `Email service configured with ${provider}`
  };
}

// Send verification code email
export async function sendVerificationCode(
  email: string,
  code: string,
  type: 'email-verification' | 'passwordless-login' | 'password-reset'
): Promise<{ success: boolean; error?: string }> {
  try {
    const config = getEmailConfig();
    if (!config) {
      console.warn('⚠️ No email service configured');
      return { success: false, error: 'Email service not configured' };
    }

    const transporter = nodemailer.createTransport(config);

    // Get subject and content based on type
    let subject: string;
    let title: string;
    let description: string;

    switch (type) {
      case 'email-verification':
        subject = 'Verify Your Email - CVCircle';
        title = 'Verify Your Email Address';
        description = 'Please enter the code below to verify your email address and complete your account setup.';
        break;
      case 'passwordless-login':
        subject = 'Your Sign-In Code - CVCircle';
        title = 'Sign In to Your Account';
        description = 'Please enter the code below to sign in to your CVCircle account.';
        break;
      case 'password-reset':
        subject = 'Reset Your Password - CVCircle';
        title = 'Reset Your Password';
        description = 'Please enter the code below to reset your password.';
        break;
      default:
        subject = 'Your Verification Code - CVCircle';
        title = 'Verification Code';
        description = 'Please enter the code below to complete your request.';
    }

    const templateData: EmailTemplateData = {
      code,
      email
    };

    const html = getVerificationCodeTemplate(templateData);

    const text = `
CVCircle - Your Verification Code

Hello, enter the code below to complete your sign in.

Your verification code is: ${code}

This code will expire in 10 minutes. Do not share this code with anyone.

Didn't receive a code? You can request a new one from the app.

©2024 CVCircle. All rights reserved. www.cvcircle.io
    `;

    const senderEmail = getSenderEmail();
    await transporter.sendMail({
      from: `"CVCircle" <${senderEmail}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`✅ Verification code email sent to ${email}`);
    // Track in system
    SystemEmailTracker.trackEmail('verification_code');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to send verification code email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
