import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import User from '@/models/User';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    await getConnection();

    // Find user by email (case insensitive) - include password field
    const user = await User.findOne({ 
      email: { $regex: new RegExp(`^${email}$`, 'i') } 
    }).select('+password');
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'No account found with this email address. Please check your email address or create a new account if you haven\'t signed up yet.' 
        },
        { status: 404 }
      );
    }

    // Check if user can reset password
    const hasPassword = user.password && 
                       typeof user.password === 'string' && 
                       user.password.length > 0;
    
    // Check if email is from a custom domain (not Gmail/Google)
    const isCustomDomain = !email.includes('@gmail.com') && 
                          !email.includes('@googlemail.com') &&
                          !email.includes('@google.com');
    
    // Check if user has Google OAuth data
    const hasGoogleAuth = !!user.authProviderId;
    
    // Debug logging
    console.log('🔍 Password reset debug for:', email);
    console.log('   Password field type:', typeof user.password);
    console.log('   Password field value:', user.password ? 'EXISTS' : 'NULL/UNDEFINED');
    console.log('   Password length:', user.password ? user.password.length : 0);
    console.log('   Auth provider:', user.authProvider);
    console.log('   Auth Provider ID:', user.authProviderId || 'None');
    console.log('   Has password:', hasPassword);
    console.log('   Is custom domain:', isCustomDomain);
    console.log('   Has Google auth:', hasGoogleAuth);
    
    // Allow password reset if user has a password (regardless of auth method)
    // This handles NextAuth users with passwords, local users, and mixed scenarios
    if (hasPassword) {
      console.log('✅ Allowing password reset for user with password');
    } else {
      return NextResponse.json(
        { 
          success: false,
          error: 'This email is registered with a different sign-in method (Google, etc.). Please use the original sign-in method.' 
        },
        { status: 400 }
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Email template for password reset
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset your AI Resume password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f8fafc;
            }
            .container {
              background: white;
              border-radius: 12px;
              padding: 40px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              text-align: center;
            }
            .logo {
              font-size: 28px;
              font-weight: bold;
              color: #3b82f6;
              margin-bottom: 30px;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #3b82f6, #1d4ed8);
              color: white;
              padding: 16px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              margin: 20px 0;
              transition: transform 0.2s ease;
            }
            .button:hover {
              transform: translateY(-2px);
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
              color: #6b7280;
              font-size: 14px;
            }
            .warning {
              background: #fef3c7;
              border: 1px solid #f59e0b;
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              color: #92400e;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">AI Resume</div>
            <h1>Reset your password</h1>
            <p>We received a request to reset your password. Click the button below to create a new password.</p>

            <a href="${resetUrl}" class="button">Reset Password</a>

            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 1 hour for your security.
              If you didn't request this password reset, please ignore this email.
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all; color: #3b82f6;">${resetUrl}</span>
            </p>

            <div class="footer">
              <p>This email was sent to ${email}</p>
              <p>© 2026 AI Resume by Morigrid Labs. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
      Reset your AI Resume password

      We received a request to reset your password. Click the following link to create a new password:
      ${resetUrl}

      This link will expire in 1 hour for your security.

      If you didn't request this password reset, please ignore this email.

      ---
      AI Resume Team
    `;

    // Send email using the email service
    const { sendEmail } = await import('@/lib/email-service');
    
    await sendEmail({
      to: email,
      subject: 'Reset your AI Resume password',
      text: emailText,
      html: emailHtml,
    });

    console.log('✅ Password reset email sent successfully to:', email);
    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email address. Please check your inbox and follow the instructions.'
    });
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error.message);
    console.error('❌ Full error:', error);
    return NextResponse.json(
      { error: 'Failed to send password reset email', details: error.message },
      { status: 500 }
    );
  }
}
