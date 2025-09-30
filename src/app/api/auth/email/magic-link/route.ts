import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, url, provider } = await request.json();

    // Custom email template for magic links
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Sign in to CV Circle</title>
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
            <h1>Sign in to your account</h1>
            <p>Click the button below to sign in to your CV Circle account.</p>

            <a href="${url}" class="button">Sign In</a>

            <div class="warning">
              <strong>Security Notice:</strong> This link will expire in 24 hours for your security.
              If you didn't request this sign-in, please ignore this email.
            </div>

            <p style="color: #6b7280; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <span style="word-break: break-all; color: #3b82f6;">${url}</span>
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
      Sign in to CV Circle

      Click the following link to sign in to your CV Circle account:
      ${url}

      This link will expire in 24 hours for your security.

      If you didn't request this sign-in, please ignore this email.

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
        subject: 'Sign in to CV Circle',
        text: emailText,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Failed to send magic link email:', errorText);
      throw new Error('Failed to send email');
    }

    console.log('✅ Magic link email sent successfully to:', email);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Error sending magic link email:', error.message);
    return NextResponse.json(
      { error: 'Failed to send magic link email' },
      { status: 500 }
    );
  }
}