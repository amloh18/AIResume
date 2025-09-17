import nodemailer from 'nodemailer';

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

  return nodemailer.createTransporter(config);
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
    const mailOptions = {
      from: `"Circle CV" <${senderEmail}>`,
      to: email,
      subject: 'Verify Your Circle CV Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Circle CV</h1>
            <p style="color: #6B7280; margin: 5px 0 0 0;">Professional CV Builder</p>
          </div>
          
          <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin: 0 0 15px 0;">Welcome to Circle CV, ${firstName}!</h2>
            <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6;">
              Thank you for creating your account. To complete your registration and start building your professional CV, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" 
                 style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
              If the button doesn't work, you can also copy and paste this link into your browser:<br>
              <a href="${verificationLink}" style="color: #4F46E5; word-break: break-all;">${verificationLink}</a>
            </p>
          </div>
          
          <div style="text-align: center; color: #6B7280; font-size: 12px;">
            <p>This email was sent to ${email}. If you didn't create an account with Circle CV, you can safely ignore this email.</p>
            <p>&copy; 2024 Circle CV. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email verification sent successfully:', result.messageId);
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
    const mailOptions = {
      from: `"Circle CV" <${senderEmail}>`,
      to: email,
      subject: 'Reset Your Circle CV Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4F46E5; margin: 0;">Circle CV</h1>
            <p style="color: #6B7280; margin: 5px 0 0 0;">Professional CV Builder</p>
          </div>
          
          <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #111827; margin: 0 0 15px 0;">Password Reset Request</h2>
            <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6;">
              Hi ${firstName},<br><br>
              We received a request to reset your password for your Circle CV account. 
              Click the button below to reset your password.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
              If the button doesn't work, you can also copy and paste this link into your browser:<br>
              <a href="${resetLink}" style="color: #4F46E5; word-break: break-all;">${resetLink}</a>
            </p>
            
            <p style="color: #EF4444; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
              <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #6B7280; font-size: 12px;">
            <p>This email was sent to ${email}.</p>
            <p>&copy; 2024 Circle CV. All rights reserved.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
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
