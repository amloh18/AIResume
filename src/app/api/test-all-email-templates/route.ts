import { NextRequest, NextResponse } from 'next/server';
import { sendCustomEmail } from '@/lib/email-service-enhanced';
import {
  getNewUserTemplate,
  getLimitExhaustedTemplate,
  getSpecialOffersTemplate,
  getVerificationCodeTemplate,
  getAccountDeletionTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  getMembershipReminderTemplate,
  getTestEmailTemplate,
  EmailTemplateData
} from '@/lib/email-templates';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      );
    }

    // Test data for templates
    const testData: EmailTemplateData = {
      firstName: 'Amar',
      lastName: 'Lohsl',
      email: email,
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
        name: 'New User Welcome',
        subject: '[TEST] Welcome to CVCircle!',
        html: getNewUserTemplate({
          firstName: testData.firstName,
          email: testData.email,
        }),
      },
      {
        name: 'Email Verification',
        subject: '[TEST] Verify Your Email - CVCircle',
        html: getEmailVerificationTemplate({
          firstName: testData.firstName,
          email: testData.email,
          link: testData.link,
        }),
      },
      {
        name: 'Verification Code',
        subject: '[TEST] Your Verification Code - CVCircle',
        html: getVerificationCodeTemplate({
          code: testData.code,
          email: testData.email,
        }),
      },
      {
        name: 'Password Reset',
        subject: '[TEST] Reset Your Password - CVCircle',
        html: getPasswordResetTemplate({
          firstName: testData.firstName,
          email: testData.email,
          link: testData.link,
        }),
      },
      {
        name: 'Limit Exhausted (Upgrade)',
        subject: '[TEST] Upgrade Your CVCircle Plan',
        html: getLimitExhaustedTemplate({
          firstName: testData.firstName,
          email: testData.email,
          usageLimit: testData.usageLimit,
          currentUsage: testData.currentUsage,
        }),
      },
      {
        name: 'Special Offers (Coupon)',
        subject: '[TEST] Special Offer - CVCircle',
        html: getSpecialOffersTemplate({
          firstName: testData.firstName,
          email: testData.email,
          couponCode: testData.couponCode,
          expirationDate: testData.expirationDate,
        }),
      },
      {
        name: 'Account Deletion',
        subject: '[TEST] Account Deleted - CVCircle',
        html: getAccountDeletionTemplate({
          firstName: testData.firstName,
          email: testData.email,
        }),
      },
      {
        name: 'Membership Reminder',
        subject: '[TEST] Membership Expiring Soon - CVCircle',
        html: getMembershipReminderTemplate({
          firstName: testData.firstName,
          email: testData.email,
          daysLeft: testData.daysLeft,
          expirationDate: testData.expirationDate,
        }),
      },
      {
        name: 'Test Email',
        subject: '[TEST] Test Email - CVCircle',
        html: getTestEmailTemplate(),
      },
    ];

    console.log(`📧 Sending ${templates.length} test emails to: ${email}`);

    const results = [];
    let successCount = 0;
    let failCount = 0;

    // Send emails sequentially with delays to avoid rate limiting
    for (const template of templates) {
      try {
        console.log(`📤 Sending: ${template.name}...`);
        
        const result = await sendCustomEmail(
          email,
          template.subject,
          template.html
        );

        if (result.success) {
          console.log(`   ✅ Success! Message ID: ${result.messageId}`);
          results.push({
            name: template.name,
            success: true,
            messageId: result.messageId,
          });
          successCount++;
        } else {
          console.error(`   ❌ Failed: ${result.error}`);
          results.push({
            name: template.name,
            success: false,
            error: result.error,
          });
          failCount++;
        }

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error: any) {
        console.error(`   ❌ Error: ${error.message}`);
        results.push({
          name: template.name,
          success: false,
          error: error.message,
        });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        total: templates.length,
        success: successCount,
        failed: failCount,
      },
      results,
    });
  } catch (error: any) {
    console.error('❌ Error sending test emails:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

