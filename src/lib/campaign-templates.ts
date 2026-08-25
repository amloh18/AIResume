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

// THEME CONSTANTS - Matching the User Dashboard
const THEME = {
  bg: '#141810', // Deep Dark Green
  surface: '#1a2015', // Slightly Lighter Green-Black
  card: '#20291d', // Card background
  text: '#ffffff',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  accent: '#81ff00', // Neon Lime (from landing page)
  accentSoft: 'rgba(129, 255, 0, 0.1)',
  border: 'rgba(129, 255, 0, 0.1)',
  fontPrimary: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
};

export const BASE_TEMPLATE = (content: string, title: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: ${THEME.bg}; font-family: ${THEME.fontPrimary}; color: ${THEME.text}; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; table-layout: fixed; background-color: ${THEME.bg}; padding-bottom: 60px; }
    .main { max-width: 600px; margin: 0 auto; background-color: ${THEME.surface}; border: 1px solid ${THEME.border}; overflow: hidden; border-radius: 40px; margin-top: 40px; }
    
    /* Header */
    .header { padding: 40px 0; text-align: center; }
    .logo { width: 160px; height: auto; display: inline-block; }
    
    /* Content Blocks */
    .content-block { padding: 50px 40px; border-top: 1px solid ${THEME.border}; }
    .section-title { font-size: 22px; font-weight: 800; margin-bottom: 20px; color: ${THEME.text}; }
    .body-text { color: ${THEME.textMuted}; font-size: 16px; line-height: 1.7; margin-bottom: 24px; font-weight: 400; }
    
    /* Image Container */
    .img-container { margin: 30px 0; border-radius: 24px; overflow: hidden; border: 1px solid ${THEME.border}; background-color: ${THEME.card}; }
    .content-img { width: 100%; height: auto; display: block; }

    /* Hero Section */
    .hero-content { padding: 50px 40px; }
    .hero-tag { display: inline-block; padding: 6px 16px; background: ${THEME.accentSoft}; color: ${THEME.accent}; border: 1px solid ${THEME.accent}; border-radius: 100px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
    .hero-title { font-size: 38px; font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; margin: 0; margin-bottom: 20px; color: ${THEME.text}; }
    .hero-desc { color: ${THEME.textMuted}; font-size: 17px; line-height: 1.6; margin: 0; font-weight: 400; }
    
    /* Founder Letter */
    .founder-letter { background-color: ${THEME.bg}; padding: 35px; border-radius: 24px; border: 1px solid ${THEME.border}; margin: 30px 0; }
    .founder-sig { margin-top: 25px; }
    .founder-name { font-weight: 800; font-size: 16px; display: block; color: ${THEME.text}; }
    .founder-title { font-size: 12px; color: ${THEME.textMuted}; text-transform: uppercase; letter-spacing: 0.05em; }

    /* Button */
    .btn-container { text-align: center; margin-top: 30px; }
    .btn { display: inline-block; background-color: ${THEME.accent}; color: #000; padding: 18px 40px; border-radius: 100px; font-weight: 800; text-decoration: none; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; transition: opacity 0.2s; }
    
    /* Footer */
    .footer { padding: 50px 40px; text-align: center; border-top: 1px solid ${THEME.border}; }
    .footer-text { color: rgba(255, 255, 255, 0.3); font-size: 11px; line-height: 1.8; }
    .footer-links { margin-bottom: 25px; }
    .footer-links a { color: ${THEME.textMuted}; text-decoration: none; margin: 0 10px; font-size: 11px; font-weight: 600; }
    .footer-links a:hover { color: ${THEME.accent}; }
    
    @media only screen and (max-width: 600px) {
      .main { margin-top: 0; border-radius: 0; border: none; }
      .hero-title { font-size: 30px; }
      .hero-content, .content-block { padding: 40px 20px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="{{appUrl}}/images/logo.png" alt="AIResume" class="logo" />
    </div>
    <div class="main">
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <div class="footer-links">
          <a href="{{appUrl}}/dashboard">My Account</a>
          <a href="{{appUrl}}#pricing">Pricing</a>
          <a href="{{appUrl}}/legal">Legal</a>
          <a href="{{unsubscribeUrl}}">Unsubscribe</a>
        </div>
        <p class="footer-text">
          &copy; ${new Date().getFullYear()} AIResume. Helping you land your dream job.<br/>
          London, United Kingdom
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const createSimpleTemplate = (
  id: string,
  name: string,
  category: CampaignTemplate['category'],
  hero: { tag: string; title: string; desc: string; img?: string },
  sections: Array<{ title: string; content: string }>,
  cta?: { text: string; link: string },
  extra?: Partial<CampaignTemplate>
): CampaignTemplate => {
  let html = `
    <div class="hero-content">
      <div class="hero-tag">${hero.tag}</div>
      <h1 class="hero-title">${hero.title}</h1>
      ${hero.img ? `
        <div class="img-container">
          <img src="{{appUrl}}/images/${hero.img}" alt="Visual" class="content-img" />
        </div>
      ` : ''}
      <p class="hero-desc">${hero.desc}</p>
    </div>
  `;

  sections.forEach(section => {
    html += `
      <div class="content-block">
        <h3 class="section-title">${section.title}</h3>
        <div class="body-text">${section.content}</div>
      </div>
    `;
  });

  if (cta) {
    html += `
      <div class="content-block" style="text-align: center; border-top: none; padding-top: 0;">
        <a href="{{appUrl}}${cta.link}" class="btn">${cta.text}</a>
      </div>
    `;
  }

  return {
    id,
    name,
    description: hero.title,
    category,
    scenario: hero.tag,
    subjectTemplate: extra?.subjectTemplate || hero.title,
    htmlContent: BASE_TEMPLATE(html, hero.title),
    ...extra
  };
};

const templates: CampaignTemplate[] = [
  // 1. WELCOME - FOUNDER LETTER
  createSimpleTemplate('welcome-founder', 'Welcome from the CEO', 'onboarding', 
    { 
      tag: 'Welcome', 
      title: 'You’re in!', 
      desc: 'Thanks for joining AIResume. We’re here to help you get hired faster.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'A Note from our Founder',
        content: `
          <div class="founder-letter">
            <p style="color: ${THEME.text};">Hi there,</p>
            <p style="color: ${THEME.text};">I started AIResume because I know how frustrating job hunting can be. The constant rewriting, the black-hole of applications, and the uncertainty are exhausting.</p>
            <p style="color: ${THEME.text};">Our goal is simple: to give you the tools that actually work. Whether it’s our AI builder, the LinkedIn optimizer, or the interview coach, we’ve built everything to give you a real edge.</p>
            <p style="color: ${THEME.text};">I’m glad you’re here. Let’s get you that next role.</p>
            <div class="founder-sig">
              <span class="founder-name">Amarjot Lohia</span>
              <span class="founder-title">Founder & CEO, AIResume</span>
            </div>
          </div>
        `
      }
    ],
    { text: 'Go to Dashboard', link: '/dashboard' },
    { subjectTemplate: 'Welcome to AIResume (Message from our CEO)' }
  ),

  // 2. CHROME EXTENSION
  createSimpleTemplate('extension-nudge', 'The 1-Click Job Saver', 'onboarding',
    {
      tag: 'New Tool',
      title: 'Save jobs instantly',
      desc: 'Stop copying and pasting job links. Do it all with one click.',
      img: 'extension.webp'
    },
    [
      {
        title: 'How it works',
        content: `
          <p>Install our Chrome Extension and you can save jobs directly from LinkedIn, Indeed, and more. It adds them to your tracker and even helps you tailor your CV for that specific job right then and there.</p>
        `
      }
    ],
    { text: 'Get the Extension', link: '/extension' },
    { subjectTemplate: 'The easiest way to track your job search 🖱️' }
  ),

  // 3. BUILD FIRST CV
  createSimpleTemplate('build-first-cv', 'Time to build your CV', 'onboarding',
    {
      tag: 'Getting Started',
      title: 'Create your first CV',
      desc: 'Your profile is ready. Now let’s build a resume that gets noticed.',
      img: 'ats_optimization.webp'
    },
    [
      {
        title: 'Beat the bots',
        content: `
          <p>Our templates are designed to pass through ATS filters (the "robots" that scan resumes) and look great to human recruiters. It only takes a few minutes to start.</p>
        `
      }
    ],
    { text: 'Start My CV', link: '/resumes/new' },
    { subjectTemplate: 'Ready to build your new resume? 🛠️' }
  ),

  // 4. AI SCORING
  createSimpleTemplate('ai-score-gamification', 'Check your CV score', 'engagement',
    {
      tag: 'Free Tool',
      title: 'How strong is your CV?',
      desc: 'Get an instant grade on your resume and see exactly how to improve it.',
      img: 'ats_optimization.webp'
    },
    [
      {
        title: 'See what recruiters see',
        content: `
          <p>Our AI analyzes your CV for keywords, formatting, and impact. We’ll give you a score out of 100 and a checklist of things to fix to get it higher.</p>
        `
      }
    ],
    { text: 'Check My Score', link: '/resumes' },
    { subjectTemplate: 'What’s your CV score? 📈' }
  ),

  // 5. TAILORED COVER LETTERS
  createSimpleTemplate('cover-letter-reveal', 'The Cover Letter Secret', 'engagement',
    {
      tag: 'AI Feature',
      title: 'Letters that land interviews',
      desc: 'Stop sending the same cover letter to everyone. Tailor them in seconds.',
      img: 'herobanner.webp'
    },
    [
      {
        title: 'No more generic writing',
        content: `
          <p>Tell our AI which job you’re applying for, and we’ll write a cover letter that matches your experience to the job requirements perfectly.</p>
        `
      }
    ],
    { text: 'Write a Cover Letter', link: '/cover-letters' },
    { subjectTemplate: 'Write a better cover letter in 10 seconds ✍️' }
  ),

  // 6. LINKEDIN ENHANCER
  createSimpleTemplate('linkedin-enhancer', 'Fix your LinkedIn', 'engagement',
    {
      tag: 'Social Profile',
      title: 'Get found by recruiters',
      desc: 'Optimize your LinkedIn profile so you show up in more searches.',
      img: 'linkedin_enhancer.webp'
    },
    [
      {
        title: 'SEO for your career',
        content: `
          <p>Recruiters use keywords to find candidates. We’ll show you exactly which words to add to your headline and about section to get more profile views.</p>
        `
      }
    ],
    { text: 'Optimize My LinkedIn', link: '/linkedin-enhancer' },
    { subjectTemplate: 'Is your LinkedIn profile working? 🔍' }
  ),

  // 7. INTERVIEW COACH
  createSimpleTemplate('interview-coach', 'Practice for the big day', 'engagement',
    {
      tag: 'Interview Prep',
      title: 'Fail in private, win in public',
      desc: 'Practice your interview answers with our AI and get instant feedback.',
      img: 'interviwcoach.webp'
    },
    [
      {
        title: 'Be ready for anything',
        content: `
          <p>Our AI coach asks you questions based on the job description and gives you tips on your tone, confidence, and how to improve your answers.</p>
        `
      }
    ],
    { text: 'Start Mock Interview', link: '/interview-prep' },
    { subjectTemplate: 'Practice your next interview with AI 🎤' }
  ),

  // 8. SKILL GAP ANALYSIS
  createSimpleTemplate('skill-gap', 'Missing skills alert', 'trigger',
    {
      tag: 'Career Insight',
      title: 'Close the gap',
      desc: 'We found a few skills missing from your profile that recruiters are looking for.',
      img: 'skill_gap_analysis.webp'
    },
    [
      {
        title: 'The "Perfect" Candidate',
        content: `
          <p>We compared your CV to your target jobs. Adding these few skills could significantly increase your chances of getting an interview.</p>
        `
      }
    ],
    { text: 'See My Skill Gaps', link: '/dashboard' },
    { subjectTemplate: 'Important: Skills missing from your profile' }
  ),

  // 9. DAY PASS OFFER
  createSimpleTemplate('day-pass', 'Try Pro for ₹29', 'upsell',
    {
      tag: 'Special Access',
      title: 'Unlimited access for a day',
      desc: 'Unlock everything for 24 hours. Just ₹29 for a full day of productivity.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Apply like a pro',
        content: `
          <p>Get unlimited CV exports and all AI features for 24 hours. It’s the best way to get all your applications done in one go.</p>
        `
      }
    ],
    { text: 'Get 24h Access', link: '/pricing' },
    { subjectTemplate: 'Unlock everything for just ₹29 ⚡' }
  ),

  // 10. PRO MONTHLY
  createSimpleTemplate('pro-monthly', 'The Focused Plan', 'upsell',
    {
      tag: 'Go Premium',
      title: 'Take the limits off',
      desc: 'Get full access to all AI tools and templates for just $9.99/month.',
      img: 'gain_your_edge.webp'
    },
    [
      {
        title: 'What’s included',
        content: `
          <p>• Unlimited AI Generation<br/>• Full Application Tracker<br/>• LinkedIn Optimizer<br/>• AI Interview Coach</p>
        `
      }
    ],
    { text: 'Upgrade My Plan', link: '/pricing' },
    { subjectTemplate: 'Land your dream job faster with Pro 🚀' }
  ),

  // 11. QUARTERLY SAVINGS
  createSimpleTemplate('quarterly-discount', 'Smart Quarterly Savings', 'upsell',
    {
      tag: 'Best Value',
      title: 'Save 15% on Pro',
      desc: 'The average job search takes 3 months. Our Quarterly plan is built for you.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Why choose Quarterly?',
        content: `
          <p>You get all the Pro features at a lower monthly price ($59.99/quarter). It’s perfect for staying focused until you land that offer.</p>
        `
      }
    ],
    { text: 'Save 15% Now', link: '/pricing' },
    { subjectTemplate: 'A smarter way to pay for Pro 💰' }
  ),

  // 12. STARTER YEARLY
  createSimpleTemplate('starter-yearly', 'Starter Yearly (50% Off)', 'upsell',
    {
      tag: 'Limited Offer',
      title: 'Get 50% Off Yearly',
      desc: 'Only $39.99 for the whole year. Our most affordable premium plan.',
      img: 'global_opportunities.webp'
    },
    [
      {
        title: 'Essential Premium',
        content: `
          <p>Includes Live ATS scoring and the AI Cover Letter generator. Everything you need to get your applications right, for half the price.</p>
        `
      }
    ],
    { text: 'Claim 50% Discount', link: '/pricing' },
    { subjectTemplate: 'Special: 50% off AIResume Starter Yearly' }
  ),

  // 13. APP TRACKER
  createSimpleTemplate('app-tracker', 'Your Application Tracker', 'engagement',
    {
      tag: 'Stay Organized',
      title: 'Track every application',
      desc: 'Stop losing track of where you applied. Use our dashboard to manage it all.',
      img: 'career_insights.webp'
    },
    [
      {
        title: 'Never miss an update',
        content: `
          <p>Our tracker shows you exactly which stage you’re at for every job. It’s the best way to stay organized and keep the momentum going.</p>
        `
      }
    ],
    { text: 'Open My Tracker', link: '/tracker' },
    { subjectTemplate: 'Organize your job search today 📊' }
  ),

  // 14. WEEKLY REPORT
  createSimpleTemplate('weekly-report', 'Your Weekly Review', 'engagement',
    {
      tag: 'Progress Report',
      title: 'Your week in numbers',
      desc: 'Here’s a look at what you accomplished over the last 7 days.',
      img: 'career_insights.webp'
    },
    [
      {
        title: 'Quick Stats',
        content: `
          <p>• <strong>{{cvCount}}</strong> CVs created<br/>• <strong>{{jobCount}}</strong> Jobs tracked<br/>• <strong>{{scoreAvg}}%</strong> Average CV score</p>
        `
      }
    ],
    { text: 'View Full Dashboard', link: '/dashboard' },
    { subjectTemplate: 'How did your week go? 📈' }
  ),

  // 15. PAYMENT SUCCESS
  createSimpleTemplate('payment-success', 'Payment Received', 'transactional',
    {
      tag: 'Confirmation',
      title: 'Welcome to the Pro team',
      desc: 'We’ve received your payment. Your premium features are now active.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Your Plan Details',
        content: `
          <p>Plan: <strong>{{planName}}</strong><br/>Status: <strong>Active</strong><br/>Renewal Date: <strong>{{nextBillingDate}}</strong></p>
        `
      }
    ],
    { text: 'Go to Dashboard', link: '/dashboard' },
    { subjectTemplate: 'Your payment was successful! ✅' }
  ),

  // 16. PAYMENT FAILED
  createSimpleTemplate('payment-failed', 'Payment Failed Alert', 'transactional',
    {
      tag: 'Action Required',
      title: 'Payment didn’t go through',
      desc: 'We had trouble renewing your subscription. Please check your card.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Don’t lose your access',
        content: `
          <p>Your premium features will be paused in 24 hours. Update your billing info now to keep using our AI tools.</p>
        `
      }
    ],
    { text: 'Update Billing', link: '/settings/billing' },
    { subjectTemplate: 'Action Required: Your subscription renewal failed ⚠️' }
  ),

  // 17. SUBSCRIPTION EXPIRING
  createSimpleTemplate('sub-expiring', 'Subscription Renewal', 'upsell',
    {
      tag: 'Reminder',
      title: 'Your access is ending',
      desc: 'Your Pro membership will expire in 3 days. Renew now to stay on top.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Stay ahead of the crowd',
        content: `
          <p>Don’t lose your application history and AI access. Renew today and keep your job search moving forward.</p>
        `
      }
    ],
    { text: 'Renew Now', link: '/settings/billing' },
    { subjectTemplate: 'Your Pro access expires in 72 hours ⏳' }
  ),

  // 18. REFERRAL PROGRAM
  createSimpleTemplate('referral-intro', 'Give a Day Pass', 'engagement',
    {
      tag: 'Invite Friends',
      title: 'Sharing is winning',
      desc: 'Invite a friend to AIResume and we’ll give you both a free Day Pass.',
      img: 'global_opportunities.webp'
    },
    [
      {
        title: 'Free Pro access',
        content: `
          <p>When your friend signs up with your link, you both get 24 hours of unlimited premium access for free. It’s that simple.</p>
        `
      }
    ],
    { text: 'Get My Link', link: '/referrals' },
    { subjectTemplate: 'Get free Pro access for you and a friend 🎁' }
  ),

  // 19. SUCCESS STORY REQUEST
  createSimpleTemplate('success-request', 'Did you get hired?', 'engagement',
    {
      tag: 'We Care',
      title: 'How’s the new job?',
      desc: 'We love hearing when our members land their dream roles.',
      img: 'herobanner.webp'
    },
    [
      {
        title: 'Share your story',
        content: `
          <p>If AIResume helped you get hired, we’d love to hear about it. Reply to this email or click below to tell us your success story.</p>
        `
      }
    ],
    { text: 'Tell Us More', link: '/feedback' },
    { subjectTemplate: 'How is the new job going? 🥂' }
  ),

  // 20. NEW FEATURE ANNOUNCEMENT
  createSimpleTemplate('new-feature', 'New Feature Live', 'retention',
    {
      tag: 'Update',
      title: 'A new way to get hired',
      desc: 'We just added a major new tool to AIResume. Come check it out!',
      img: 'career_insights.webp'
    },
    [
      {
        title: 'Introducing: {{featureName}}',
        content: `
          <p>We’re constantly improving the platform to help you land offers faster. Try out our latest update on your dashboard now.</p>
        `
      }
    ],
    { text: 'Try it out', link: '/dashboard' },
    { subjectTemplate: 'New: {{featureName}} is now live' }
  ),

  // 21. CAREER PIVOT GUIDE
  createSimpleTemplate('career-pivot', 'Switching Careers?', 'newsletter',
    {
      tag: 'Pro Tips',
      title: 'Master the career pivot',
      desc: 'How to switch industries without starting from the bottom.',
      img: 'career_insights.webp'
    },
    [
      {
        title: 'Use your experience',
        content: `
          <p>Learn how to rewrite your CV to highlight skills that work in any industry. You have more value than you think!</p>
        `
      }
    ],
    { text: 'Read the Guide', link: '/blog' },
    { subjectTemplate: 'Thinking of a career change? Read this.' }
  ),

  // 22. SPECIAL OFFER
  createSimpleTemplate('special-offer', 'Limited Time Sale', 'newsletter',
    {
      tag: 'Flash Sale',
      title: 'Our biggest deal yet',
      desc: 'For a limited time, get up to 50% off all premium plans.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: 'Don’t miss out',
        content: `
          <p>Whether you need a month of Pro or want Lifetime access, now is the time to buy. This offer ends very soon.</p>
        `
      }
    ],
    { text: 'See the Deals', link: '/pricing' },
    { subjectTemplate: 'Final Call: 50% Off AIResume ⌛' }
  ),

  // 23. MID-YEAR REVIEW
  createSimpleTemplate('mid-year-check', 'Mid-Year Check-in', 'engagement',
    {
      tag: 'Stay on Track',
      title: 'Are you hitting your goals?',
      desc: 'Half the year is gone. Let’s make sure you get that new role in 2026.',
      img: 'career_insights.webp'
    },
    [
      {
        title: 'Refresh your strategy',
        content: `
          <p>Take a moment to update your CV and check your tracking dashboard. A small tweak now could mean a job offer next month.</p>
        `
      }
    ],
    { text: 'Update My CV', link: '/dashboard' },
    { subjectTemplate: 'Mid-Year Career Health Check' }
  ),

  // 24. WE MISSED YOU
  createSimpleTemplate('re-engagement', 'Come Back Special', 'retention',
    {
      tag: 'Special Offer',
      title: 'We miss you!',
      desc: 'It’s been a while. Here is a little something to help you get back on track.',
      img: 'herobanner_opt.webp'
    },
    [
      {
        title: '7 Days of Pro on us',
        content: `
          <p>We’ve added 7 days of free Pro access to your account. Log in today to resume your job search with all our premium tools.</p>
        `
      }
    ],
    { text: 'Resume My Search', link: '/dashboard' },
    { subjectTemplate: 'We’ve added 7 days of Pro to your account' }
  ),

  // 25. FEEDBACK SURVEY
  createSimpleTemplate('feedback-survey', 'Help us improve', 'engagement',
    {
      tag: 'Your Opinion',
      title: 'How can we do better?',
      desc: 'We’re building AIResume for you, so we want to hear what you think.',
      img: 'herobanner.webp'
    },
    [
      {
        title: '30-second survey',
        content: `
          <p>What feature do you want to see next? Take our quick survey and help us build the best career tool in the world.</p>
        `
      }
    ],
    { text: 'Take the Survey', link: '/feedback' },
    { subjectTemplate: 'Quick question: How can we help you more?' }
  )
];

export const campaignTemplates = templates;

export function getCampaignTemplateById(id: string): CampaignTemplate | undefined {
  return campaignTemplates.find(t => t.id === id);
}

export function getCampaignTemplatesByCategory(category: string): CampaignTemplate[] {
  if (category === 'all') return campaignTemplates;
  return campaignTemplates.filter(t => t.category === category);
}
