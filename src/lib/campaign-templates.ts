// Campaign Templates matching CVCircle email theme
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

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'newsletter' | 'promotional' | 'announcement' | 'transactional' | 'automated';
  scenario: string;
  subjectTemplate: string;
  previewText?: string;
  htmlContent: string;
  defaultFromName?: string;
  defaultFromEmail?: string;
  defaultReplyTo?: string;
  suggestedFilters?: any;
  variables: string[];
  thumbnail?: string;
}

// Base template function matching CVCircle email theme
const getBaseEmailTemplate = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>CVCircle</title>
  <style>
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
    @media only screen and (max-width: 600px) {
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
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: rgb(20, 24, 16); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgb(20, 24, 16); margin: 0; padding: 20px;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #222b22; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #222b22;">
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
              
              <div style="margin-top: 40px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 12px; line-height: 1.4; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">©2024 CVCircle. All rights reserved.</p>
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">www.cvcircle.io</p>
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

export const campaignTemplates: CampaignTemplate[] = [
  {
    id: 'welcome-new-users',
    name: 'Welcome New Users',
    description: 'Welcome email for new users with onboarding tips and feature highlights',
    category: 'marketing',
    scenario: 'user_onboarding',
    subjectTemplate: 'Welcome to CVCircle, {{firstName}}! 🎉',
    previewText: 'Start creating professional CVs in minutes',
    htmlContent: getBaseEmailTemplate(`
      <div style="margin-bottom: 20px;">
        <img src="https://www.cvcircle.io/images/one_click_career_kit.png" alt="One-Click Career Kit" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
      </div>
      <h2 class="title">One-Click Career Kit</h2>
      <h2 class="title" style="margin-top: 0;">Welcome to CVCircle, {{firstName}}!</h2>
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
    `),
    defaultFromName: 'CVCircle Team',
    defaultFromEmail: 'noreply@cvcircle.io',
    suggestedFilters: {
      userAge: {
        type: 'new_users',
        days: 1
      }
    },
    variables: ['firstName', 'lastName']
  },
  {
    id: 'product-launch',
    name: 'Product Launch Announcement',
    description: 'Announce new features or product updates to your user base',
    category: 'announcement',
    scenario: 'product_launch',
    subjectTemplate: '🎉 Exciting New Features Available!',
    previewText: 'Discover what\'s new in CVCircle',
    htmlContent: getBaseEmailTemplate(`
      <h2 class="title">New Features Available!</h2>
      <p class="subtitle">We've been working hard to make CVCircle even better.</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>We're excited to share some amazing new features that will help you create even better CVs:</p>
        
        <div class="highlight">
          <p class="highlight-text">✨ What's New:</p>
          <ul style="color: rgba(255, 255, 255, 0.9); text-align: left; margin: 15px 0; padding-left: 20px;">
            <li>Enhanced AI-powered suggestions</li>
            <li>New professional templates</li>
            <li>Improved export options</li>
            <li>Better mobile experience</li>
          </ul>
        </div>
        
        <a href="https://www.cvcircle.io/dashboard" class="button">Try It Now</a>
        
        <div class="info">
          <p class="info-text">
            <strong>Pro Tip:</strong> These new features are available to all users. Upgrade to Pro for even more advanced capabilities!
          </p>
        </div>
      </div>
    `),
    variables: ['firstName']
  },
  {
    id: 'seasonal-promotion',
    name: 'Seasonal Sale Promotion',
    description: 'Promotional email for seasonal sales and special discounts',
    category: 'promotional',
    scenario: 'seasonal_sale',
    subjectTemplate: '{{couponCode}}: {{discountPercent}}% Off - Limited Time!',
    previewText: 'Don\'t miss out on this exclusive offer',
    htmlContent: getBaseEmailTemplate(`
      <div style="margin-bottom: 20px;">
        <img src="https://www.cvcircle.io/images/gain_your_edge.png" alt="Gain Your Edge" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
      </div>
      <h2 class="title">Gain Your Edge</h2>
      <h2 class="title" style="margin-top: 0;">🎉 Special Offer Just For You!</h2>
      <p class="subtitle">Exclusive discount on your CVCircle Pro subscription.</p>
      
      <div class="content">
        <p>We've prepared something special for you, {{firstName}}! As a valued member of our community, you deserve the best deal on professional CV building tools.</p>
        
        <div class="coupon-code">
          <p style="color: rgba(255, 255, 255, 0.6); margin: 0 0 10px 0; font-size: 14px;">Use this code at checkout:</p>
          <div class="coupon-text">{{couponCode}}</div>
          <p style="color: rgba(255, 255, 255, 0.6); margin: 10px 0 0 0; font-size: 12px;">Valid until {{expirationDate}}</p>
        </div>
        
        <div class="highlight">
          <p class="highlight-text">💰 Save {{discountPercent}}% on Pro Plan</p>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Get unlimited CVs, premium templates, and advanced features.</p>
        </div>
        
        <a href="https://www.cvcircle.io/pricing?coupon={{couponCode}}" class="button">Claim Your Discount</a>
        
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
      </div>
    `),
    variables: ['firstName', 'couponCode', 'discountPercent', 'expirationDate']
  },
  {
    id: 'feature-announcement',
    name: 'Feature Announcement',
    description: 'Announce specific new features or improvements',
    category: 'announcement',
    scenario: 'feature_update',
    subjectTemplate: 'New: {{featureName}} is Now Available!',
    previewText: 'See what\'s changed and how it helps you',
    htmlContent: getBaseEmailTemplate(`
      <h2 class="title">Introducing {{featureName}}</h2>
      <p class="subtitle">A powerful new feature that makes creating your CV even easier!</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>We're excited to announce a powerful new feature that will make creating your CV even easier!</p>
        
        <div class="highlight" style="border: 2px solid rgb(129, 255, 0);">
          <p class="highlight-text">{{featureName}}</p>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">{{featureDescription}}</p>
        </div>
        
        <a href="https://www.cvcircle.io/dashboard" class="button">Try It Now</a>
        
        <div class="info">
          <p class="info-text">
            <strong>How to use it:</strong><br>
            Simply navigate to your dashboard and look for the new {{featureName}} option. It's that easy!
          </p>
        </div>
      </div>
    `),
    variables: ['firstName', 'featureName', 'featureDescription']
  },
  {
    id: 're-engagement',
    name: 'Re-engagement Campaign',
    description: 'Re-engage inactive users with personalized content',
    category: 'marketing',
    scenario: 'user_reactivation',
    subjectTemplate: 'We miss you, {{firstName}}!',
    previewText: 'Come back and continue your journey',
    htmlContent: getBaseEmailTemplate(`
      <h2 class="title">We Miss You!</h2>
      <p class="subtitle">It's been a while since you last visited CVCircle.</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>It's been a while since you last visited CVCircle. We've been working on some amazing improvements and would love to have you back!</p>
        
        <div class="highlight">
          <p class="highlight-text">What you've been missing:</p>
          <ul style="color: rgba(255, 255, 255, 0.9); text-align: left; margin: 15px 0; padding-left: 20px;">
            <li>New professional templates</li>
            <li>Enhanced AI features</li>
            <li>Better export options</li>
            <li>Improved mobile experience</li>
          </ul>
        </div>
        
        <a href="https://www.cvcircle.io/dashboard" class="button">Return to CVCircle</a>
        
        <div class="info">
          <p class="info-text">
            <strong>Your account is still active:</strong> All your CVs and data are safe and waiting for you. Log back in anytime!
          </p>
        </div>
      </div>
    `),
    suggestedFilters: {
      lastActiveRange: {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    variables: ['firstName']
  },
  {
    id: 'upgrade-reminder',
    name: 'Upgrade Reminder',
    description: 'Encourage free users to upgrade to premium plans',
    category: 'promotional',
    scenario: 'upgrade_reminder',
    subjectTemplate: 'Unlock Premium Features - {{firstName}}',
    previewText: 'See what you\'re missing with Premium',
    htmlContent: getBaseEmailTemplate(`
      <div style="margin-bottom: 20px;">
        <img src="https://www.cvcircle.io/images/onboarding/extension-tracker.svg" alt="Never Miss a Role" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border-radius: 8px; filter: brightness(0) invert(1);">
      </div>
      <h2 class="title">Never Miss a Role</h2>
      <h2 class="title" style="margin-top: 0;">Unlock Your Full Potential</h2>
      <p class="subtitle">You're currently on our Free plan. Upgrade to Premium to unlock powerful features!</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>You're currently on our Free plan. Upgrade to Premium to unlock powerful features:</p>
        
        <div class="highlight">
          <p class="highlight-text">🚀 Premium Benefits:</p>
          <ul style="color: rgba(255, 255, 255, 0.9); text-align: left; margin: 15px 0; padding-left: 20px;">
            <li>✅ Unlimited CVs</li>
            <li>✅ All premium templates</li>
            <li>✅ Advanced AI features</li>
            <li>✅ Priority support</li>
            <li>✅ Cover letter generator</li>
          </ul>
        </div>
        
        <a href="https://www.cvcircle.io/pricing" class="button">Upgrade Now</a>
        
        <div class="warning">
          <p class="warning-text">
            <strong>Limited Time:</strong> Upgrade in the next 24 hours and save 20% on your first year!
          </p>
        </div>
      </div>
    `),
    suggestedFilters: {
      membershipPlans: ['free']
    },
    variables: ['firstName']
  },
  {
    id: 'monthly-newsletter',
    name: 'Monthly Newsletter',
    description: 'Monthly update newsletter with tips, features, and community highlights',
    category: 'newsletter',
    scenario: 'monthly_update',
    subjectTemplate: 'CVCircle Monthly Update - {{monthName}}',
    previewText: 'Tips, updates, and highlights from this month',
    htmlContent: getBaseEmailTemplate(`
      <h2 class="title">CVCircle Monthly Update</h2>
      <p class="subtitle">Here's what's been happening at CVCircle this month.</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>Here's what's been happening at CVCircle this month:</p>
        
        <h3 style="color: rgb(129, 255, 0); font-size: 20px; margin: 20px 0 10px 0;">📰 What's New</h3>
        <div class="highlight">
          <p style="color: rgba(255, 255, 255, 0.9); margin: 0;">{{newsletterContent}}</p>
        </div>
        
        <h3 style="color: rgb(129, 255, 0); font-size: 20px; margin: 20px 0 10px 0;">💡 Pro Tips</h3>
        <div class="info">
          <p class="info-text">{{proTips}}</p>
        </div>
        
        <a href="https://www.cvcircle.io/dashboard" class="button">Visit Dashboard</a>
      </div>
    `),
    variables: ['firstName', 'monthName', 'newsletterContent', 'proTips']
  },
  {
    id: 'abandoned-trial',
    name: 'Abandoned Trial Reminder',
    description: 'Remind users who started but didn\'t complete their trial',
    category: 'automated',
    scenario: 'trial_reminder',
    subjectTemplate: 'Complete Your CVCircle Setup, {{firstName}}',
    previewText: 'You\'re just a few steps away from your perfect CV',
    htmlContent: getBaseEmailTemplate(`
      <h2 class="title">Don't Give Up Yet!</h2>
      <p class="subtitle">You're just a few steps away from your perfect CV.</p>
      
      <div class="content">
        <p>Hi {{firstName}},</p>
        <p>We noticed you started creating your CV but didn't finish. Let's get you back on track!</p>
        
        <div class="highlight" style="background-color: #313a28; border: 1px solid rgba(129, 255, 0, 0.3);">
          <p class="highlight-text">You're {{completionPercentage}}% done!</p>
          <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Just a few more steps and your professional CV will be ready.</p>
        </div>
        
        <a href="https://www.cvcircle.io/dashboard" class="button">Continue Your CV</a>
        
        <div class="info">
          <p class="info-text">
            <strong>Need help?</strong> Our support team is here to assist you. Reply to this email or visit our help center.
          </p>
        </div>
      </div>
    `),
    variables: ['firstName', 'completionPercentage']
  }
];

export function getCampaignTemplateById(id: string): CampaignTemplate | undefined {
  return campaignTemplates.find(t => t.id === id);
}

export function getCampaignTemplatesByCategory(category: string): CampaignTemplate[] {
  if (category === 'all') return campaignTemplates;
  return campaignTemplates.filter(t => t.category === category);
}

export function getCampaignTemplatesByScenario(scenario: string): CampaignTemplate[] {
  return campaignTemplates.filter(t => t.scenario === scenario);
}

