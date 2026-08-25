import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, url, provider } = await request.json();

    // Get base URL for email images (absolute URLs required for emails)
    const baseUrl = process.env.NEXTAUTH_URL || 'https://www.buildairesume.com';
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const logoUrl = `${cleanBaseUrl}/images/logo.png`;

    // Custom email template for magic links - matches auth page dark theme
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
          <meta name="x-apple-disable-message-reformatting">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Sign in to AIResume</title>
          <style>
            body, table, td, p, a, li, blockquote {
              -webkit-text-size-adjust: 100%;
              -ms-text-size-adjust: 100%;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: rgba(255, 255, 255, 0.9);
              margin: 0;
              padding: 0;
              background-color: rgb(20, 24, 16);
              min-height: 100vh;
              width: 100% !important;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            .email-wrapper {
              max-width: 600px;
              margin: 0 auto;
              background-color: rgb(20, 24, 16);
              padding: 20px;
              box-sizing: border-box;
            }
            body {
              background-color: rgb(20, 24, 16) !important;
            }
            .container {
              background-color: #222b22;
              border-radius: 16px;
              padding: 40px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              border: 1px solid rgba(255, 255, 255, 0.1);
              text-align: center;
              box-sizing: border-box;
            }
            .header {
              margin-bottom: 30px;
            }
            .logo {
              font-size: 28px;
              font-weight: 700;
              color: rgb(129, 255, 0);
              margin-bottom: 10px;
              line-height: 1.2;
            }
            .logo .logo-cv {
              color: rgb(129, 255, 0);
            }
            .logo .logo-circle {
              color: #ffffff;
            }
            h1 {
              color: #ffffff;
              font-size: 24px;
              font-weight: 700;
              margin: 0 0 15px 0;
              line-height: 1.3;
            }
            p {
              color: rgba(255, 255, 255, 0.9);
              font-size: 16px;
              margin: 0 0 15px 0;
              line-height: 1.6;
              word-wrap: break-word;
            }
            .button {
              display: inline-block;
              background-color: rgb(26, 26, 26);
              color: #ffffff;
              padding: 14px 32px;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 700;
              font-size: 16px;
              margin: 20px 0;
              transition: all 0.3s ease;
              min-width: 200px;
              box-sizing: border-box;
            }
            .button:hover {
              background-color: rgb(40, 40, 40);
              transform: scale(1.015);
              box-shadow: 0 4px 12px rgba(129, 255, 0, 0.3);
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid rgba(255, 255, 255, 0.1);
              color: rgba(255, 255, 255, 0.5);
              font-size: 12px;
              line-height: 1.4;
            }
            .footer p {
              margin: 5px 0;
              color: rgba(255, 255, 255, 0.5);
              font-size: 12px;
            }
            .warning {
              background-color: #313a28;
              border: 1px solid rgba(255, 107, 107, 0.3);
              border-radius: 8px;
              padding: 16px;
              margin: 20px 0;
              color: #ff6b6b;
              font-size: 14px;
              line-height: 1.5;
              box-sizing: border-box;
            }
            .warning strong {
              color: #ff6b6b;
            }
            .link-text {
              color: rgb(129, 255, 0);
              word-break: break-all;
              text-decoration: underline;
            }
            
            @media only screen and (max-width: 600px) {
              .email-wrapper {
                padding: 15px;
              }
              .container {
                padding: 24px;
                border-radius: 12px;
              }
              .logo {
                font-size: 24px;
              }
              h1 {
                font-size: 20px;
              }
              p {
                font-size: 14px;
              }
              .button {
                padding: 12px 24px;
                font-size: 14px;
                width: 100%;
                min-width: auto;
                display: block;
                margin: 20px 0;
              }
              .warning {
                padding: 16px;
              }
            }
            
            @media only screen and (max-width: 767px) {
              .container {
                padding: 20px;
              }
              .logo {
                font-size: 22px;
              }
              h1 {
                font-size: 18px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-wrapper">
            <div class="container">
              <div class="header" style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px;">
                  <img src="${logoUrl}" alt="AIResume Logo" width="40" height="40" style="display: block; max-width: 40px; height: auto;">
                </div>
                <p style="color: rgba(255, 255, 255, 0.6); margin: 5px 0 0 0; font-size: 14px; line-height: 1.4;">Professional CV Builder</p>
              </div>
              
              <h1>Sign in to your account</h1>
              <p>Click the button below to sign in to your AIResume account.</p>

              <a href="${url}" class="button">Sign In</a>

              <div class="warning">
                <strong>Security Notice:</strong> This link will expire in 24 hours for your security.
                If you didn't request this sign-in, please ignore this email.
              </div>

              <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${url}" class="link-text">${url}</a>
              </p>

              <div class="footer">
                <p>This email was sent to ${email}</p>
                <p>© 2026 AIResume by Morigrid Labs. All rights reserved.</p>
                <p>www.buildairesume.com</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
      Sign in to AIResume

      Click the following link to sign in to your AIResume account:
      ${url}

      This link will expire in 24 hours for your security.

      If you didn't request this sign-in, please ignore this email.

      ---
      AIResume Team
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
        subject: 'Sign in to AIResume',
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
