// CVCircle.io Email Templates
// Professional email templates with lime green branding

export interface EmailTemplate {
  subject: string;
  html: string;
}

// Base template with CVCircle.io branding
const getBaseTemplate = (content: string, footerText?: string) => `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
    <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      
      <!-- Header -->
      <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #32CD32; padding-bottom: 20px;">
        <h1 style="color: #32CD32; margin: 0; font-size: 28px; font-weight: bold;">CVCircle.io</h1>
        <p style="color: #6B7280; margin: 5px 0 0 0; font-size: 16px;">Professional CV Builder</p>
      </div>
      
      <!-- Content -->
      ${content}
      
      <!-- Footer -->
      <div style="text-align: center; color: #6B7280; font-size: 12px; border-top: 1px solid #E5E7EB; padding-top: 20px; margin-top: 30px;">
        <p style="margin: 0;">This email was sent from your CVCircle.io platform</p>
        <p style="margin: 5px 0 0 0;">&copy; 2025 CVCircle. All rights reserved.</p>
      </div>
    </div>
  </div>
`;

// Email Verification Template
export function getEmailVerificationTemplate(firstName: string, verificationLink: string): EmailTemplate {
  const content = `
    <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 24px;">Welcome to CVCircle.io, ${firstName}! 👋</h2>
      <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
        Thank you for creating your account. To complete your registration and start building your professional CV, 
        please verify your email address by clicking the button below.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verificationLink}" 
           style="background: #32CD32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Verify Email Address
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
        If the button doesn't work, you can also copy and paste this link into your browser:<br>
        <a href="${verificationLink}" style="color: #32CD32; word-break: break-all;">${verificationLink}</a>
      </p>
      
      <div style="background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #F59E0B;">
        <p style="color: #F59E0B; margin: 0; font-size: 14px;">
          <strong>Security Note:</strong> This verification link will expire in 24 hours for your security. 
          If you didn't create an account with CVCircle.io, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  return {
    subject: 'Verify Your CVCircle.io Account',
    html: getBaseTemplate(content)
  };
}

// Password Reset Template
export function getPasswordResetTemplate(firstName: string, resetLink: string): EmailTemplate {
  const content = `
    <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 24px;">Reset Your Password 🔐</h2>
      <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
        Hi ${firstName},<br><br>
        We received a request to reset your password for your CVCircle.io account. 
        Click the button below to create a new password.
      </p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" 
           style="background: #32CD32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Reset Password
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
        If the button doesn't work, you can also copy and paste this link into your browser:<br>
        <a href="${resetLink}" style="color: #32CD32; word-break: break-all;">${resetLink}</a>
      </p>
      
      <div style="background: #FEE2E2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #EF4444;">
        <p style="color: #EF4444; margin: 0; font-size: 14px;">
          <strong>Security Note:</strong> This link will expire in 1 hour for your security. 
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;

  return {
    subject: 'Reset Your CVCircle.io Password',
    html: getBaseTemplate(content)
  };
}

// Welcome Email with Membership Promotion
export function getWelcomeEmailTemplate(firstName: string): EmailTemplate {
  const content = `
    <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 24px;">Welcome to CVCircle.io, ${firstName}! 🎉</h2>
      <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
        Congratulations! Your account has been successfully verified. You're now ready to create professional CVs that stand out to employers.
      </p>
      
      <!-- Features Showcase -->
      <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #32CD32;">
        <h3 style="color: #32CD32; margin: 0 0 15px 0; font-size: 18px;">✨ What You Can Do Now:</h3>
        <ul style="color: #0369A1; margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Create professional CVs with our AI-powered builder</li>
          <li>Choose from 50+ professional templates</li>
          <li>Get ATS optimization suggestions</li>
          <li>Export to PDF, Word, or share online</li>
          <li>Track your application progress</li>
        </ul>
      </div>
      
      <!-- Membership Promotion -->
      <div style="background: linear-gradient(135deg, #32CD32 0%, #228B22 100%); padding: 25px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
        <h3 style="margin: 0 0 10px 0; font-size: 20px;">🚀 Upgrade to Pro Membership</h3>
        <p style="margin: 0 0 15px 0; font-size: 16px;">Unlock unlimited CVs, premium templates, and advanced features</p>
        <a href="https://cvcircle.io/pricing" 
           style="background: white; color: #32CD32; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 16px;">
          View Pricing Plans
        </a>
      </div>
      
      <!-- Get Started Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cvcircle.io/dashboard" 
           style="background: #32CD32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Start Building Your CV
        </a>
      </div>
      
      <!-- Pro Features -->
      <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16A34A;">
        <h3 style="color: #16A34A; margin: 0 0 10px 0; font-size: 18px;">💎 Pro Membership Benefits:</h3>
        <ul style="color: #16A34A; margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Unlimited CV creation and downloads</li>
          <li>Premium templates and designs</li>
          <li>Advanced ATS optimization</li>
          <li>Priority customer support</li>
          <li>Cover letter generator</li>
          <li>Job application tracking</li>
        </ul>
      </div>
    </div>
  `;

  return {
    subject: 'Welcome to CVCircle.io - Start Building Your Professional CV!',
    html: getBaseTemplate(content)
  };
}

// Membership Reminder Template
export function getMembershipReminderTemplate(firstName: string, daysLeft: number): EmailTemplate {
  const content = `
    <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 24px;">Your Pro Membership Expires Soon ⏰</h2>
      <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
        Hi ${firstName},<br><br>
        Your CVCircle.io Pro membership will expire in <strong>${daysLeft} days</strong>. 
        Don't lose access to your premium features!
      </p>
      
      <!-- Urgency Message -->
      <div style="background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F59E0B;">
        <h3 style="color: #F59E0B; margin: 0 0 10px 0; font-size: 18px;">⚠️ What You'll Lose:</h3>
        <ul style="color: #F59E0B; margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Access to premium templates</li>
          <li>Unlimited CV downloads</li>
          <li>Advanced ATS optimization</li>
          <li>Priority support</li>
        </ul>
      </div>
      
      <!-- Renewal Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cvcircle.io/renew" 
           style="background: #32CD32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          Renew Membership Now
        </a>
      </div>
      
      <!-- Special Offer -->
      <div style="background: linear-gradient(135deg, #32CD32 0%, #228B22 100%); padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; color: white;">
        <h3 style="margin: 0 0 10px 0; font-size: 18px;">🎁 Special Renewal Offer</h3>
        <p style="margin: 0 0 15px 0; font-size: 16px;">Get 20% off your renewal when you upgrade today!</p>
        <a href="https://cvcircle.io/renew?discount=20" 
           style="background: white; color: #32CD32; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 14px;">
          Claim 20% Discount
        </a>
      </div>
      
      <p style="color: #6B7280; font-size: 14px; margin: 20px 0 0 0; line-height: 1.5;">
        Questions about your membership? Contact our support team at 
        <a href="mailto:support@cvcircle.io" style="color: #32CD32;">support@cvcircle.io</a>
      </p>
    </div>
  `;

  return {
    subject: `Your CVCircle.io Pro Membership Expires in ${daysLeft} Days`,
    html: getBaseTemplate(content)
  };
}

// Test Email Template (for testing)
export function getTestEmailTemplate(): EmailTemplate {
  const content = `
    <div style="background: #F9FAFB; padding: 30px; border-radius: 8px; margin-bottom: 20px;">
      <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 24px;">CVCircle.io Email Test 🚀</h2>
      <p style="color: #4B5563; margin: 0 0 20px 0; line-height: 1.6; font-size: 16px;">
        This is a test email to verify that your CVCircle.io email system is working perfectly with the new branding and lime green theme.
      </p>
      
      <!-- Configuration Details -->
      <div style="background: #E0F2FE; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #32CD32;">
        <h3 style="color: #32CD32; margin: 0 0 10px 0; font-size: 18px;">📊 Email System Status:</h3>
        <ul style="color: #0369A1; margin: 0; padding-left: 20px; font-size: 14px;">
          <li><strong>Brand:</strong> CVCircle.io</li>
          <li><strong>Theme Color:</strong> Lime Green (#32CD32)</li>
          <li><strong>Status:</strong> ✅ Active & Working</li>
          <li><strong>Year:</strong> 2025</li>
        </ul>
      </div>
      
      <!-- Features -->
      <div style="background: #F0FDF4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16A34A;">
        <h3 style="color: #16A34A; margin: 0 0 10px 0; font-size: 18px;">✨ Email Templates Available:</h3>
        <ul style="color: #16A34A; margin: 0; padding-left: 20px; font-size: 14px;">
          <li>Email verification</li>
          <li>Password reset</li>
          <li>Welcome with membership promotion</li>
          <li>Membership reminders</li>
          <li>System notifications</li>
        </ul>
      </div>
      
      <!-- Call to Action -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="https://cvcircle.io" 
           style="background: #32CD32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
          🚀 Visit CVCircle.io
        </a>
      </div>
    </div>
  `;

  return {
    subject: 'CVCircle.io Email Test - New Branding & Templates',
    html: getBaseTemplate(content)
  };
}
