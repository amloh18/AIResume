import nodemailer from 'nodemailer';

// Email service configuration
const createTransporter = () => {
  // Check if we have email service configuration
  if (!process.env.EMAIL_SERVER_HOST || !process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
    console.warn('⚠️ Email service not configured. Email verification will not work.');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
  });
};

// Send email verification
export async function sendEmailVerification(email: string, verificationLink: string, firstName: string) {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('❌ Email service not configured');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const mailOptions = {
      from: `"Circle CV" <${process.env.EMAIL_SERVER_USER}>`,
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
    const mailOptions = {
      from: `"Circle CV" <${process.env.EMAIL_SERVER_USER}>`,
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
      error: 'Email service not configured. Please set EMAIL_SERVER_HOST, EMAIL_SERVER_USER, and EMAIL_SERVER_PASSWORD environment variables.'
    };
  }

  try {
    await transporter.verify();
    return { success: true, message: 'Email service is properly configured' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
