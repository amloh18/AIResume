import { NextRequest, NextResponse } from 'next/server';
import { 
  getNewUserTemplate,
  getLimitExhaustedTemplate,
  getSpecialOffersTemplate,
  getVerificationCodeTemplate,
  getAccountDeletionTemplate,
  getEmailVerificationTemplate,
  getPasswordResetTemplate,
  EmailTemplateData
} from '@/lib/email-templates';

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'verification' | 'welcome' | 'password_reset' | 'membership_reminder' | 'limit_exhausted' | 'special_offers' | 'account_deletion' | 'custom';
  subject: string;
  description: string;
  category: 'system' | 'marketing' | 'transactional';
  lastUsed?: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  previewHtml: string;
  variables: string[];
}

// Predefined email templates
const predefinedTemplates: EmailTemplate[] = [
  {
    id: 'new-user-welcome',
    name: 'New User Welcome',
    type: 'welcome',
    subject: 'Welcome to AIResume!',
    description: 'Welcome new users to the platform with an introduction to features and next steps.',
    category: 'transactional',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getNewUserTemplate({ firstName: 'John', email: 'john@example.com' }),
    variables: ['firstName', 'lastName', 'email']
  },
  {
    id: 'email-verification',
    name: 'Email Verification',
    type: 'verification',
    subject: 'Verify Your Email - AIResume',
    description: 'Email verification template for new account signups.',
    category: 'transactional',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getEmailVerificationTemplate({ firstName: 'John', email: 'john@example.com', link: 'https://www.buildairesume.com/verify?token=abc123' }),
    variables: ['firstName', 'email', 'link']
  },
  {
    id: 'verification-code',
    name: '4-Digit Verification Code',
    type: 'verification',
    subject: 'Your Verification Code - AIResume',
    description: '4-digit verification code for passwordless login and account verification.',
    category: 'transactional',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getVerificationCodeTemplate({ code: '1234', email: 'john@example.com' }),
    variables: ['code', 'email']
  },
  {
    id: 'password-reset',
    name: 'Password Reset',
    type: 'password_reset',
    subject: 'Reset Your Password - AIResume',
    description: 'Password reset email with secure link to reset user password.',
    category: 'transactional',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getPasswordResetTemplate({ firstName: 'John', email: 'john@example.com', link: 'https://www.buildairesume.com/reset?token=abc123' }),
    variables: ['firstName', 'email', 'link']
  },
  {
    id: 'limit-exhausted',
    name: 'Limit Exhausted (Upgrade)',
    type: 'limit_exhausted',
    subject: 'Upgrade Your AIResume Plan',
    description: 'Encourage users to upgrade when they reach their plan limits.',
    category: 'marketing',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getLimitExhaustedTemplate({ firstName: 'John', email: 'john@example.com', usageLimit: 5, currentUsage: 5 }),
    variables: ['firstName', 'email', 'usageLimit', 'currentUsage', 'planName']
  },
  {
    id: 'special-offers',
    name: 'Special Offers (Coupon)',
    type: 'special_offers',
    subject: 'Special Offer - AIResume',
    description: 'Promotional email with coupon codes and special offers.',
    category: 'marketing',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getSpecialOffersTemplate({ firstName: 'John', email: 'john@example.com', couponCode: 'SAVE30', expirationDate: 'December 31, 2024' }),
    variables: ['firstName', 'email', 'couponCode', 'expirationDate', 'discountPercent']
  },
  {
    id: 'account-deletion',
    name: 'Account Deletion Confirmation',
    type: 'account_deletion',
    subject: 'Account Deleted - AIResume',
    description: 'Confirmation email when a user account is deleted.',
    category: 'transactional',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getAccountDeletionTemplate({ firstName: 'John', email: 'john@example.com' }),
    variables: ['firstName', 'email']
  },
  {
    id: 'membership-reminder',
    name: 'Membership Reminder',
    type: 'membership_reminder',
    subject: 'Your AIResume Membership',
    description: 'Remind users about their membership status and benefits.',
    category: 'marketing',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    previewHtml: getLimitExhaustedTemplate({ firstName: 'John', email: 'john@example.com', usageLimit: 5, currentUsage: 3 }),
    variables: ['firstName', 'email', 'planName', 'expirationDate', 'benefits']
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    let filteredTemplates = [...predefinedTemplates];

    // Filter by category
    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.category === category);
    }

    // Filter by type
    if (type && type !== 'all') {
      filteredTemplates = filteredTemplates.filter(template => template.type === type);
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(template =>
        template.name.toLowerCase().includes(searchLower) ||
        template.description.toLowerCase().includes(searchLower) ||
        template.subject.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      total: filteredTemplates.length,
      categories: ['system', 'marketing', 'transactional'],
      types: ['verification', 'welcome', 'password_reset', 'membership_reminder', 'limit_exhausted', 'special_offers', 'account_deletion', 'custom']
    });

  } catch (error: any) {
    console.error('❌ Email templates API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch email templates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, variables } = body;

    if (!templateId) {
      return NextResponse.json(
        { success: false, error: 'Template ID is required' },
        { status: 400 }
      );
    }

    // Find the template
    const template = predefinedTemplates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate preview with provided variables
    let previewHtml = '';
    const templateData: EmailTemplateData = {
      firstName: variables?.firstName || 'John',
      lastName: variables?.lastName || 'Doe',
      email: variables?.email || 'john@example.com',
      code: variables?.code || '1234',
      link: variables?.link || 'https://www.buildairesume.com/example',
      couponCode: variables?.couponCode || 'SAVE30',
      expirationDate: variables?.expirationDate || 'December 31, 2024',
      usageLimit: variables?.usageLimit || 5,
      currentUsage: variables?.currentUsage || 5,
      planName: variables?.planName || 'Free Plan'
    };

    // Generate the appropriate template
    switch (templateId) {
      case 'new-user-welcome':
        previewHtml = getNewUserTemplate(templateData);
        break;
      case 'email-verification':
        previewHtml = getEmailVerificationTemplate(templateData);
        break;
      case 'verification-code':
        previewHtml = getVerificationCodeTemplate(templateData);
        break;
      case 'password-reset':
        previewHtml = getPasswordResetTemplate(templateData);
        break;
      case 'limit-exhausted':
        previewHtml = getLimitExhaustedTemplate(templateData);
        break;
      case 'special-offers':
        previewHtml = getSpecialOffersTemplate(templateData);
        break;
      case 'account-deletion':
        previewHtml = getAccountDeletionTemplate(templateData);
        break;
      case 'membership-reminder':
        previewHtml = getLimitExhaustedTemplate(templateData);
        break;
      default:
        previewHtml = template.previewHtml;
    }

    return NextResponse.json({
      success: true,
      template: {
        ...template,
        previewHtml
      }
    });

  } catch (error: any) {
    console.error('❌ Email template preview error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate template preview' },
      { status: 500 }
    );
  }
}
