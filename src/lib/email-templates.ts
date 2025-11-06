// Email Templates with Custom Color Scheme
// Background: rgb(20, 24, 16), Card: #222b22, Inner boxes: #313a28, Accent: rgb(129, 255, 0), Button Background: rgb(26, 26, 26)

// Get base URL for email images (absolute URLs required for emails)
const getEmailImageUrl = (path: string) => {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.cvcircle.io';
  // Remove trailing slash if present
  const cleanBaseUrl = baseUrl.replace(/\/$/, '');
  // Ensure path starts with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBaseUrl}${cleanPath}`;
};

export interface EmailTemplateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  code?: string;
  link?: string;
  couponCode?: string;
  planName?: string;
  usageLimit?: number;
  currentUsage?: number;
  expirationDate?: string;
  daysLeft?: number;
}

// Base email template with consistent styling - Table-based for email client compatibility
const getBaseTemplate = (title: string, content: string, footerText?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <style>
    /* Reset styles for email clients */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      outline: none;
      text-decoration: none;
    }
    
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: rgb(20, 24, 16) !important;
      width: 100% !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .header { 
      margin-bottom: 30px; 
    }
    .header h1 { 
      color: rgb(129, 255, 0) !important; 
      margin: 0; 
      font-size: 28px; 
      font-weight: 700; 
      line-height: 1.2;
    }
    .header p { 
      color: rgba(255, 255, 255, 0.6) !important; 
      margin: 5px 0 0 0; 
      font-size: 14px;
      line-height: 1.4;
    }
    .title { 
      color: #ffffff !important; 
      margin: 0 0 15px 0; 
      font-size: 24px; 
      font-weight: 700; 
      line-height: 1.3;
    }
    .subtitle { 
      color: rgba(255, 255, 255, 0.7) !important; 
      font-size: 16px; 
      margin: 0 0 30px 0; 
      line-height: 1.5;
    }
    .content { 
      color: rgba(255, 255, 255, 0.9) !important; 
      font-size: 16px; 
      line-height: 1.6; 
      margin: 0 0 30px 0;
    }
    .content p {
      margin: 0 0 15px 0;
      word-wrap: break-word;
      color: rgba(255, 255, 255, 0.9) !important;
    }
    .button { 
      background-color: rgb(26, 26, 26) !important;
      color: #ffffff !important; 
      padding: 14px 32px; 
      text-decoration: none; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: 700; 
      font-size: 16px;
      margin: 20px 0;
      transition: all 0.3s ease;
      min-width: 200px;
      box-sizing: border-box;
    }
    .button:hover { 
      background-color: rgb(40, 40, 40) !important;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(129, 255, 0, 0.3);
    }
    .code-container { 
      display: flex; 
      justify-content: center; 
      gap: 12px; 
      margin: 30px 0; 
      flex-wrap: wrap;
    }
    .code-digit { 
      width: 60px; 
      height: 60px; 
      background-color: #313a28 !important; 
      border: 1px solid rgba(255, 255, 255, 0.1) !important; 
      border-radius: 8px; 
      display: inline-flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 24px; 
      font-weight: 700; 
      color: rgb(129, 255, 0) !important; 
      font-family: 'Courier New', monospace;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .highlight { 
      background-color: #313a28 !important; 
      border: 1px solid rgba(255, 255, 255, 0.1) !important; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
      box-sizing: border-box;
    }
    .highlight-text { 
      color: rgb(129, 255, 0) !important; 
      font-weight: 700; 
      font-size: 18px;
      margin: 0 0 10px 0;
    }
    .warning { 
      background-color: #313a28 !important; 
      border: 1px solid rgba(255, 107, 107, 0.3) !important; 
      border-radius: 8px; 
      padding: 16px; 
      margin: 20px 0; 
      box-sizing: border-box;
    }
    .warning-text { 
      color: #ff6b6b !important; 
      font-size: 14px; 
      margin: 0; 
      line-height: 1.5;
    }
    .info { 
      background-color: #313a28 !important; 
      border: 1px solid rgba(74, 144, 226, 0.3) !important; 
      border-radius: 8px; 
      padding: 16px; 
      margin: 20px 0; 
      box-sizing: border-box;
    }
    .info-text { 
      color: #4a90e2 !important; 
      font-size: 14px; 
      margin: 0; 
      line-height: 1.5;
    }
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      color: rgba(255, 255, 255, 0.5) !important; 
      font-size: 12px; 
      line-height: 1.4;
    }
    .footer p {
      margin: 5px 0;
      color: rgba(255, 255, 255, 0.5) !important;
    }
    .coupon-code { 
      background-color: #313a28 !important; 
      border: 1px solid rgba(255, 255, 255, 0.1) !important; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
      box-sizing: border-box;
    }
    .coupon-text { 
      color: rgb(129, 255, 0) !important; 
      font-size: 24px; 
      font-weight: 700; 
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      margin: 10px 0;
      word-break: break-all;
    }
    .stats { 
      display: flex; 
      justify-content: space-around; 
      margin: 20px 0; 
      flex-wrap: wrap;
      gap: 15px;
    }
    .stat { 
      text-align: center; 
      flex: 1;
      min-width: 80px;
    }
    .stat-number { 
      color: rgb(129, 255, 0) !important; 
      font-size: 24px; 
      font-weight: 700; 
      line-height: 1.2;
    }
    .stat-label { 
      color: rgba(255, 255, 255, 0.6) !important; 
      font-size: 12px; 
      margin-top: 5px; 
      line-height: 1.3;
    }
    .link-text {
      color: rgb(129, 255, 0) !important;
      word-break: break-all;
      text-decoration: underline;
    }
    
    /* Responsive styles for mobile */
    @media only screen and (max-width: 600px) {
      .container {
        padding: 15px;
      }
      .card {
        padding: 24px;
        border-radius: 12px;
      }
      .header h1 {
        font-size: 24px;
      }
      .title {
        font-size: 20px;
      }
      .subtitle {
        font-size: 14px;
      }
      .content {
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
      .code-container {
        gap: 8px;
      }
      .code-digit {
        width: 50px;
        height: 50px;
        font-size: 20px;
      }
      .stats {
        flex-direction: column;
        gap: 20px;
      }
      .stat {
        min-width: 100%;
      }
      .coupon-text {
        font-size: 20px;
      }
      .highlight, .warning, .info {
        padding: 16px;
      }
    }
    
    @media only screen and (max-width: 480px) {
      .card {
        padding: 20px;
      }
      .code-digit {
        width: 45px;
        height: 45px;
        font-size: 18px;
      }
      .header h1 {
        font-size: 22px;
      }
      .title {
        font-size: 18px;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: rgb(20, 24, 16); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <!-- Outer table wrapper for background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgb(20, 24, 16); margin: 0; padding: 20px;">
    <tr>
      <td align="center" style="padding: 0;">
        <!-- Main card container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #222b22; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #222b22;">
              <!-- Header -->
              <div style="margin-bottom: 30px;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px;">
                  <img src="${getEmailImageUrl('/images/logo.png')}" alt="CVCircle Logo" width="40" height="40" style="display: block; max-width: 40px; height: auto;">
                  <h1 style="margin: 0; font-size: 28px; font-weight: 700; line-height: 1.2;">
                    <span style="color: rgb(129, 255, 0);">CV</span><span style="color: #ffffff;">Circle</span>
                  </h1>
                </div>
                <p style="color: rgba(255, 255, 255, 0.6); margin: 5px 0 0 0; font-size: 14px; line-height: 1.4;">Professional CV Builder</p>
              </div>
              
              ${content}
              
              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 12px; line-height: 1.4; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">©2024 CVCircle. All rights reserved.</p>
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">www.cvcircle.io</p>
                ${footerText ? `<p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">${footerText}</p>` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// 1. New User Welcome Email
export function getNewUserTemplate(data: EmailTemplateData) {
  const content = `
    <div style="margin-bottom: 20px;">
      <img src="https://www.cvcircle.io/images/one_click_career_kit.png" alt="One-Click Career Kit" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
    </div>
    <h2 class="title">One-Click Career Kit</h2>
    <h2 class="title" style="margin-top: 0;">Welcome to CVCircle, ${data.firstName}!</h2>
    <p class="subtitle">Your journey to creating the perfect CV starts here.</p>
    
    <div class="content">
      <p>We're thrilled to have you join our community of professionals who are building their dream careers. CVCircle is designed to help you create stunning, ATS-friendly CVs that get you noticed by employers.</p>
      
      <div class="highlight">
        <p class="highlight-text">🎉 Your account is ready to use!</p>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Start building your professional CV in just a few minutes.</p>
      </div>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">5</div>
          <div class="stat-label">Professional Templates</div>
        </div>
        <div class="stat">
          <div class="stat-number">∞</div>
          <div class="stat-label">Unlimited Edits</div>
        </div>
        <div class="stat">
          <div class="stat-number">ATS</div>
          <div class="stat-label">Optimized</div>
        </div>
      </div>
      
      <a href="https://www.cvcircle.io/dashboard" class="button">Start Building Your CV</a>
      
      <div class="info">
        <p class="info-text">
          <strong>Quick Start Guide:</strong><br>
          1. Choose from our professional templates<br>
          2. Fill in your information<br>
          3. Customize the design to match your style<br>
          4. Download and start applying!
        </p>
      </div>
    </div>
  `;
  
  return getBaseTemplate('Welcome to CVCircle', content);
}

// 2. Limit Exhausted (Upgrade) Email
export function getLimitExhaustedTemplate(data: EmailTemplateData) {
  const content = `
    <div style="margin-bottom: 20px;">
      <img src="https://www.cvcircle.io/images/onboarding/extension-tracker.svg" alt="Never Miss a Role" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border-radius: 8px; filter: brightness(0) invert(1);">
    </div>
    <h2 class="title">Never Miss a Role</h2>
    <h2 class="title" style="margin-top: 0;">You've Reached Your Limit</h2>
    <p class="subtitle">Don't let limits hold back your career success.</p>
    
    <div class="content">
      <p>You've used all ${data.usageLimit} CVs in your current plan. It's time to upgrade and unlock unlimited possibilities!</p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">${data.currentUsage}</div>
          <div class="stat-label">CVs Created</div>
        </div>
        <div class="stat">
          <div class="stat-number">${data.usageLimit}</div>
          <div class="stat-label">Your Limit</div>
        </div>
        <div class="stat">
          <div class="stat-number">∞</div>
          <div class="stat-label">With Pro</div>
        </div>
      </div>
      
      <div class="highlight">
        <p class="highlight-text">🚀 Upgrade to Pro and get:</p>
        <ul style="color: rgba(255, 255, 255, 0.9); text-align: left; margin: 15px 0;">
          <li>Unlimited CV creation</li>
          <li>Premium templates</li>
          <li>Advanced ATS optimization</li>
          <li>Priority support</li>
          <li>Cover letter generator</li>
        </ul>
      </div>
      
      <a href="https://www.cvcircle.io/dashboard?upgrade=true" class="button">Upgrade to Pro Now</a>
      
      <div class="warning">
        <p class="warning-text">
          <strong>Limited Time:</strong> Upgrade in the next 24 hours and save 20% on your first year!
        </p>
      </div>
    </div>
  `;
  
  return getBaseTemplate('Upgrade Your CVCircle Plan', content);
}

// 3. Special Offers (Coupon Code) Email
export function getSpecialOffersTemplate(data: EmailTemplateData) {
  const content = `
    <div style="margin-bottom: 20px;">
      <img src="https://www.cvcircle.io/images/gain_your_edge.png" alt="Gain Your Edge" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
    </div>
    <h2 class="title">Gain Your Edge</h2>
    <h2 class="title" style="margin-top: 0;">🎉 Special Offer Just for You!</h2>
    <p class="subtitle">Exclusive discount on your CVCircle Pro subscription.</p>
    
    <div class="content">
      <p>We've prepared something special for you, ${data.firstName}! As a valued member of our community, you deserve the best deal on professional CV building tools.</p>
      
      <div class="coupon-code">
        <p style="color: rgba(255, 255, 255, 0.6); margin: 0 0 10px 0; font-size: 14px;">Use this code at checkout:</p>
        <div class="coupon-text">${data.couponCode}</div>
        <p style="color: rgba(255, 255, 255, 0.6); margin: 10px 0 0 0; font-size: 12px;">Valid until ${data.expirationDate}</p>
      </div>
      
      <div class="highlight">
        <p class="highlight-text">💰 Save 30% on Pro Plan</p>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Get unlimited CVs, premium templates, and advanced features.</p>
      </div>
      
      <a href="https://www.cvcircle.io/dashboard?coupon=${data.couponCode}" class="button">Claim Your Discount</a>
      
      <div class="info">
        <p class="info-text">
          <strong>What's included in Pro:</strong><br>
          • Unlimited CV creation and downloads<br>
          • 15+ premium templates<br>
          • Advanced ATS optimization<br>
          • Cover letter generator<br>
          • Priority customer support
        </p>
      </div>
      
      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        This offer is exclusively for you and expires soon. Don't miss out on building your dream career!
      </p>
    </div>
  `;
  
  return getBaseTemplate('Special Offer - CVCircle', content);
}

// 4. 4-Digit Verification Code Email
export function getVerificationCodeTemplate(data: EmailTemplateData) {
  const content = `
    <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; line-height: 1.3;">Your Verification Code</h2>
    <p style="color: rgba(255, 255, 255, 0.7); font-size: 16px; margin: 0 0 30px 0; line-height: 1.5;">Enter this code to complete your sign-in.</p>
    
    <div style="display: flex; justify-content: center; gap: 12px; margin: 30px 0; flex-wrap: wrap;">
      ${data.code?.split('').map(digit => `
        <div style="width: 60px; height: 60px; background-color: #313a28; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: rgb(129, 255, 0); font-family: 'Courier New', monospace; box-sizing: border-box;">
          ${digit}
        </div>
      `).join('')}
    </div>
    
    <div style="background-color: #313a28; border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; box-sizing: border-box;">
      <p style="color: #ff6b6b; font-size: 14px; margin: 0; line-height: 1.5;">
        This code will expire in <strong style="color: #ff6b6b;">10 minutes</strong>. Do not share this code with anyone.
      </p>
    </div>
    
    <div style="background-color: #313a28; border: 1px solid rgba(74, 144, 226, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; box-sizing: border-box;">
      <p style="color: #4a90e2; font-size: 14px; margin: 0; line-height: 1.5;">
        <strong style="color: #4a90e2;">Security Note:</strong> If you didn't request this code, please ignore this email or contact our support team.
      </p>
    </div>
  `;
  
  return getBaseTemplate('Verification Code - CVCircle', content);
}

// 5. Account Deletion Email
export function getAccountDeletionTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Account Deletion Confirmation</h2>
    <p class="subtitle">Your CVCircle account has been successfully deleted.</p>
    
    <div class="content">
      <p>We're sorry to see you go, ${data.firstName}. Your account and all associated data have been permanently removed from our systems.</p>
      
      <div class="highlight">
        <p class="highlight-text">✅ Account Deleted Successfully</p>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">All your personal data has been permanently removed.</p>
      </div>
      
      <div class="info">
        <p class="info-text">
          <strong>What was deleted:</strong><br>
          • Your account profile and settings<br>
          • All created CVs and templates<br>
          • Personal information and preferences<br>
          • Usage history and analytics
        </p>
      </div>
      
      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        If you change your mind, you can always create a new account at any time. We'd love to have you back!
      </p>
      
      <a href="https://www.cvcircle.io/sign-up" class="button">Create New Account</a>
    </div>
  `;
  
  return getBaseTemplate('Account Deleted - CVCircle', content, 'If you have any questions, please contact our support team.');
}

// 6. Email Verification Template
export function getEmailVerificationTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Verify Your Email Address</h2>
    <p class="subtitle">Click the button below to complete your account setup.</p>
    
    <div class="content">
      <p>Welcome to CVCircle, ${data.firstName}! To get started with creating your professional CV, please verify your email address.</p>
      
      <a href="${data.link}" class="button">Verify Email Address</a>
      
      <div class="info">
        <p class="info-text">
          <strong>What happens next?</strong><br>
          Once verified, you'll have full access to create unlimited professional CVs with our premium templates.
        </p>
      </div>
      
      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.link}" class="link-text">${data.link}</a>
      </p>
    </div>
  `;
  
  return getBaseTemplate('Verify Your Email - CVCircle', content);
}

// 7. Password Reset Template
export function getPasswordResetTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Reset Your Password</h2>
    <p class="subtitle">Click the button below to set a new password for your account.</p>

    <div class="content">
      <p>We received a request to reset your password for your CVCircle account. If you made this request, click the button below to set a new password.</p>

      <a href="${data.link}" class="button">Reset Password</a>

      <div class="warning">
        <p class="warning-text">
          <strong>Security Alert:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email.
        </p>
      </div>

      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.link}" class="link-text">${data.link}</a>
      </p>
    </div>
  `;

  return getBaseTemplate('Reset Your Password - CVCircle', content);
}

// 8. Welcome Email Template (alias for new user template)
export function getWelcomeEmailTemplate(data: EmailTemplateData) {
  return getNewUserTemplate(data);
}

// 9. Membership Reminder Template
export function getMembershipReminderTemplate(data: EmailTemplateData) {
  const daysText = data.daysLeft === 1 ? 'day' : 'days';
  const content = `
    <h2 class="title">Membership Expiring Soon</h2>
    <p class="subtitle">Don't lose access to your premium CVCircle features.</p>

    <div class="content">
      <p>Hi ${data.firstName}, your CVCircle membership will expire in ${data.daysLeft} ${daysText}. Renew now to continue enjoying all premium features!</p>

      <div class="highlight">
        <p class="highlight-text">🎯 What you'll lose without membership:</p>
        <ul style="color: rgba(255, 255, 255, 0.9); text-align: left; margin: 15px 0;">
          <li>Unlimited CV creation</li>
          <li>Premium templates</li>
          <li>Advanced ATS optimization</li>
          <li>Priority support</li>
          <li>Cover letter generator</li>
        </ul>
      </div>

      <div class="stats">
        <div class="stat">
          <div class="stat-number">${data.daysLeft}</div>
          <div class="stat-label">${daysText} left</div>
        </div>
        <div class="stat">
          <div class="stat-number">∞</div>
          <div class="stat-label">CVs with Pro</div>
        </div>
        <div class="stat">
          <div class="stat-number">15+</div>
          <div class="stat-label">Templates</div>
        </div>
      </div>

      <a href="https://www.cvcircle.io/dashboard?renew=true" class="button">Renew Membership</a>

      <div class="warning">
        <p class="warning-text">
          <strong>Urgent:</strong> Your membership expires on ${data.expirationDate}. Renew before then to avoid service interruption.
        </p>
      </div>
    </div>
  `;

  return getBaseTemplate('Membership Expiring Soon - CVCircle', content);
}

// 10. Test Email Template
export function getTestEmailTemplate() {
  const content = `
    <h2 class="title">Test Email</h2>
    <p class="subtitle">This is a test email from CVCircle.</p>

    <div class="content">
      <p>This email confirms that your CVCircle email service is working correctly.</p>

      <div class="highlight">
        <p class="highlight-text">✅ Email service is operational</p>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">If you received this email, your email configuration is working properly.</p>
      </div>

      <div class="info">
        <p class="info-text">
          <strong>Test completed at:</strong> ${new Date().toLocaleString()}<br>
          <strong>Service:</strong> CVCircle Email System
        </p>
      </div>

      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        This is an automated test message. No action is required.
      </p>
    </div>
  `;

  return getBaseTemplate('Test Email - CVCircle', content);
}
