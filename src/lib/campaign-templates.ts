export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: 'onboarding' | 'upsell' | 'engagement' | 'transactional' | 'trigger' | 'newsletter' | 'retention';
  scenario: string;
  subjectTemplate: string;
  previewText?: string;
  htmlContent: string;
  suggestedFilters?: any;
  defaultFromName?: string;
  defaultFromEmail?: string;
  defaultReplyTo?: string;
}

// THEME CONSTANTS - Dark Theme matching dashboard
const THEME = {
  bg: 'rgb(20, 24, 16)', // Deep dark green/black
  card: '#222b22', // Slightly lighter card bg
  text: '#ffffff',
  textMuted: '#9ca3af',
  accent: 'rgb(129, 255, 0)', // Neon Green
  accentText: '#000000',
  border: '#333333'
};

const BASE_TEMPLATE = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${THEME.bg}; font-family: 'Inter', sans-serif; color: ${THEME.text}; }
    .container { max-width: 600px; margin: 0 auto; background-color: ${THEME.bg}; }
    .header { padding: 30px 20px; text-align: center; }
    .logo-container { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; gap: 10px; }
    .logo-img { height: 32px; width: auto; vertical-align: middle; }
    .logo-text { color: ${THEME.text}; font-weight: bold; font-size: 24px; text-decoration: none; letter-spacing: -0.5px; vertical-align: middle; margin-left: 10px; }
    .content { background-color: ${THEME.card}; padding: 40px 30px; border-radius: 16px; margin: 0 20px; border: 1px solid ${THEME.border}; }
    h1 { color: ${THEME.text}; margin-top: 0; font-size: 24px; font-weight: 700; line-height: 1.3; }
    p { color: ${THEME.textMuted}; line-height: 1.6; font-size: 16px; margin-bottom: 24px; }
    .btn { display: inline-block; background-color: ${THEME.accent}; color: ${THEME.accentText}; padding: 14px 32px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-top: 10px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .footer { padding: 40px 20px; text-align: center; color: #666; font-size: 12px; }
    .footer a { color: #888; text-decoration: none; }
    .footer a:hover { color: ${THEME.accent}; text-decoration: underline; }
    .highlight { color: ${THEME.accent}; }
    .divider { height: 1px; background-color: ${THEME.border}; margin: 30px 0; }
    .feature-item { display: flex; align-items: flex-start; margin-bottom: 16px; }
    .check { color: ${THEME.accent}; margin-right: 12px; font-weight: bold; }
    .footer-links { margin-bottom: 20px; }
    .footer-links a { margin: 0 8px; }
    
    /* Utility classes for content construction */
    .text-center { text-align: center; }
    .text-l { font-size: 18px; }
    .text-small { font-size: 14px; }
    .mb-20 { margin-bottom: 20px; }
    .mt-30 { margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="{{appUrl}}" class="logo-container">
        <img src="{{appUrl}}/images/logo.png" alt="CVCircle" class="logo-img" />
        <span class="logo-text">CVCircle</span>
      </a>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <div class="footer-links">
        <a href="{{appUrl}}/legal#privacy">Privacy Policy</a> •
        <a href="{{appUrl}}/legal#terms">Terms of Service</a> •
        <a href="{{appUrl}}/legal#cookies">Cookies</a> •
        <a href="{{appUrl}}/legal#support">Support</a>
      </div>
      <p>&copy; ${new Date().getFullYear()} CVCircle. All rights reserved.</p>
      <p>London, England</p>
      <div class="divider"></div>
      <p>You received this email because you signed up for CVCircle.</p>
      <p><a href="{{unsubscribeUrl}}" style="text-decoration: underline;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>
`;

// Helper to quickly generate templates
const createTemplate = (
  id: string,
  name: string,
  category: CampaignTemplate['category'],
  scenario: string,
  subject: string,
  heading: string,
  bodyContent: string,
  ctaText?: string,
  ctaLink?: string,
  extra?: Partial<CampaignTemplate>
): CampaignTemplate => {
  let html = `<h1>${heading}</h1>`;
  html += bodyContent;
  if (ctaText && ctaLink) {
    html += `
      <div style="text-align: center; margin: 30px 0;">
        <a href="{{appUrl}}${ctaLink}" class="btn">${ctaText}</a>
      </div>
    `;
  }
  return {
    id: id,
    name: name,
    description: scenario,
    category,
    scenario,
    subjectTemplate: subject,
    htmlContent: BASE_TEMPLATE(html, subject),
    ...extra
  };
};

// ============================================================================
// 100 EMAIL TEMPLATES - SEGMENTED
// ============================================================================

const templates: CampaignTemplate[] = [
  // =====================================================
  // A. ONBOARDING & FIRST VALUE (1-10)
  // =====================================================
  createTemplate('1-welcome', '1. Welcome Message', 'onboarding', 'Sign-up Confirmation',
    'Welcome to CVCircle – Let’s Build Your Career', 'Welcome to the Future of Career Building 🚀',
    `<p>Hi {{firstName}},</p>
     <p>Thank you for joining <strong>CVCircle</strong>. You’ve just taken the first step towards a smarter, more efficient job search.</p>
     <p>Our AI-powered platform helps you build professional CVs, generate tailored cover letters, and track your applications—all in one place.</p>`,
    'Create My First CV', '/resumes/new'),

  createTemplate('2-extension-intro', '2. Chrome Extension Intro', 'onboarding', 'Extension Nudge',
    'Save Jobs in 1 Click 🖱️', 'Stop Copy-Pasting Job Descriptions',
    `<p>Hi {{firstName}},</p>
     <p>Did you know you can save jobs from LinkedIn and Indeed directly to your CVCircle dashboard?</p>
     <p>Install our Chrome Extension to track applications and auto-tailor your CVs instantly.</p>`,
    'Install Extension', '/extension'),

  createTemplate('3-empty-account', '3. Empty Account Reminder', 'onboarding', '24h Inactive',
    'Your Dream Job is Waiting...', 'Don\'t Let Your Profile Gather Dust',
    `<p>Hi {{firstName}},</p>
     <p>We noticed you haven't started your first CV yet. Candidates with a tailored CV get <strong>3x more interviews</strong>.</p>
     <p>It takes less than 5 minutes start.</p>`,
    'Build My CV Now', '/resumes/new'),

  createTemplate('4-template-selection', '4. First Template Selection', 'onboarding', 'Guidance',
    'Modern or Academic? Choose Your Style', 'Which Look Suits Your Career?',
    `<p>Hi {{firstName}},</p>
     <p>Not sure which template to pick? Use "Modern" for tech and startups, or "Academic" for research and traditional roles.</p>`,
    'Browse Templates', '/templates'),

  createTemplate('5-draft-saved', '5. CV Draft Saved', 'onboarding', 'Progress',
    'Your Progress is Safe 🔒', 'Draft Saved Successfully',
    `<p>Hi {{firstName}},</p>
     <p>Great start! We've securely saved your draft. You can come back and edit it anytime from any device.</p>`,
    'Continue Editing', '/dashboard'),

  createTemplate('6-cv-50-percent', '6. CV 50% Complete', 'onboarding', 'Encouragement',
    'You\'re halfway there!', 'Finish Strong 💪',
    `<p>Hi {{firstName}},</p>
     <p>Your CV is 50% complete. Just add your <strong>Education</strong> and <strong>Skills</strong> to cross the finish line.</p>`,
    'Complete My CV', '/resumes'),

  createTemplate('7-first-export', '7. First CV Export', 'onboarding', 'Milestone',
    'Congratulations on Your New CV! 🎉', 'Ready to Apply?',
    `<p>Hi {{firstName}},</p>
     <p>You've successfully exported your first ATS-ready CV. Good luck with your applications!</p>
     <p>Don't forget to track where you apply using our tracker.</p>`,
    'Track Application', '/tracker'),

  createTemplate('8-linkedin-reveal', '8. LinkedIn Enhancer Reveal', 'onboarding', 'Cross-sell',
    'Now, Fix Your LinkedIn Profile', 'Is Your LinkedIn Matching Your CV?',
    `<p>Hi {{firstName}},</p>
     <p>Recruiters will check your LinkedIn. Ensure it matches your shiny new CV with our AI Enhancer.</p>`,
    'Optimize LinkedIn', '/linkedin-enhancer'),

  createTemplate('9-master-cv-guide', '9. Guide to Master CV', 'onboarding', 'Education',
    'Why You Need a "Master CV"', 'The Secret to Fast Applications',
    `<p>Hi {{firstName}},</p>
     <p>Store ALL your experience in one "Master CV" on CVCircle. Then, generate tailored versions for specific jobs in seconds.</p>`,
    'Create Master CV', '/resumes/master'),

  createTemplate('10-photo-tip', '10. Profile Photo Tip', 'onboarding', 'Tip',
    'Does Your Photo Say "Hired"?', 'Quick Photo Tips 📸',
    `<p>Hi {{firstName}},</p>
     <p>Use a clear headshot with good lighting. Smile approachable! Add it to your Hero section today.</p>`,
    'Update Profile', '/profile'),


  // =====================================================
  // B. MONETIZATION & SUBSCRIPTION (11-30) / UPSELL & TRANSACTIONAL
  // =====================================================
  createTemplate('11-day-pass-offer', '11. Day Pass Offer', 'upsell', 'Limit Reached',
    'Need Another CV? Get a Day Pass', 'Unlock 24h Access for ₹29',
    `<p>Hi {{firstName}},</p>
     <p>You've hit your free limit. Unlock unlimited exports for just 24 hours with our Day Pass.</p>`,
    'Get Day Pass', '/pricing?plan=day'),

  createTemplate('12-pro-monthly', '12. Professional Monthly Benefits', 'upsell', 'Upgrade',
    'Go Limitless with Pro Monthly', 'Why Stop at One?',
    `<p>Hi {{firstName}},</p>
     <p>Job hunting is a journey. Get <strong>Unlimited CVs</strong> and full AI access with our Monthly plan.</p>`,
    'Upgrade to Pro', '/pricing?plan=monthly'),

  createTemplate('13-pro-quarterly', '13. Professional Quarterly Discount', 'upsell', 'Discount',
    'Save 15% with Quarterly Plan', 'Commit to Your Career & Save 💰',
    `<p>Hi {{firstName}},</p>
     <p>Upgrade to our <strong>Quarterly Plan</strong> and get 15% OFF compared to monthly billing.</p>`,
    'Claim 15% Off', '/pricing?plan=quarterly'),

  createTemplate('14-lifetime-invite', '14. Lifetime Access Invite', 'upsell', 'Exclusive',
    'Exclusive: CVCircle for Life', 'Never Pay Again',
    `<p>Hi {{firstName}},</p>
     <p>You've been with us for 3 months. We'd like to invite you to our <strong>Lifetime Plan</strong>. One payment, forever access.</p>`,
    'Get Lifetime Access', '/pricing?plan=lifetime'),

  createTemplate('15-payment-expiring', '15. Payment Method Expiring', 'transactional', 'Billing Alert',
    'Action Required: Card Expiring Soon', 'Don\'t Lose Your Pro Access',
    `<p>Hi {{firstName}},</p>
     <p>Your payment method is set to expire soon. Please update it to keep your subscription active.</p>`,
    'Update Payment', '/settings/billing'),

  createTemplate('16-payment-success', '16. Payment Success', 'transactional', 'Receipt',
    'Payment Received ✅', 'Thank You!',
    `<p>Hi {{firstName}},</p>
     <p>We've received your payment. Your comprehensive career toolkit is ready to use.</p>`,
    'View Invoice', '/settings/billing'),

  createTemplate('17-payment-failed-1', '17. Payment Failed (Attempt 1)', 'transactional', 'Billing Alert',
    'Payment Failed - Retrying', 'We Couldn\'t Process Your Payment',
    `<p>Hi {{firstName}},</p>
     <p>We had trouble processing your renewal. We will retry in a few days.</p>`,
    'Check Payment Method', '/settings/billing'),

  createTemplate('18-payment-failed-final', '18. Payment Failed (Final)', 'transactional', 'Downgrade Warning',
    'Last Chance to Keep Pro', 'Your Subscription Will Be Cancelled',
    `<p>Hi {{firstName}},</p>
     <p>We were unable to process payment. Your account will be downgraded to Free in 24 hours.</p>`,
    'Restore Access', '/settings/billing'),

  createTemplate('19-day-pass-expiry', '19. Day Pass Expiry', 'upsell', 'Urgency',
    'Day Pass Expiring in 3 Hours!', 'Clock is Ticking ⏳',
    `<p>Hi {{firstName}},</p>
     <p>Your 24-hour access is ending soon. Upgrade to Monthly to keep your premium features.</p>`,
    'Extend Access', '/pricing'),

  createTemplate('20-sub-anniversary', '20. Subscription Anniversary', 'trigger', 'Celebration',
    'Happy CVCircle Anniversary! 🎉', '1 Year of Growth',
    `<p>Hi {{firstName}},</p>
     <p>You've been with us for a year. Keep pushing your career boundaries!</p>`,
    'Go to Dashboard', '/dashboard'),

  createTemplate('21-feature-lock', '21. Feature Lock Teaser', 'upsell', 'Teaser',
    'Unlock 10+ Hidden Insights', 'You\'re Missing Out',
    `<p>Hi {{firstName}},</p>
     <p>Our AI found 10 critical insights for your CV, but you need Premium to see them.</p>`,
    'Unlock Insights', '/pricing'),

  createTemplate('22-downgrade-confirm', '22. Downgrade Confirmation', 'trigger', 'Churn',
    'We\'re Sorry to See You Go', 'Subscription Cancelled',
    `<p>Hi {{firstName}},</p>
     <p>Your account has been downgraded. You can still access your files, but premium features are locked.</p>`,
    'Give Feedback', '/feedback'),

  createTemplate('23-plan-switch', '23. Plan Switch Success', 'transactional', 'Upgrade',
    'Plan Updated Successfully', 'Welcome to Quarterly!',
    `<p>Hi {{firstName}},</p>
     <p>You've successfully switched to the Quarterly plan. Enjoy the savings!</p>`,
    'View Plan', '/settings/billing'),

  createTemplate('24-inactivity-7', '24. Inactivity Nudge (7 Days)', 'trigger', 'Engagement',
    'Your Career Goals Miss You', 'Ready to Continue?',
    `<p>Hi {{firstName}},</p>
     <p>It's been a week since we saw you. Jump back in and finish your applications.</p>`,
    'Resume Activity', '/dashboard'),

  createTemplate('25-inactivity-30', '25. Inactivity Nudge (30 Days)', 'upsell', 'Win-back',
    'Come Back with a Discount', 'Special Offer',
    `<p>Hi {{firstName}},</p>
     <p>It's been a month. Come back and get a Day Pass for free to restart your search.</p>`,
    'Claim Offer', '/pricing?promo=welcomeback'),

  createTemplate('26-high-usage', '26. High Usage Alert', 'upsell', 'Smart Upsell',
    'You\'re on Fire! 🔥', 'High Volume User?',
    `<p>Hi {{firstName}},</p>
     <p>You've created 5 CVs this week! The Professional Monthly plan is perfect for power users like you.</p>`,
    'See Pro Benefits', '/pricing'),

  createTemplate('27-refund-processed', '27. Refund Processed', 'transactional', 'Support',
    'Refund Processed', 'Refund Confirmation',
    `<p>Hi {{firstName}},</p>
     <p>We've processed your refund request. It should appear in your account in 5-7 business days.</p>`,
    'Contact Support', '/support'),

  createTemplate('28-chargeback', '28. Chargeback Response', 'transactional', 'Alert',
    'Important: Charge Dispute', 'Action Required',
    `<p>Hi {{firstName}},</p>
     <p>We received a dispute for your recent payment. Please contact us to resolve this.</p>`,
    'Contact Support', '/support'),

  createTemplate('29-gift-sent', '29. Gift Code Sent', 'transactional', 'Gift',
    'Your Gift Has Sent!', 'Gift Delivered 🎁',
    `<p>Hi {{firstName}},</p>
     <p>Your gift subscription code has been sent. You're a great friend!</p>`,
    'View Order', '/settings/billing'),

  createTemplate('30-gift-redeemed', '30. Gift Code Redeemed', 'transactional', 'Gift',
    'Your Gift Was Redeemed', 'Gift Activated',
    `<p>Hi {{firstName}},</p>
     <p>Your friend just redeemed their CVCircle subscription. Thanks for sharing the love.</p>`),


  // =====================================================
  // C. TOOL ENGAGEMENT & MASTERY (31-50) / TRIGGER
  // =====================================================
  createTemplate('31-interview-coach', '31. Interview Coach Intro', 'trigger', 'Feature Promo',
    'Practice Answers Before the Big Call', 'Prepare with AI 🎤',
    `<p>Hi {{firstName}},</p>
     <p>Getting interviews? Use our AI Coach to simulate questions for your target roles.</p>`,
    'Start Practicing', '/interview-prep'),

  createTemplate('32-resume-score', '32. Editor Score', 'trigger', 'Gamification',
    'Your CV Scored 72/100', 'Let\'s Aim for 90+',
    `<p>Hi {{firstName}},</p>
     <p>Our analyzer rates your current CV at 72. Fix 3 key issues to reach a "Strong" score.</p>`,
    'Improve Score', '/resumes'),

  createTemplate('33-cover-letter', '33. Cover Letter Success', 'trigger', 'Success',
    'Your Tailored Cover Letter is Ready', 'Written in Seconds ✍️',
    `<p>Hi {{firstName}},</p>
     <p>Your new cover letter is generated and ready to review. It perfectly matches your CV style.</p>`,
    'Review Letter', '/cover-letters'),

  createTemplate('34-app-tracker', '34. Application Tracker Update', 'trigger', 'Progress',
    '3 Applications Today!', 'Keep the Momentum 🚀',
    `<p>Hi {{firstName}},</p>
     <p>You tracked 3 new applications today. Consistency is key to landing offers.</p>`,
    'View Tracker', '/tracker'),

  createTemplate('35-save-success', '35. Extension Save Success', 'trigger', 'Notification',
    'Job Saved Successfully', 'Added to Tracker',
    `<p>Hi {{firstName}},</p>
     <p>You successfully saved a new job via Chrome Extension. It's safe in your dashboard.</p>`,
    'View Job', '/tracker'),

  createTemplate('36-linkedin-seo', '36. LinkedIn SEO Tip', 'trigger', 'Tip',
    'Is Your Headline searchable?', 'LinkedIn Tip 💡',
    `<p>Hi {{firstName}},</p>
     <p>Recruiters search for keywords. Ensure your Headline includes your core job title and top 3 skills.</p>`,
    'Update LinkedIn', '/linkedin-enhancer'),

  createTemplate('37-skill-gap', '37. Skill Gap Alert', 'trigger', 'Insight',
    'Missing Skill: Project Management', 'Boost Your Match Score',
    `<p>Hi {{firstName}},</p>
     <p>Many jobs you look at require 'Project Management'. Add it to your Global Skills if you have it.</p>`,
    'Update Skills', '/profile'),

  createTemplate('38-lang-refresh', '38. Language Card Refresh', 'trigger', 'Profile',
    'New Language Added? Update Profile', 'Showcase Your Fluency',
    `<p>Hi {{firstName}},</p>
     <p>Learning a new language? Don't forget to update your Language card.</p>`,
    'Update Profile', '/profile'),

  createTemplate('39-edu-nudge', '39. Education Update Nudge', 'trigger', 'Profile',
    'Did you finish your Diploma?', 'Keep Education Current',
    `<p>Hi {{firstName}},</p>
     <p>It looks like your Diploma end date has passed. Mark it as 'Completed'?</p>`,
    'Update Education', '/profile'),

  createTemplate('40-ats-insight', '40. Deep ATS Insight', 'trigger', 'Education',
    'Recruiters are filtering for this...', 'ATS Secret 🕵️',
    `<p>Hi {{firstName}},</p>
     <p>Right now, recruiters in your field are filtering for specific keywords. Check our insights.</p>`,
    'View Insights', '/insights'),

  createTemplate('41-new-template', '41. New Template Alert', 'trigger', 'Promo',
    'New: "Creative" Layout', 'Stand Out Visually 🎨',
    `<p>Hi {{firstName}},</p>
     <p>Applying for design or marketing roles? Check out our new Creative template.</p>`,
    'Preview Template', '/templates'),

  createTemplate('42-portfolio-link', '42. Portfolio Link Reminder', 'trigger', 'Tip',
    'Don\'t forget your Portfolio link', 'Show Your Work',
    `<p>Hi {{firstName}},</p>
     <p>Add your website or portfolio link to your Contact Info for better conversion.</p>`,
    'Edit Contact Info', '/profile'),

  createTemplate('43-interview-done', '43. First Interview Practice', 'trigger', 'Milestone',
    'Practice Complete!', 'Feeling Confident?',
    `<p>Hi {{firstName}},</p>
     <p>Great job on your first practice session. Do one more before the real thing.</p>`,
    'Practice Again', '/interview-prep'),

  createTemplate('44-extension-offline', '44. Chrome Extension Offline', 'trigger', 'Support',
    'Re-sync Your Extension', 'Extension Disconnected 🔌',
    `<p>Hi {{firstName}},</p>
     <p>It seems your extension got disconnected. Click below to re-sync.</p>`,
    'Re-sync Now', '/extension'),

  createTemplate('45-multi-sync', '45. Multi-CV Sync', 'trigger', 'Feature',
    'Keep All CVs Consistent', 'One Click Sync 🔄',
    `<p>Hi {{firstName}},</p>
     <p>Updated your Master CV? Sync changes to all 3 of your active versions instantly.</p>`,
    'Sync Now', '/resumes'),

  createTemplate('46-endorsement', '46. Skill Endorsement Invite', 'trigger', 'Tip',
    'Get Endorsed for Tax', 'Boost Credibility',
    `<p>Hi {{firstName}},</p>
     <p>Ask your colleagues to endorse your top skills on LinkedIn.</p>`),

  createTemplate('47-about-hook', '47. About Section Hook', 'trigger', 'Tip',
    'Is your first sentence catching eyes?', 'The 3 Second Rule',
    `<p>Hi {{firstName}},</p>
     <p>Your About section needs a hook. Start with your biggest achievement.</p>`,
    'Edit About', '/profile'),

  createTemplate('48-bullet-audit', '48. Experience Bullet Point Audit', 'trigger', 'Improvement',
    'Switch "Responsible for" to "Achieved"', 'Power Verbs Matter',
    `<p>Hi {{firstName}},</p>
     <p>Don't just list duties. List impact. Use strong action verbs.</p>`,
    'Enhance CV', '/resumes'),

  createTemplate('49-volunteer', '49. Volunteer Work Nudge', 'trigger', 'Profile',
    'Add Social Services to Causes', 'Volunteering Counts',
    `<p>Hi {{firstName}},</p>
     <p>Employers love well-rounded candidates. Add your volunteer work.</p>`,
    'Add Section', '/profile'),

  createTemplate('50-weekly-report', '50. Weekly Progress Report', 'trigger', 'Report',
    'Your Weekly Activity Report', 'This Week in Numbers 📊',
    `<p>Hi {{firstName}},</p>
     <p>You applied to <strong>5 jobs</strong> and practiced <strong>2 interviews</strong> this week. Keep it up!</p>`,
    'View Dashboard', '/dashboard'),


  // =====================================================
  // D. REFERRAL & SOCIAL PROOF (51-60) / ENGAGEMENT
  // =====================================================
  createTemplate('51-referral-intro', '51. Referral Program Intro', 'engagement', 'Referral',
    'Invite a Friend, Get Free Pro', 'Give & Get',
    `<p>Hi {{firstName}},</p>
     <p>Know someone job hunting? Invite them and you BOTH get a free Day Pass.</p>`,
    'Invite Friends', '/referrals'),

  createTemplate('52-referral-milestone', '52. Successful Referral', 'engagement', 'Reward',
    'You\'ve Earned 1 Month Pro!', 'Referral Success 🎁',
    `<p>Hi {{firstName}},</p>
     <p>Your friend joined! We've added 1 month of Professional access to your account.</p>`),

  createTemplate('53-success-card', '53. Shareable Success Card', 'engagement', 'Social',
    'Download Your "All-Star" Badge', 'Show Off Your Score 🌟',
    `<p>Hi {{firstName}},</p>
     <p>Your profile reached All-Star status. Share your badge on LinkedIn.</p>`,
    'Download Badge', '/profile'),

  createTemplate('54-testimonial', '54. Testimonial Request', 'engagement', 'Feedback',
    'Did You Land the Job?', 'We Want to Hear!',
    `<p>Hi {{firstName}},</p>
     <p>Congratulations if you landed a role! Reply and tell us your story.</p>`,
    'Share Story', '/feedback'),

  createTemplate('55-feedback-loop', '55. Feedback Loop', 'engagement', 'Feedback',
    'How Can We Improve?', 'Your Opinion Matters',
    `<p>Hi {{firstName}},</p>
     <p>How can we make CVCircle better for you? Take this 30-second survey.</p>`,
    'Take Survey', '/feedback'),

  createTemplate('56-beta-invite', '56. Beta Tester Invite', 'engagement', 'Beta',
    'Early Access: Networking Tool', 'Be a Beta Tester 🧪',
    `<p>Hi {{firstName}},</p>
     <p>Get exclusive early access to our upcoming Networking features.</p>`,
    'Join Beta', '/beta'),

  createTemplate('57-social-follow', '57. Social Media Follow', 'engagement', 'Social',
    'Connect for Daily Tips', 'Follow CVCircle',
    `<p>Hi {{firstName}},</p>
     <p>Follow us on LinkedIn for daily career tips and hiring trends.</p>`,
    'Follow Us', 'https://linkedin.com/company/cvcircle'),

  createTemplate('58-user-story', '58. User Story Spotlight', 'engagement', 'Content',
    'How Taylor Landed a Role at Pinnacle', 'Inspiration 💡',
    `<p>Hi {{firstName}},</p>
     <p>Read how Taylor used CVCircle to pivot from Marketing to Product Management.</p>`,
    'Read Story', '/blog'),

  createTemplate('59-hiring-trend', '59. Hiring Trend Alert', 'engagement', 'Trends',
    'London is Hiring for FinTech', 'Market Alert 📈',
    `<p>Hi {{firstName}},</p>
     <p>We see a spike in FinTech roles in your area. Get your CV ready.</p>`,
    'See Jobs', '/jobs'),

  createTemplate('60-app-update', '60. App Version Update', 'engagement', 'Update',
    'We Updated the AI Coach', 'New Features 🛠️',
    `<p>Hi {{firstName}},</p>
     <p>Our AI Coach is now smarter and handles behavioral questions better.</p>`,
    'Try It Out', '/interview-prep'),


  // =====================================================
  // Manual Strategic Campaigns (61-100) / NEWSLETTER & RETENTION
  // =====================================================
  // A. Seasonal & Career Events (61-75)
  createTemplate('61-new-year', '61. New Year, New Career', 'newsletter', 'Seasonal',
    'New Year, New Career Goals', 'Make 2026 Your Year 🎆',
    `<p>Hi {{firstName}},</p>
     <p>January is the best time to apply. Make sure your CV is up to date.</p>`,
    'Update CV', '/resumes'),

  createTemplate('62-graduation', '62. Graduation Special', 'newsletter', 'Seasonal',
    'Class of 2026 Special', 'Graduating? 🎓',
    `<p>Hi {{firstName}},</p>
     <p>Congrats grads! Get a special discount on your first month of Pro.</p>`,
    'Get Offer', '/pricing?promo=grad'),

  createTemplate('63-september', '63. Back to Business (Sept)', 'newsletter', 'Seasonal',
    'Back to Business Hiring Surge', 'September Surge 🍂',
    `<p>Hi {{firstName}},</p>
     <p>Hiring picks up in September. Be ready for the rush.</p>`,
    'Prepare CV', '/resumes'),

  createTemplate('64-black-friday', '64. Black Friday Lifetime', 'newsletter', 'Seasonal',
    'Black Friday Lifetime Deal', 'Once a Year Offer 🖤',
    `<p>Hi {{firstName}},</p>
     <p>Get Lifetime Access for just ₹1,999. Do not miss this.</p>`,
    'Get Lifetime', '/pricing?plan=lifetime'),

  createTemplate('65-tax-pivot', '65. Tax Season Pivot', 'newsletter', 'Seasonal',
    'Moving from Finance to Tech?', 'Career Pivot Guide',
    `<p>Hi {{firstName}},</p>
     <p>Thinking of switching industries after tax season? Here is how to rewrite your CV.</p>`,
    'Read Guide', '/blog'),

  createTemplate('66-bonus-season', '66. Bonus Season Nudge', 'newsletter', 'Seasonal',
    'Invest in Yourself', 'Bonus Season is Here',
    `<p>Hi {{firstName}},</p>
     <p>Got your bonus? Invest a tiny fraction in a Lifetime subscription for career security.</p>`,
    'Invest Now', '/pricing'),

  createTemplate('67-environment-day', '67. World Environment Day', 'newsletter', 'Seasonal',
    'Green Finance Opportunities', 'World Environment Day 🌍',
    `<p>Hi {{firstName}},</p>
     <p>Sustainability roles are booming. Tailor your CV for Green jobs.</p>`,
    'See Green Jobs', '/jobs'),

  createTemplate('68-womens-day', '68. International Women\'s Day', 'newsletter', 'Seasonal',
    'Celebrating Women Leaders', 'International Women\'s Day 👩‍💼',
    `<p>Hi {{firstName}},</p>
     <p>Spotlighting successful female leaders using CVCircle to break glass ceilings.</p>`),

  createTemplate('69-cyber-monday', '69. Cyber Monday Flash', 'newsletter', 'Seasonal',
    'Flash Sale: ₹29 Day Pass', '24 Hours Only ⚡',
    `<p>Hi {{firstName}},</p>
     <p>Cyber Monday special: Get a full Day Pass for just ₹29.</p>`,
    'Get Pass', '/pricing?plan=day'),

  createTemplate('70-quarter-review', '70. End of Quarter Review', 'newsletter', 'Seasonal',
    'How many interviews did you land?', 'Quarterly Check-in',
    `<p>Hi {{firstName}},</p>
     <p>Q1 is done. Are you hitting your application targets?</p>`),

  createTemplate('71-summer-intern', '71. Summer Internship Hunt', 'newsletter', 'Seasonal',
    'Summer Internship Guide', 'Students: Start Now ☀️',
    `<p>Hi {{firstName}},</p>
     <p>Summer internships fill up fast. Get your applications in.</p>`),

  createTemplate('72-holiday-network', '72. Holiday Networking', 'newsletter', 'Seasonal',
    'Networking During Holidays', 'Festive Networking 🎄',
    `<p>Hi {{firstName}},</p>
     <p>Don't stop networkng. Holiday parties are great for connection.</p>`),

  createTemplate('73-mid-year', '73. Mid-Year Health Check', 'newsletter', 'Seasonal',
    'Career Health Check', 'Mid-Year Review',
    `<p>Hi {{firstName}},</p>
     <p>Are you on track for your 2026 goals? Take a moment to reflect.</p>`),

  createTemplate('74-salary-negot', '74. Salary Negotiation Week', 'newsletter', 'Seasonal',
    'Negotiate Like a Pro', 'Salary Week 💰',
    `<p>Hi {{firstName}},</p>
     <p>Don't leave money on the table. Use our scripts to negotiate.</p>`,
    'Get Scripts', '/blog'),

  createTemplate('75-recession-proof', '75. Recession-Proof Guide', 'newsletter', 'Seasonal',
    'Recession-Proof Your Career', 'Industry Insights 2026',
    `<p>Hi {{firstName}},</p>
     <p>Which industries are safest in 2026? Check our latest report.</p>`,
    'Read Report', '/reports'),


  // B. Educational & Content (76-90)
  createTemplate('76-master-cv-1', '76. Mastering Master CV', 'newsletter', 'Education',
    'Mastering the Master CV (Part 1)', 'The Foundation',
    `<p>Hi {{firstName}},</p>
     <p>Part 1 of 3: Why keeping a 5-page Master CV saves you hours.</p>`,
    'Read Part 1', '/blog'),

  createTemplate('77-seo-linkedin', '77. SEO for LinkedIn', 'newsletter', 'Education',
    'Deep Dive: LinkedIn Keywords', 'Be Found',
    `<p>Hi {{firstName}},</p>
     <p>Learn exactly where to place keywords for maximum visibility.</p>`),

  createTemplate('78-ats-myths', '78. ATS Myths Debunked', 'newsletter', 'Education',
    '3 ATS Myths That Hurt You', 'Stop Guessing',
    `<p>Hi {{firstName}},</p>
     <p>Myth: ATS robots reject you instantly. Fact: It's about formatting.</p>`),

  createTemplate('79-quantify-impact', '79. Quantifying Impact', 'newsletter', 'Education',
    'Metrics Matter', 'Quantify Your Experience',
    `<p>Hi {{firstName}},</p>
     <p>How to turn "Led a team" into "Led 15 people to 20% growth".</p>`),

  createTemplate('80-skills-search', '80. Choosing Skills', 'newsletter', 'Education',
    'Filling Your Skills Card', 'Strategic Skills',
    `<p>Hi {{firstName}},</p>
     <p>Don't just list everything. Curate your skills for the job.</p>`),

  createTemplate('81-lang-levels', '81. Language Proficiency', 'newsletter', 'Education',
    'Fluent vs. Professional', 'Language Levels Explained',
    `<p>Hi {{firstName}},</p>
     <p>When to say "Fluent" and when to say "Native".</p>`),

  createTemplate('82-extension-power', '82. Power of Chrome Ext', 'newsletter', 'Education',
    'Save 5 Hours a Week', 'Efficiency Hack',
    `<p>Hi {{firstName}},</p>
     <p>See how our Chrome Extension streamlines your workflow.</p>`),

  createTemplate('83-body-language', '83. Interview Body Language', 'newsletter', 'Education',
    'Non-Verbal Cues', 'Interview Tips',
    `<p>Hi {{firstName}},</p>
     <p>Eye contact and posture matter, even on Zoom.</p>`),

  createTemplate('84-advisory-trends', '84. Financial Trends 2026', 'newsletter', 'Education',
    'Financial Advisory Trends', 'Industry Report',
    `<p>Hi {{firstName}},</p>
     <p>What's changing in Finance this year? Stay ahead regarding AI.</p>`),

  createTemplate('85-personal-brand', '85. Personal Branding', 'newsletter', 'Education',
    'Beyond the CV', 'Building a Brand',
    `<p>Hi {{firstName}},</p>
     <p>Your CV is just one document. Your brand is everything online.</p>`),

  createTemplate('86-interests-net', '86. Using Interests', 'newsletter', 'Education',
    'Networking via Interests', 'Small Talk Matters',
    `<p>Hi {{firstName}},</p>
     <p>Use your Interests section to bond with interviewers.</p>`),

  createTemplate('87-cover-personal', '87. Cover Letter Personalization', 'newsletter', 'Education',
    'Why Generic is the Enemy', 'Tailor It',
    `<p>Hi {{firstName}},</p>
     <p>Generic cover letters get ignored. Here is how to stand out.</p>`),

  createTemplate('88-remote-tips', '88. Remote Resume Tips', 'newsletter', 'Education',
    'Remote vs. Hybrid', 'Location Strategy',
    `<p>Hi {{firstName}},</p>
     <p>How to indicate your location preference clearly on your CV.</p>`),

  createTemplate('89-roi-lifetime', '89. ROI of Lifetime', 'upsell', 'Education',
    'Monthly vs Lifetime Cost', 'Do the Math',
    `<p>Hi {{firstName}},</p>
     <p>If you subscribe for 2 years, you pay 3x the Lifetime cost. Save now.</p>`,
    'Get Lifetime', '/pricing'),

  createTemplate('90-founder-msg', '90. Founder Message', 'newsletter', 'Brand',
    'The Story Behind CVCircle', 'From the Founder',
    `<p>Hi {{firstName}},</p>
     <p>I started CVCircle to solve the frustration of lost job applications...</p>`),


  // C. Re-engagement & Win-back (91-100)
  createTemplate('91-missed-you', '91. We Missed You', 'retention', 'Win-back',
    'We Have Missed You', 'It\'s Been a While',
    `<p>Hi {{firstName}},</p>
     <p>We haven't seen you lately. Your career goals are still waiting.</p>`,
    'Come Back', '/dashboard'),

  createTemplate('92-new-features', '92. New Feature Reveal', 'retention', 'Update',
    'You haven\'t seen this yet', 'Big Updates',
    `<p>Hi {{firstName}},</p>
     <p>Since you left, we added LinkedIn Enhancer and AI Interview Prep.</p>`,
    'See What\'s New', '/dashboard'),

  createTemplate('93-winback-discount', '93. Winback Discount', 'retention', 'Discount',
    '50% Off Your Next Month', 'Come Back Offer',
    `<p>Hi {{firstName}},</p>
     <p>Return today and get half off your next month of Pro.</p>`,
    'Claim 50% Off', '/pricing?promo=winback'),

  createTemplate('94-success-roundup', '94. Success Stories', 'retention', 'Social Proof',
    'See Who Got Hired Recently', 'Motivation',
    `<p>Hi {{firstName}},</p>
     <p>Users are landing jobs at top firms every day. Join them.</p>`),

  createTemplate('95-survey-churn', '95. Wait, Don\'t Go Survey', 'retention', 'Survey',
    'Quick Question...', 'Before You Go',
    `<p>Hi {{firstName}},</p>
     <p>We saw you cancelled. Can you tell us why so we can improve?</p>`,
    'Answer 1 Question', '/feedback'),

  createTemplate('96-purge-warning', '96. Account Purge Warning', 'retention', 'Urgency',
    'Account Data Deletion Warning', 'Action Required',
    `<p>Hi {{firstName}},</p>
     <p>We will delete your inactive drafts in 3 days unless you log in to keep them active.</p>`,
    'Keep My Data', '/dashboard'),

  createTemplate('97-comparison', '97. Comparison Update', 'newsletter', 'Competitor',
    '2x Faster than Competitors', 'Speed Matters',
    `<p>Hi {{firstName}},</p>
     <p>Benchmarks show CVCircle generates CVs 2x faster.</p>`),

  createTemplate('98-pivot-motivation', '98. Career Pivot Motivation', 'retention', 'Motivation',
    'Never too late to switch', 'Pivot Your Career',
    `<p>Hi {{firstName}},</p>
     <p>Thinking of a change? The best time is now.</p>`),

  createTemplate('99-audit-offer', '99. Free Audit Offer', 'retention', 'Offer',
    'Free Resume Audit', 'One Time Gift',
    `<p>Hi {{firstName}},</p>
     <p>Use our Editor for free once to check your current CV.</p>`,
    'Audit My CV', '/resumes'),

  createTemplate('100-farewell', '100. Final Farewell', 'retention', 'Goodbye',
    'We\'re Still Here', 'Door is Open',
    `<p>Hi {{firstName}},</p>
     <p>We won't email you again for a while. Good luck out there!</p>`)
];

export const campaignTemplates = templates;

export function getCampaignTemplateById(id: string): CampaignTemplate | undefined {
  return campaignTemplates.find(t => t.id === id);
}

export function getCampaignTemplatesByCategory(category: string): CampaignTemplate[] {
  if (category === 'all') return campaignTemplates;
  return campaignTemplates.filter(t => t.category === category);
}
