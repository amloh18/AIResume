// Email Templates with Custom Color Scheme
// Accent: #78c708, Background: #141810, Card: #1a230f

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

// Base email template with consistent styling
const getBaseTemplate = (title: string, content: string, footerText?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      margin: 0; 
      padding: 0; 
      background-color: #141810; 
      min-height: 100vh;
    }
    .container { 
      max-width: 600px; 
      margin: 0 auto; 
      background-color: #141810; 
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }
    .card { 
      background-color: #1a230f; 
      border-radius: 16px; 
      padding: 40px; 
      text-align: center; 
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
      border: 1px solid #2a3a22;
      max-width: 500px;
      width: 100%;
    }
    .header { 
      margin-bottom: 30px; 
    }
    .header h1 { 
      color: #78c708; 
      margin: 0; 
      font-size: 28px; 
      font-weight: 700; 
    }
    .header p { 
      color: #a0a0a0; 
      margin: 5px 0 0 0; 
      font-size: 14px;
    }
    .title { 
      color: #ffffff; 
      margin: 0 0 15px 0; 
      font-size: 24px; 
      font-weight: 700; 
    }
    .subtitle { 
      color: #a0a0a0; 
      font-size: 16px; 
      margin: 0 0 30px 0; 
      line-height: 1.5;
    }
    .content { 
      color: #e0e0e0; 
      font-size: 16px; 
      line-height: 1.6; 
      margin: 0 0 30px 0;
    }
    .button { 
      background: linear-gradient(135deg, #78c708, #6bb806); 
      color: #141810; 
      padding: 14px 32px; 
      text-decoration: none; 
      border-radius: 8px; 
      display: inline-block; 
      font-weight: 700; 
      font-size: 16px;
      margin: 20px 0;
      transition: all 0.3s ease;
    }
    .button:hover { 
      background: linear-gradient(135deg, #6bb806, #5aa005); 
      transform: translateY(-2px);
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
      background-color: #141810; 
      border: 2px solid #78c708; 
      border-radius: 8px; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-size: 24px; 
      font-weight: 700; 
      color: #78c708; 
      font-family: 'Courier New', monospace;
    }
    .highlight { 
      background-color: #2a3a22; 
      border: 1px solid #78c708; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
    }
    .highlight-text { 
      color: #78c708; 
      font-weight: 700; 
      font-size: 18px;
    }
    .warning { 
      background-color: #2a3a22; 
      border: 1px solid #ff6b6b; 
      border-radius: 8px; 
      padding: 16px; 
      margin: 20px 0; 
    }
    .warning-text { 
      color: #ff6b6b; 
      font-size: 14px; 
      margin: 0; 
      line-height: 1.5;
    }
    .info { 
      background-color: #2a3a22; 
      border: 1px solid #4a90e2; 
      border-radius: 8px; 
      padding: 16px; 
      margin: 20px 0; 
    }
    .info-text { 
      color: #4a90e2; 
      font-size: 14px; 
      margin: 0; 
      line-height: 1.5;
    }
    .footer { 
      margin-top: 40px; 
      text-align: center; 
      color: #a0a0a0; 
      font-size: 12px; 
      line-height: 1.4;
    }
    .coupon-code { 
      background-color: #141810; 
      border: 2px dashed #78c708; 
      border-radius: 8px; 
      padding: 20px; 
      margin: 20px 0; 
    }
    .coupon-text { 
      color: #78c708; 
      font-size: 24px; 
      font-weight: 700; 
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
    }
    .stats { 
      display: flex; 
      justify-content: space-around; 
      margin: 20px 0; 
    }
    .stat { 
      text-align: center; 
    }
    .stat-number { 
      color: #78c708; 
      font-size: 24px; 
      font-weight: 700; 
    }
    .stat-label { 
      color: #a0a0a0; 
      font-size: 12px; 
      margin-top: 5px; 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <h1>CVCircle</h1>
        <p>Professional CV Builder</p>
      </div>
      
      ${content}
      
      <div class="footer">
        <p>©2024 CVCircle. All rights reserved.</p>
        <p>www.cvcircle.io</p>
        ${footerText ? `<p>${footerText}</p>` : ''}
      </div>
    </div>
  </div>
</body>
</html>
`;

// 1. New User Welcome Email
export function getNewUserTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Welcome to CVCircle, ${data.firstName}!</h2>
    <p class="subtitle">Your journey to creating the perfect CV starts here.</p>
    
    <div class="content">
      <p>We're thrilled to have you join our community of professionals who are building their dream careers. CVCircle is designed to help you create stunning, ATS-friendly CVs that get you noticed by employers.</p>
      
      <div class="highlight">
        <p class="highlight-text">🎉 Your account is ready to use!</p>
        <p style="color: #e0e0e0; margin: 10px 0 0 0;">Start building your professional CV in just a few minutes.</p>
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
    <h2 class="title">You've Reached Your Limit</h2>
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
        <ul style="color: #e0e0e0; text-align: left; margin: 15px 0;">
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
    <h2 class="title">🎉 Special Offer Just for You!</h2>
    <p class="subtitle">Exclusive discount on your CVCircle Pro subscription.</p>
    
    <div class="content">
      <p>We've prepared something special for you, ${data.firstName}! As a valued member of our community, you deserve the best deal on professional CV building tools.</p>
      
      <div class="coupon-code">
        <p style="color: #a0a0a0; margin: 0 0 10px 0; font-size: 14px;">Use this code at checkout:</p>
        <div class="coupon-text">${data.couponCode}</div>
        <p style="color: #a0a0a0; margin: 10px 0 0 0; font-size: 12px;">Valid until ${data.expirationDate}</p>
      </div>
      
      <div class="highlight">
        <p class="highlight-text">💰 Save 30% on Pro Plan</p>
        <p style="color: #e0e0e0; margin: 10px 0 0 0;">Get unlimited CVs, premium templates, and advanced features.</p>
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
      
      <p style="color: #a0a0a0; font-size: 14px; margin: 30px 0 0 0;">
        This offer is exclusively for you and expires soon. Don't miss out on building your dream career!
      </p>
    </div>
  `;
  
  return getBaseTemplate('Special Offer - CVCircle', content);
}

// 4. 4-Digit Verification Code Email
export function getVerificationCodeTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Your Verification Code</h2>
    <p class="subtitle">Enter this code to complete your sign-in.</p>
    
    <div class="code-container">
      ${data.code?.split('').map(digit => `<div class="code-digit">${digit}</div>`).join('')}
    </div>
    
    <div class="warning">
      <p class="warning-text">
        This code will expire in <strong>10 minutes</strong>. Do not share this code with anyone.
      </p>
    </div>
    
    <div class="info">
      <p class="info-text">
        <strong>Security Note:</strong> If you didn't request this code, please ignore this email or contact our support team.
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
        <p style="color: #e0e0e0; margin: 10px 0 0 0;">All your personal data has been permanently removed.</p>
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
      
      <p style="color: #a0a0a0; font-size: 14px; margin: 30px 0 0 0;">
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
      
      <p style="color: #a0a0a0; font-size: 14px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.link}" style="color: #78c708; word-break: break-all;">${data.link}</a>
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

      <p style="color: #a0a0a0; font-size: 14px; margin: 30px 0 0 0;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${data.link}" style="color: #78c708; word-break: break-all;">${data.link}</a>
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
        <ul style="color: #e0e0e0; text-align: left; margin: 15px 0;">
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
        <p style="color: #e0e0e0; margin: 10px 0 0 0;">If you received this email, your email configuration is working properly.</p>
      </div>

      <div class="info">
        <p class="info-text">
          <strong>Test completed at:</strong> ${new Date().toLocaleString()}<br>
          <strong>Service:</strong> CVCircle Email System
        </p>
      </div>

      <p style="color: #a0a0a0; font-size: 14px; margin: 30px 0 0 0;">
        This is an automated test message. No action is required.
      </p>
    </div>
  `;

  return getBaseTemplate('Test Email - CVCircle', content);
}
