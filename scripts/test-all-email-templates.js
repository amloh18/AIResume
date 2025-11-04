/**
 * Script to send test emails for all email templates
 * Usage: node scripts/test-all-email-templates.js
 */

require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');
const {
  getNewUserTemplate,
  getLimitExhaustedTemplate,
  getSpecialOffersTemplate,
  getVerificationCodeTemplate,
  getAccountDeletionTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getMembershipReminderTemplate,
  getTestEmailTemplate
} = require('../src/lib/email-templates.ts');

// Email service configuration
const getEmailConfig = () => {
  // Check for Hostinger configuration
  if (process.env.EMAIL_SERVER_HOST && process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD) {
    return {
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '465'),
      secure: process.env.EMAIL_SERVER_PORT === '465',
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    };
  }

  // Check for Gmail configuration
  if (process.env.GMAIL_USER && process.env.GMAIL_PASSWORD) {
    return {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD,
      },
    };
  }

  return null;
};

const getSenderEmail = () => {
  if (process.env.SENDGRID_FROM_EMAIL) {
    return process.env.SENDGRID_FROM_EMAIL;
  }
  if (process.env.GMAIL_USER) {
    return process.env.GMAIL_USER;
  }
  if (process.env.EMAIL_SERVER_USER) {
    return process.env.EMAIL_SERVER_USER;
  }
  return 'noreply@cvcircle.io';
};

async function sendTestEmails() {
  const testEmail = 'amarjotasl@gmail.com';
  const config = getEmailConfig();

  if (!config) {
    console.error('❌ Email service not configured');
    console.log('Please set up EMAIL_SERVER_HOST, EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD or GMAIL_USER, GMAIL_PASSWORD');
    process.exit(1);
  }

  const transporter = nodemailer.createTransport(config);
  const senderEmail = getSenderEmail();

  // Test data for templates
  const testData = {
    firstName: 'Amar',
    lastName: 'Lohsl',
    email: testEmail,
    code: '9567',
    link: 'https://www.cvcircle.io/verify?token=test-token-123',
    couponCode: 'WELCOME30',
    planName: 'Pro Plan',
    usageLimit: 5,
    currentUsage: 5,
    expirationDate: '2024-12-31',
    daysLeft: 7,
  };

  // All templates to test
  const templates = [
    {
      name: '1. New User Welcome',
      subject: 'Welcome to CVCircle!',
      html: getNewUserTemplate({
        firstName: testData.firstName,
        email: testData.email,
      }),
    },
    {
      name: '2. Email Verification',
      subject: 'Verify Your Email - CVCircle',
      html: getEmailVerificationTemplate({
        firstName: testData.firstName,
        email: testData.email,
        link: testData.link,
      }),
    },
    {
      name: '3. Verification Code',
      subject: 'Your Verification Code - CVCircle',
      html: getVerificationCodeTemplate({
        code: testData.code,
        email: testData.email,
      }),
    },
    {
      name: '4. Password Reset',
      subject: 'Reset Your Password - CVCircle',
      html: getPasswordResetTemplate({
        firstName: testData.firstName,
        email: testData.email,
        link: testData.link,
      }),
    },
    {
      name: '5. Limit Exhausted (Upgrade)',
      subject: 'Upgrade Your CVCircle Plan',
      html: getLimitExhaustedTemplate({
        firstName: testData.firstName,
        email: testData.email,
        usageLimit: testData.usageLimit,
        currentUsage: testData.currentUsage,
      }),
    },
    {
      name: '6. Special Offers (Coupon)',
      subject: 'Special Offer - CVCircle',
      html: getSpecialOffersTemplate({
        firstName: testData.firstName,
        email: testData.email,
        couponCode: testData.couponCode,
        expirationDate: testData.expirationDate,
      }),
    },
    {
      name: '7. Account Deletion',
      subject: 'Account Deleted - CVCircle',
      html: getAccountDeletionTemplate({
        firstName: testData.firstName,
        email: testData.email,
      }),
    },
    {
      name: '8. Membership Reminder',
      subject: 'Membership Expiring Soon - CVCircle',
      html: getMembershipReminderTemplate({
        firstName: testData.firstName,
        email: testData.email,
        daysLeft: testData.daysLeft,
        expirationDate: testData.expirationDate,
      }),
    },
    {
      name: '9. Test Email',
      subject: 'Test Email - CVCircle',
      html: getTestEmailTemplate(),
    },
  ];

  console.log(`\n📧 Sending ${templates.length} test emails to: ${testEmail}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const template of templates) {
    try {
      console.log(`📤 Sending: ${template.name}...`);
      
      const result = await transporter.sendMail({
        from: `"CVCircle" <${senderEmail}>`,
        to: testEmail,
        subject: `[TEST] ${template.subject}`,
        html: template.html,
      });

      console.log(`   ✅ Success! Message ID: ${result.messageId}`);
      successCount++;

      // Small delay between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📧 Total: ${templates.length}\n`);
}

// Run the script
sendTestEmails().catch(error => {
  console.error('❌ Script error:', error);
  process.exit(1);
});

