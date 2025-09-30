import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/database';
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

    await connectDB();

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Check if user has a password (local auth)
    if (!user.password) {
      return NextResponse.json(
        { error: 'This email is registered with a different sign-in method' },
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
          <title>Reset your CV Circle password</title>
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
            <div class="logo">CV Circle</div>
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
              <p>© 2024 CV Circle. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
      Reset your CV Circle password

      We received a request to reset your password. Click the following link to create a new password:
      ${resetUrl}

      This link will expire in 1 hour for your security.

      If you didn't request this password reset, please ignore this email.

      ---
      CV Circle Team
    `;

    // Send email using the configured email server
    const response = await fetch(`${process.env.EMAIL_SERVER_HOST}:${process.env.EMAIL_SERVER_PORT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.EMAIL_SERVER_USER}:${process.env.EMAIL_SERVER_PASSWORD}`
        ).toString('base64')}`,
      },
      body: JSON.stringify({
        from: process.env.EMAIL_SERVER_USER,
        to: email,
        subject: 'Reset your CV Circle password',
        text: emailText,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send password reset email:', errorText);
      throw new Error('Failed to send email');
    }

    console.log('✅ Password reset email sent successfully to:', email);
    return NextResponse.json({
      message: 'If an account with this email exists, a password reset link has been sent.'
    });
  } catch (error: any) {
    console.error('❌ Error sending password reset email:', error.message);
    return NextResponse.json(
      { error: 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}
