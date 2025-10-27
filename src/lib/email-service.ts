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

// Generic email sending function
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text: string; html: string }) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    const mailOptions = {
      from: `"Circle CV" <${senderEmail}>`,
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

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 0; 
            padding: 0; 
            background-color: #283020; 
            min-height: 100vh;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #283020; 
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .card { 
            background-color: #2a3a22; 
            border-radius: 16px; 
            padding: 40px; 
            text-align: center; 
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            border: 1px solid #3a4a32;
            max-width: 400px;
            width: 100%;
          }
          .header { 
            margin-bottom: 30px; 
          }
          .header h1 { 
            color: #ffffff; 
            margin: 0; 
            font-size: 24px; 
            font-weight: 700; 
          }
          .title { 
            color: #ffffff; 
            margin: 0 0 15px 0; 
            font-size: 28px; 
            font-weight: 700; 
          }
          .subtitle { 
            color: #a0a0a0; 
            font-size: 16px; 
            margin: 0 0 30px 0; 
            line-height: 1.5;
          }
          .code-container { 
            display: flex; 
            justify-content: center; 
            gap: 12px; 
            margin: 30px 0; 
          }
          .code-digit { 
            width: 60px; 
            height: 60px; 
            background-color: #1a1a1a; 
            border: 2px solid #3a4a32; 
            border-radius: 8px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-size: 24px; 
            font-weight: 700; 
            color: #88E03F; 
            font-family: 'Courier New', monospace;
          }
          .warning { 
            background-color: #2a3a22; 
            border: 1px solid #3a4a32; 
            border-radius: 8px; 
            padding: 16px; 
            margin: 20px 0; 
          }
          .warning-text { 
            color: #a0a0a0; 
            font-size: 14px; 
            margin: 0; 
            line-height: 1.5;
          }
          .resend { 
            margin: 30px 0 20px 0; 
          }
          .resend-text { 
            color: #a0a0a0; 
            font-size: 14px; 
            margin: 0; 
          }
          .resend-link { 
            color: #88E03F; 
            text-decoration: none; 
            font-weight: 600; 
          }
          .resend-link:hover { 
            color: #88E03F; 
            opacity: 0.8; 
          }
          .footer { 
            margin-top: 40px; 
            text-align: center; 
            color: #a0a0a0; 
            font-size: 12px; 
            line-height: 1.4;
          }
          .expiry { 
            color: #ff6b6b; 
            font-weight: 600; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Circle CV</h1>
            </div>
            
            <h2 class="title">Your Verification Code</h2>
            <p class="subtitle">Hello, enter the code below to complete your sign in.</p>
            
            <div class="code-container">
              ${code.split('').map(digit => `<div class="code-digit">${digit}</div>`).join('')}
            </div>
            
            <div class="warning">
              <p class="warning-text">
                This code will expire in <span class="expiry">10 minutes</span>. Do not share this code with anyone.
              </p>
            </div>
            
            <div class="resend">
              <p class="resend-text">
                Didn't receive a code? <a href="#" class="resend-link">Resend Code</a>
              </p>
            </div>
          </div>
          
          <div class="footer">
            <p>©2024 Circle CV. All rights reserved. 123 Job Lane, Success City, 54321</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Circle CV - Your Verification Code

Hello, enter the code below to complete your sign in.

Your verification code is: ${code}

This code will expire in 10 minutes. Do not share this code with anyone.

Didn't receive a code? You can request a new one from the app.

©2024 Circle CV. All rights reserved. 123 Job Lane, Success City, 54321
    `;

    const senderEmail = getSenderEmail();
    await transporter.sendMail({
      from: `"Circle CV" <${senderEmail}>`,
      to: email,
      subject,
      text,
      html,
    });

    console.log(`✅ Verification code email sent to ${email}`);
    return { success: true };

  } catch (error: any) {
    console.error('❌ Failed to send verification code email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
