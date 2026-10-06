// Email Templates with Custom Color Scheme
// Background: rgb(20, 24, 16), Card: #222b22, Inner boxes: #313a28, Accent: rgb(129, 255, 0), Button Background: rgb(26, 26, 26)

// ---------------------------------------------------------------------------
// Brand + link configuration
//
// Everything a template needs about "who we are" and "where we link to" is derived
// here instead of being typed into each template. Previously the product name appeared
// as both "AIResume" and "BuildAIResume", the copyright year was frozen at 2026, and
// every CTA pointed at a literal https://buildairesume.com/... string.
// ---------------------------------------------------------------------------

/** App origin, without a trailing slash. Used for images and all CTA links. */
export const getEmailBaseUrl = (): string => {
  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'https://buildairesume.com';
  return base.replace(/\/$/, '');
};

/** Absolute URL for an in-app path. */
export const emailUrl = (path = '/'): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${getEmailBaseUrl()}${cleanPath}`;
};

export const EMAIL_BRAND = {
  productName: process.env.EMAIL_BRAND_NAME || 'BuildAIResume',
  legalName: process.env.EMAIL_BRAND_LEGAL_ENTITY || 'Morigrid Labs',
  tagline: process.env.EMAIL_BRAND_TAGLINE || 'Professional CV Builder',
  domain: process.env.EMAIL_BRAND_DOMAIN || 'buildairesume.com',
  get supportEmail(): string {
    return process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || `support@${this.domain}`;
  },
  /** Current year, so the footer never goes stale. */
  get year(): number {
    return new Date().getFullYear();
  },
};

/** Get base URL for email images (absolute URLs required for emails) */
const getEmailImageUrl = (path: string) => emailUrl(path);

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

  // --- verification-code context ---
  /** Why the code was issued. Drives the copy — never assume "sign-in". */
  purpose?: VerificationPurpose;
  /** Minutes until the code expires. Must match the issuing session's TTL. */
  expiryMinutes?: number;
  /** Failed attempts allowed before the code is destroyed. */
  maxAttempts?: number;
  /** When the code was requested, surfaced so an unexpected request is obvious. */
  requestedAt?: Date | string;
  /** Optional request context (device / IP) for the "was this you?" line. */
  device?: string;
  ipAddress?: string;
  /** True when this code is confirming 2FA setup rather than a sign-in. */
  isSetup?: boolean;
}

export type VerificationPurpose =
  | 'email-verification'
  | 'passwordless-login'
  | 'password-reset'
  | 'two-factor-login'
  | 'two-factor-setup';

/**
 * Per-purpose copy for verification-code emails.
 *
 * This is the single source of truth for what a code email says. The code email used to
 * render one hardcoded headline ("Your Verification Code" / "Enter this code to complete
 * your sign-in.") for every purpose, so a password-reset email and a 2FA email both told
 * the user they were signing in.
 */
const VERIFICATION_COPY: Record<
  VerificationPurpose,
  { subject: string; title: string; subtitle: string; action: string; reason: string; ctaLabel: string; ctaPath: string }
> = {
  'email-verification': {
    subject: 'Confirm your email address',
    title: 'Confirm your email address',
    subtitle: 'One code and your account is ready to go.',
    action: 'confirm your email address',
    reason: 'create your account',
    ctaLabel: 'Continue setting up your account',
    ctaPath: '/auth/verify-email',
  },
  'passwordless-login': {
    subject: 'Your sign-in code',
    title: 'Sign in to your account',
    subtitle: 'No password needed — just this code.',
    action: 'sign in to your account',
    reason: 'sign in',
    ctaLabel: 'Open your dashboard',
    ctaPath: '/dashboard',
  },
  'password-reset': {
    subject: 'Your password reset code',
    title: 'Reset your password',
    subtitle: 'Enter this code to choose a new password.',
    action: 'reset your password',
    reason: 'reset your password',
    ctaLabel: 'Reset your password',
    ctaPath: '/auth/reset-password',
  },
  'two-factor-login': {
    subject: 'Your two-factor sign-in code',
    title: 'Confirm it\u2019s you',
    subtitle: 'Two-factor authentication is on, so we need one more step.',
    action: 'finish signing in',
    reason: 'sign in',
    ctaLabel: 'Finish signing in',
    ctaPath: '/dashboard',
  },
  'two-factor-setup': {
    subject: 'Confirm two-factor authentication',
    title: 'Turn on two-factor authentication',
    subtitle: 'Enter this code to confirm your setup.',
    action: 'turn on two-factor authentication',
    reason: 'turn on two-factor authentication',
    ctaLabel: 'Return to security settings',
    ctaPath: '/dashboard/settings',
  },
};

/** Default expiry used only when the caller does not state one. */
const DEFAULT_CODE_EXPIRY_MINUTES = 10;

/**
 * Resolve the copy for a verification purpose. Exported so the sending service can build
 * the subject line and the plain-text alternative from the same source as the HTML —
 * otherwise the three drift apart, which is how the plain-text part ended up telling
 * password-reset recipients to "complete your sign in".
 */
export const getVerificationCopy = (purpose: VerificationPurpose = 'passwordless-login') =>
  VERIFICATION_COPY[purpose] ?? VERIFICATION_COPY['passwordless-login'];

/** Resolve the effective purpose, folding the 2FA setup case in. */
export const resolveVerificationPurpose = (
  purpose: VerificationPurpose = 'passwordless-login',
  isSetup?: boolean
): VerificationPurpose =>
  purpose === 'two-factor-login' && isSetup ? 'two-factor-setup' : purpose;

/** Escape untrusted values before interpolating them into HTML. */
const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Greeting line. Falls back to a neutral greeting rather than rendering
 * "Hi undefined," when the caller has no name to hand.
 */
const greeting = (firstName?: string): string => {
  const name = firstName?.trim();
  return name ? `Hi ${escapeHtml(name)},` : 'Hello,';
};

/**
 * Name for use inline in a sentence, e.g. "Hi Amloh, your membership…".
 * Falls back to "there" so we never print "undefined".
 */
const displayName = (firstName?: string): string => escapeHtml(firstName?.trim() || 'there');

/**
 * Name as an optional clause, e.g. `Welcome to X${optionalName(name)}!` renders
 * "Welcome to X, Amloh!" when we know the name and "Welcome to X!" when we don't.
 * Avoids both the literal "undefined" and the awkward "Welcome to X, there!".
 */
const optionalName = (firstName?: string, prefix = ', '): string => {
  const name = firstName?.trim();
  return name ? `${prefix}${escapeHtml(name)}` : '';
};

/** Human-readable "requested at" stamp in the recipient's likely timezone (UTC). */
const formatRequestedAt = (requestedAt?: Date | string): string | undefined => {
  if (!requestedAt) return undefined;
  const date = requestedAt instanceof Date ? requestedAt : new Date(requestedAt);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toUTCString().replace('GMT', 'UTC');
};

// Base email template with consistent styling - Table-based for email client compatibility
const getBaseTemplate = (title: string, content: string, footerText?: string, preheader?: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="dark">
  <meta name="supported-color-schemes" content="dark">
  <title>${escapeHtml(title)}</title>
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
      transform: scale(1.015);
      box-shadow: 0 4px 12px rgba(1, 63, 46, 0.3);
    }

    /* ------------------------------------------------------------------
       Verification code row.

       This is a table, not a flex container, and the cells are sized as a
       percentage of the row. A table row cannot wrap, so the code is
       guaranteed to sit on one line at every screen width — which is what
       the previous display:flex + flex-wrap:wrap row of fixed 60px digits
       could not do (6 x 60px + 5 x 12px = 420px inside a ~280px content
       area, so exactly 4 digits fitted and 2 fell to a second row).
       ------------------------------------------------------------------ */
    .code-table {
      width: 100%;
      max-width: 420px;
      margin: 30px auto;
      table-layout: fixed;
      border-collapse: separate;
    }
    .code-cell {
      padding: 0 3px;
      text-align: center;
      vertical-align: middle;
    }
    .code-digit { 
      display: block;
      width: 100%;
      box-sizing: border-box;
      background-color: #313a28 !important; 
      border: 1px solid rgba(255, 255, 255, 0.1) !important; 
      border-radius: 8px; 
      font-family: 'Courier New', Courier, monospace;
      font-size: 26px;
      line-height: 1.1;
      font-weight: 700; 
      color: rgb(129, 255, 0) !important; 
      text-align: center;
      padding: 13px 0;
      /* Keep the digits themselves on one line inside their box. */
      white-space: nowrap;
    }
    .code-meta {
      color: rgba(255, 255, 255, 0.6) !important;
      font-size: 13px;
      line-height: 1.5;
      margin: 0 0 6px 0;
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
    .footer a {
      color: rgba(255, 255, 255, 0.6) !important;
      text-decoration: underline;
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
        padding: 24px !important;
        border-radius: 12px !important;
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
      /* !important is required: the digit boxes carry inline styles so they still
         render correctly in clients that strip the style block, and only an
         !important declaration in a stylesheet can override an inline declaration. */
      .code-cell {
        padding: 0 2px !important;
      }
      .code-digit {
        font-size: 21px !important;
        padding: 10px 0 !important;
        border-radius: 7px !important;
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
    
    @media only screen and (max-width: 767px) {
      .card {
        padding: 24px !important;
      }
      .header h1 {
        font-size: 22px;
      }
      .title {
        font-size: 18px;
      }
    }

    /* Very narrow handsets — keep the boxes close to square. */
    @media only screen and (max-width: 380px) {
      .code-cell {
        padding: 0 1px !important;
      }
      .code-digit {
        font-size: 17px !important;
        padding: 8px 0 !important;
        border-radius: 6px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: rgb(20, 24, 16); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  ${preheader ? `<div style="display: none; font-size: 1px; line-height: 1px; max-height: 0; max-width: 0; opacity: 0; overflow: hidden; mso-hide: all; color: rgb(20, 24, 16);">${escapeHtml(preheader)}</div>` : ''}
  <!-- Outer table wrapper for background -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: rgb(20, 24, 16); margin: 0;">
    <tr>
      <td align="center" style="padding: 20px 12px;">
        <!-- Main card container -->
        <table role="presentation" class="card" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 500px; background-color: #222b22; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden;">
          <tr>
            <td class="card" style="padding: 40px; text-align: center; background-color: #222b22;">
              <!-- Header -->
              <div style="margin-bottom: 30px;">
                <div style="margin-bottom: 10px;">
                  <img src="${getEmailImageUrl('/images/logo.png')}" alt="${escapeHtml(EMAIL_BRAND.productName)} logo" width="40" height="40" style="display: block; margin: 0 auto; max-width: 40px; height: auto;">
                </div>
                <p style="color: rgba(255, 255, 255, 0.6); margin: 5px 0 0 0; font-size: 14px; line-height: 1.4;">${escapeHtml(EMAIL_BRAND.tagline)}</p>
              </div>
              
              ${content}
              
              <!-- Footer -->
              <div style="margin-top: 40px; text-align: center; color: rgba(255, 255, 255, 0.5); font-size: 12px; line-height: 1.4; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 20px;">
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">© ${EMAIL_BRAND.year} ${escapeHtml(EMAIL_BRAND.productName)} by <strong>${escapeHtml(EMAIL_BRAND.legalName)}</strong>. All rights reserved.</p>
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;"><a href="${emailUrl('/')}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">${escapeHtml(EMAIL_BRAND.domain)}</a></p>
                <p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">Questions? Reach us at <a href="mailto:${escapeHtml(EMAIL_BRAND.supportEmail)}" style="color: rgba(255, 255, 255, 0.6); text-decoration: underline;">${escapeHtml(EMAIL_BRAND.supportEmail)}</a></p>
                ${footerText ? `<p style="margin: 5px 0; color: rgba(255, 255, 255, 0.5); font-size: 12px;">${escapeHtml(footerText)}</p>` : ''}
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
      <img src="${getEmailImageUrl('/images/one_click_career_kit.png')}" alt="One-Click Career Kit" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
    </div>
    <h2 class="title">One-Click Career Kit</h2>
    <h2 class="title" style="margin-top: 0;">Welcome to ${EMAIL_BRAND.productName}${optionalName(data.firstName)}!</h2>
    <p class="subtitle">Your journey to creating the perfect CV starts here.</p>
    
    <div class="content">
      <p>We're thrilled to have you join our community of professionals who are building their dream careers. ${EMAIL_BRAND.productName} is designed to help you create stunning, ATS-friendly CVs that get you noticed by employers.</p>
      
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
      
      <a href="${emailUrl('/dashboard')}" class="button">Start Building Your CV</a>
      
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
  
  return getBaseTemplate(`Welcome to ${EMAIL_BRAND.productName}`, content);
}

// 2. Limit Exhausted (Upgrade) Email
export function getLimitExhaustedTemplate(data: EmailTemplateData) {
  const content = `
    <div style="margin-bottom: 20px;">
      <img src="${getEmailImageUrl('/images/onboarding/extension-tracker.svg')}" alt="Never Miss a Role" width="180" height="auto" style="display: block; margin: 0 auto; max-width: 180px; height: auto; border-radius: 8px; filter: brightness(0) invert(1);">
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
      
      <a href="${emailUrl('/dashboard?upgrade=true')}" class="button">Upgrade to Pro Now</a>
      
      <div class="warning">
        <p class="warning-text">
          <strong>Limited Time:</strong> Upgrade in the next 24 hours and save 20% on your first year!
        </p>
      </div>
    </div>
  `;
  
  return getBaseTemplate(`Upgrade Your ${EMAIL_BRAND.productName} Plan`, content);
}

// 3. Special Offers (Coupon Code) Email
export function getSpecialOffersTemplate(data: EmailTemplateData) {
  const content = `
    <div style="margin-bottom: 20px;">
      <img src="${getEmailImageUrl('/images/gain_your_edge.png')}" alt="Gain Your Edge" width="200" height="auto" style="display: block; margin: 0 auto; max-width: 200px; height: auto; border-radius: 8px;">
    </div>
    <h2 class="title">Gain Your Edge</h2>
    <h2 class="title" style="margin-top: 0;">🎉 Special Offer Just for You!</h2>
    <p class="subtitle">Exclusive discount on your ${EMAIL_BRAND.productName} Pro subscription.</p>
    
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
      
      <a href="${emailUrl('/dashboard?coupon=' + encodeURIComponent(String(data.couponCode ?? '')))}" class="button">Claim Your Discount</a>
      
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
  
  return getBaseTemplate(`Special Offer - ${EMAIL_BRAND.productName}`, content);
}

// 4. Verification Code Email
//
// Used for email verification, passwordless sign-in, password reset and 2FA. The copy,
// expiry and attempt limits all come from the caller, so the same template can tell the
// truth about why it was sent instead of always claiming "complete your sign-in".
export function getVerificationCodeTemplate(data: EmailTemplateData) {
  const purpose = resolveVerificationPurpose(data.purpose ?? 'passwordless-login', data.isSetup);
  const copy = getVerificationCopy(purpose);

  const expiryMinutes = data.expiryMinutes ?? DEFAULT_CODE_EXPIRY_MINUTES;
  const maxAttempts = data.maxAttempts;
  const requestedAtText = formatRequestedAt(data.requestedAt);

  const digits = String(data.code ?? '').split('');
  // Each cell takes an equal share of the row. With `table-layout: fixed` the row is a
  // single line by construction, at any width and for any code length.
  const cellWidth = digits.length > 0 ? `${(100 / digits.length).toFixed(4)}%` : '100%';

  const digitRow =
    digits.length > 0
      ? `
    <table role="presentation" class="code-table" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 420px; margin: 30px auto; table-layout: fixed; border-collapse: separate;">
      <tr>
        ${digits
          .map(
            (digit) => `<td class="code-cell" width="${cellWidth}" style="padding: 0 3px; text-align: center; vertical-align: middle;">
          <div class="code-digit" style="display: block; width: 100%; box-sizing: border-box; background-color: #313a28; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; font-family: 'Courier New', Courier, monospace; font-size: 26px; line-height: 1.1; font-weight: 700; color: rgb(129, 255, 0); text-align: center; padding: 13px 0; white-space: nowrap;">${escapeHtml(digit)}</div>
        </td>`
          )
          .join('')}
      </tr>
    </table>`
      : '';

  // Context lines are only rendered when the caller actually supplies the data.
  const contextLines: string[] = [];
  if (requestedAtText) contextLines.push(`<strong>Requested:</strong> ${escapeHtml(requestedAtText)}`);
  if (data.device) contextLines.push(`<strong>Device:</strong> ${escapeHtml(data.device)}`);
  if (data.ipAddress) contextLines.push(`<strong>IP address:</strong> ${escapeHtml(data.ipAddress)}`);

  const attemptLine =
    typeof maxAttempts === 'number' && maxAttempts > 0
      ? ` You have ${maxAttempts} attempt${maxAttempts === 1 ? '' : 's'} to get it right.`
      : '';

  const content = `
    <h2 class="title" style="color: #ffffff; margin: 0 0 15px 0; font-size: 24px; font-weight: 700; line-height: 1.3;">${escapeHtml(copy.title)}</h2>
    <p class="subtitle" style="color: rgba(255, 255, 255, 0.7); font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">${escapeHtml(copy.subtitle)}</p>

    <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.6; margin: 0 0 10px 0; text-align: left;">${greeting(data.firstName)}</p>
    <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; line-height: 1.6; margin: 0; text-align: left;">Use the code below to ${escapeHtml(copy.action)}.</p>

    ${digitRow}

    <p class="code-meta" style="color: rgba(255, 255, 255, 0.6); font-size: 13px; line-height: 1.5; margin: 0 0 20px 0;">
      Expires in ${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'}. Single use only.${attemptLine}
    </p>

    ${
      contextLines.length > 0
        ? `<div style="background-color: #313a28; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 16px; margin: 20px 0; box-sizing: border-box; text-align: left;">
      <p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 0 0 8px 0; line-height: 1.5;"><strong>Request details</strong></p>
      ${contextLines
        .map(
          (line) =>
            `<p style="color: rgba(255, 255, 255, 0.7); font-size: 13px; margin: 0 0 4px 0; line-height: 1.5;">${line}</p>`
        )
        .join('')}
    </div>`
        : ''
    }

    <a href="${emailUrl(copy.ctaPath)}" class="button">${escapeHtml(copy.ctaLabel)}</a>

    <div style="background-color: #313a28; border: 1px solid rgba(255, 107, 107, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; box-sizing: border-box;">
      <p style="color: #ff6b6b; font-size: 14px; margin: 0; line-height: 1.5;">
        <strong style="color: #ff6b6b;">Didn't try to ${escapeHtml(copy.reason)}?</strong> Then someone else may have your credentials. Don't share this code with anyone — not even ${escapeHtml(EMAIL_BRAND.productName)} support — and reset your password right away.
      </p>
    </div>

    <div style="background-color: #313a28; border: 1px solid rgba(74, 144, 226, 0.3); border-radius: 8px; padding: 16px; margin: 20px 0; box-sizing: border-box;">
      <p style="color: #4a90e2; font-size: 14px; margin: 0; line-height: 1.5;">
        <strong style="color: #4a90e2;">No code yet?</strong> Codes can take a minute to arrive and may land in spam. Request a new one from the app, or email us at <a href="mailto:${escapeHtml(EMAIL_BRAND.supportEmail)}" style="color: #4a90e2;">${escapeHtml(EMAIL_BRAND.supportEmail)}</a>.
      </p>
    </div>
  `;

  return getBaseTemplate(
    copy.subject,
    content,
    undefined,
    `${copy.title} — your ${String(data.code ?? '').length}-digit code expires in ${expiryMinutes} minute${expiryMinutes === 1 ? '' : 's'}.`
  );
}

// 5. Account Deletion Email
export function getAccountDeletionTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Account Deletion Confirmation</h2>
    <p class="subtitle">Your ${EMAIL_BRAND.productName} account has been successfully deleted.</p>
    
    <div class="content">
      <p>We're sorry to see you go${optionalName(data.firstName)}. Your account and all associated data have been permanently removed from our systems.</p>
      
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
      
      <a href="${emailUrl('/sign-up')}" class="button">Create New Account</a>
    </div>
  `;
  
  return getBaseTemplate(`Account Deleted - ${EMAIL_BRAND.productName}`, content, `If you have any questions, please contact ${EMAIL_BRAND.supportEmail}.`);
}

// 6. Email Verification Template
export function getEmailVerificationTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Verify Your Email Address</h2>
    <p class="subtitle">Click the button below to complete your account setup.</p>
    
    <div class="content">
      <p>Welcome to ${EMAIL_BRAND.productName}${optionalName(data.firstName)}! To get started with creating your professional CV, please verify your email address.</p>
      
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
  
  return getBaseTemplate(`Verify Your Email - ${EMAIL_BRAND.productName}`, content);
}

// 7. Password Reset Template
export function getPasswordResetTemplate(data: EmailTemplateData) {
  const content = `
    <h2 class="title">Reset Your Password</h2>
    <p class="subtitle">Click the button below to set a new password for your account.</p>

    <div class="content">
      <p>We received a request to reset your password for your ${EMAIL_BRAND.productName} account. If you made this request, click the button below to set a new password.</p>

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

  return getBaseTemplate(`Reset Your Password - ${EMAIL_BRAND.productName}`, content);
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
    <p class="subtitle">Don't lose access to your premium ${EMAIL_BRAND.productName} features.</p>

    <div class="content">
      <p>Hi ${displayName(data.firstName)}, your ${EMAIL_BRAND.productName} membership will expire in ${data.daysLeft} ${daysText}. Renew now to continue enjoying all premium features!</p>

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

      <a href="${emailUrl('/dashboard?renew=true')}" class="button">Renew Membership</a>

      <div class="warning">
        <p class="warning-text">
          <strong>Urgent:</strong> Your membership expires on ${data.expirationDate}. Renew before then to avoid service interruption.
        </p>
      </div>
    </div>
  `;

  return getBaseTemplate(`Membership Expiring Soon - ${EMAIL_BRAND.productName}`, content);
}

// 10. Test Email Template
export function getTestEmailTemplate() {
  const content = `
    <h2 class="title">Test Email</h2>
    <p class="subtitle">This is a test email from ${EMAIL_BRAND.productName}.</p>

    <div class="content">
      <p>This email confirms that your ${EMAIL_BRAND.productName} email service is working correctly.</p>

      <div class="highlight">
        <p class="highlight-text">✅ Email service is operational</p>
        <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">If you received this email, your email configuration is working properly.</p>
      </div>

      <div class="info">
        <p class="info-text">
          <strong>Test completed at:</strong> ${new Date().toLocaleString()}<br>
          <strong>Service:</strong> ${EMAIL_BRAND.productName} Email System
        </p>
      </div>

      <p style="color: rgba(255, 255, 255, 0.6); font-size: 14px; margin: 30px 0 0 0;">
        This is an automated test message. No action is required.
      </p>
    </div>
  `;

  return getBaseTemplate(`Test Email - ${EMAIL_BRAND.productName}`, content);
}
