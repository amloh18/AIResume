import nodemailer from 'nodemailer';
import { 
  getEmailVerificationTemplate, 
  getPasswordResetTemplate, 
  getWelcomeEmailTemplate, 
  getMembershipReminderTemplate,
  getTestEmailTemplate 
} from './email-templates';

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
  // Check for Hostinger configuration
  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
    return {
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '465'),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    };
  }

  // Check for Gmail configuration
  if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    };
  }

  console.warn('⚠️ No email service configured. Please set up Hostinger or Gmail SMTP settings.');
  return null;
};

// Create email transporter
const createTransporter = () => {
  const config = getEmailConfig();
  if (!config) return null;
  return nodemailer.createTransporter(config);
};

// Get sender email address
const getSenderEmail = (): string => {
  if (process.env.EMAIL_SERVER_USER) {
    return process.env.EMAIL_SERVER_USER;
  }
  if (process.env.GMAIL_USER) {
    return process.env.GMAIL_USER;
  }
  return 'noreply@cvcircle.io';
};

// Send email verification
export async function sendEmailVerification(email: string, verificationLink: string, firstName: string) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = getEmailVerificationTemplate(firstName, verificationLink);
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: template.subject,
      html: template.html,
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
    const template = getPasswordResetTemplate(firstName, resetLink);
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

// Send welcome email with membership promotion
export async function sendWelcomeEmail(email: string, firstName: string) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = getWelcomeEmailTemplate(firstName);
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send membership reminder email
export async function sendMembershipReminderEmail(email: string, firstName: string, daysLeft: number) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = getMembershipReminderTemplate(firstName, daysLeft);
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Membership reminder email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send membership reminder email:', error);
    return { success: false, error: error.message };
  }
}

// Send test email
export async function sendTestEmail(email: string) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const template = getTestEmailTemplate();
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: template.subject,
      html: template.html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send test email:', error);
    return { success: false, error: error.message };
  }
}

// Send custom email with template
export async function sendCustomEmail(email: string, subject: string, html: string) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const senderEmail = getSenderEmail();
    
    const mailOptions = {
      from: `"CVCircle.io" <${senderEmail}>`,
      to: email,
      subject: subject,
      html: html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Custom email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send custom email:', error);
    return { success: false, error: error.message };
  }
}