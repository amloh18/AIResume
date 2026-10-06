import nodemailer from 'nodemailer';
import {
  getNewUserTemplate,
  getLimitExhaustedTemplate,
  getSpecialOffersTemplate,
  getVerificationCodeTemplate,
  getAccountDeletionTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getVerificationCopy,
  resolveVerificationPurpose,
  EMAIL_BRAND,
  EmailTemplateData,
  VerificationPurpose
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

export const createTransporter = () => {
  const config = getEmailConfig();

  if (!config) {
    return null;
  }

  // Enable SMTP pooling for super fast connection reuse (perfect for Hostinger)
  return nodemailer.createTransport({
    ...config,
    pool: true,
    maxConnections: 30,
    maxMessages: Infinity,
    rateDelta: 1000,
    rateLimit: 100, // 100 sends per second maximum throttling
  });
};

// Get sender email address
const getSenderEmail = (type: 'verification' | 'general' = 'general'): string => {
  if (type === 'verification') {
    return process.env.VERIFICATION_SENDER_EMAIL || process.env.EMAIL_FROM || 'verify@morigrid.com';
  }

  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }

  if (process.env.VERIFICATION_SENDER_EMAIL) {
    return process.env.VERIFICATION_SENDER_EMAIL;
  }

  if (process.env.SENDGRID_FROM_EMAIL) {
    return process.env.SENDGRID_FROM_EMAIL;
  }

  if (process.env.MAILGUN_DOMAIN) {
    return `noreply@${process.env.MAILGUN_DOMAIN}`;
  }

  if (process.env.AWS_SES_FROM_EMAIL) {
    return process.env.AWS_SES_FROM_EMAIL;
  }

  if (process.env.EMAIL_SERVER_USER && !process.env.EMAIL_SERVER_USER.includes('@smtp-brevo.com')) {
    return process.env.EMAIL_SERVER_USER;
  }

  return 'verify@morigrid.com';
};

// Send email verification
export async function sendEmailVerification(email: string, verificationLink: string, firstName: string) {
  // Check daily limits and transactional reservations
  const { checkEmailLimitAllowed } = await import('./services/emailLimiter');
  const limitCheck = await checkEmailLimitAllowed('system', 1);
  if (!limitCheck.allowed) {
    console.error('❌ Email limit check failed:', limitCheck.reason);
    return { success: false, error: limitCheck.reason };
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail('verification');
    const templateData: EmailTemplateData = {
      firstName,
      email,
      link: verificationLink
    };

    const html = getEmailVerificationTemplate(templateData);
    const text = `Verify Your Email - ${EMAIL_BRAND.productName}\n\nHello ${firstName},\n\nPlease click the link below to verify your email address:\n${verificationLink}\n\nIf you didn't create an account with ${EMAIL_BRAND.productName}, you can safely ignore this email.\n\n(c) ${EMAIL_BRAND.year} ${EMAIL_BRAND.productName} by ${EMAIL_BRAND.legalName}. All rights reserved.`;

    const mailOptions = {
      from: `"${EMAIL_BRAND.productName}" <${senderEmail}>`,
      to: email,
      replyTo: senderEmail,
      subject: `Verify Your Email - ${EMAIL_BRAND.productName}`,
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
  // Check daily limits and transactional reservations
  const { checkEmailLimitAllowed } = await import('./services/emailLimiter');
  const limitCheck = await checkEmailLimitAllowed('system', 1);
  if (!limitCheck.allowed) {
    console.error('❌ Email limit check failed:', limitCheck.reason);
    return { success: false, error: limitCheck.reason };
  }

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
    const text = `Reset Your Password - ${EMAIL_BRAND.productName}\n\nHello ${firstName},\n\nWe received a request to reset your password. Click the link below to set a new password:\n${resetLink}\n\nThis link will expire in 1 hour. If you didn't request this password reset, please ignore this email.\n\n(c) ${EMAIL_BRAND.year} ${EMAIL_BRAND.productName} by ${EMAIL_BRAND.legalName}. All rights reserved.`;

    const mailOptions = {
      from: `"${EMAIL_BRAND.productName}" <${senderEmail}>`,
      to: email,
      subject: `Reset Your Password - ${EMAIL_BRAND.productName}`,
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
  // Check daily limits and transactional reservations
  const { checkEmailLimitAllowed } = await import('./services/emailLimiter');
  const limitCheck = await checkEmailLimitAllowed('system', 1);
  if (!limitCheck.allowed) {
    console.error('❌ Email limit check failed:', limitCheck.reason);
    return { success: false, error: limitCheck.reason };
  }

  const transporter = createTransporter();

  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    const mailOptions = {
      from: from || `"AIResume" <${senderEmail}>`,
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

/** Extra context that lets a verification email describe itself accurately. */
export interface VerificationEmailContext {
  firstName?: string;
  /** Minutes until the code expires. Must match the issuing session's TTL. */
  expiryMinutes?: number;
  /** Failed attempts allowed before the code is destroyed. */
  maxAttempts?: number;
  /** When the code was requested (defaults to now). */
  requestedAt?: Date;
  /** Request context, shown so an unexpected request is obvious to the recipient. */
  device?: string;
  ipAddress?: string;
  /** True when the code is confirming 2FA setup rather than a sign-in. */
  isSetup?: boolean;
}

/**
 * Send a verification code email.
 *
 * The purpose drives the subject, headline and body copy. Previously this function
 * computed a `title`/`description` per type and then never passed them to the template,
 * so every email — sign-in, email verification, password reset and 2FA alike — said
 * "complete your sign-in".
 */
export async function sendVerificationCode(
  email: string,
  code: string,
  type: VerificationPurpose = 'passwordless-login',
  context: VerificationEmailContext = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check daily limits and transactional reservations
    const { checkEmailLimitAllowed } = await import('./services/emailLimiter');
    const limitCheck = await checkEmailLimitAllowed('system', 1);
    if (!limitCheck.allowed) {
      console.error('❌ Email limit check failed:', limitCheck.reason);
      return { success: false, error: limitCheck.reason };
    }

    // Reuse the pooled transporter so the sign-in path gets connection reuse.
    const transporter = createTransporter();
    if (!transporter) {
      console.warn('⚠️ No email service configured');
      return { success: false, error: 'Email service not configured' };
    }

    const purpose = resolveVerificationPurpose(type, context.isSetup);
    const copy = getVerificationCopy(purpose);
    const expiryMinutes = context.expiryMinutes ?? 10;
    const requestedAt = context.requestedAt ?? new Date();

    const templateData: EmailTemplateData = {
      code,
      email,
      firstName: context.firstName,
      purpose,
      expiryMinutes,
      maxAttempts: context.maxAttempts,
      requestedAt,
      device: context.device,
      ipAddress: context.ipAddress,
      isSetup: context.isSetup,
    };

    const html = getVerificationCodeTemplate(templateData);

    // Plain-text alternative built from the same copy, so it can never contradict the HTML.
    const greeting = context.firstName?.trim() ? `Hi ${context.firstName.trim()},` : 'Hello,';
    const textLines = [
      `${copy.title} - ${EMAIL_BRAND.productName}`,
      '',
      greeting,
      '',
      `Use the code below to ${copy.action}:`,
      '',
      `    ${code}`,
      '',
      `This code expires in ${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'} and can only be used once.`,
    ];
    if (typeof context.maxAttempts === 'number' && context.maxAttempts > 0) {
      textLines.push(`You have ${context.maxAttempts} attempt${context.maxAttempts === 1 ? '' : 's'} to get it right.`);
    }
    textLines.push(
      '',
      `Requested: ${requestedAt.toUTCString()}`
    );
    if (context.device) textLines.push(`Device: ${context.device}`);
    if (context.ipAddress) textLines.push(`IP address: ${context.ipAddress}`);
    textLines.push(
      '',
      `Didn't try to ${copy.reason}? Someone else may have your credentials. Do not share this code with anyone, and reset your password immediately.`,
      '',
      `Need help? Contact ${EMAIL_BRAND.supportEmail}`,
      '',
      `(c) ${EMAIL_BRAND.year} ${EMAIL_BRAND.productName} by ${EMAIL_BRAND.legalName}. All rights reserved.`,
      EMAIL_BRAND.domain
    );
    const text = textLines.join('\n');

    const senderEmail = getSenderEmail('verification');
    await transporter.sendMail({
      from: `"${EMAIL_BRAND.productName}" <${senderEmail}>`,
      to: email,
      replyTo: senderEmail,
      subject: copy.subject,
      text,
      html,
    });

    console.log(`✅ Verification code email (${purpose}) sent to ${email}`);
    // Track in system
    SystemEmailTracker.trackEmail('verification_code');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to send verification code email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
