import type { PromotionConfig } from '@/contexts/FeaturePromotionContext';

export type PromotionContext =
  | 'cv-editing'
  | 'cv-viewing'
  | 'job-tracking'
  | 'cover-letter-editing'
  | 'ats-analysis'
  | 'credit-low'
  | 'credit-exhausted'
  | 'free-user'
  | 'dashboard';

// Image URLs from Unsplash (free, high-quality images)
const IMAGE_URLS = {
  coverLetter: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=400&h=300&fit=crop',
  atsAnalysis: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
  upgrade: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
  jobTracking: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=300&fit=crop',
  cvCreation: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=300&fit=crop',
};

export const PROMOTION_TYPES: PromotionConfig[] = [
  {
    id: 'cover-letter-cv-editing',
    title: 'Nail the Introduction',
    description: 'A great CV deserves a tailored cover letter. Generate one instantly based on your profile.',
    benefits: [
      'Matches your exact CV data',
      'AI-tailored for the specific role',
      'Boosts callback rates by 40%'
    ],
    ctaText: 'Generate Cover Letter',
    ctaRoute: 'action:open-cover-letter',
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-editing'],
    priority: 10,
    autoDismissMs: 15000,
  },
  {
    id: 'cover-letter-cv-viewing',
    title: 'Complete Your Application',
    description: 'Don\'t stop at the CV. Attach a personalized cover letter to stand out.',
    benefits: [
      'Increase application success rate',
      'Show genuine interest in the role',
      'Highlight key achievements'
    ],
    ctaText: 'Write Cover Letter',
    ctaRoute: 'action:open-cover-letter',
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-viewing'],
    priority: 9,
    autoDismissMs: 15000,
  },
  {
    id: 'ats-analysis-job',
    title: 'Beat the ATS Robot',
    description: 'Ensure your resume gets seen by a human. Run an instant ATS match against this job.',
    benefits: [
      'Uncover missing keywords',
      'Fix formatting issues',
      'Get actionable improvements'
    ],
    ctaText: 'Scan Resume',
    ctaRoute: 'action:open-ats-scanner',
    imageUrl: IMAGE_URLS.atsAnalysis,
    contexts: ['job-tracking', 'ats-analysis'],
    priority: 8,
    autoDismissMs: 15000,
  },
  {
    id: 'cv-creation-no-cv',
    title: 'Build Your Master CV',
    description: 'Start tracking jobs the right way. Build a professional CV in minutes.',
    benefits: [
      'Auto-fill applications',
      'ATS-friendly formats',
      'AI content suggestions'
    ],
    ctaText: 'Create CV',
    ctaRoute: '/editor',
    imageUrl: IMAGE_URLS.cvCreation,
    contexts: ['job-tracking', 'dashboard'],
    priority: 7,
    autoDismissMs: 15000,
  },
  {
    id: 'upgrade-credit-low',
    title: 'Keep the Momentum Going',
    description: 'You\'re running low on credits. Upgrade to Pro for unlimited AI tailoring and job tracking.',
    benefits: [
      'Unlimited tailored resumes',
      'Unlimited cover letters',
      'Priority 24/7 support'
    ],
    ctaText: 'Upgrade to Pro',
    ctaRoute: 'payment-modal:pro_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-low'],
    priority: 9,
    autoDismissMs: 20000,
  },
  {
    id: 'upgrade-credit-exhausted',
    title: 'Action Required: Out of Credits',
    description: 'You\'ve used all your AI credits. Upgrade to Pro to continue generating tailored content.',
    benefits: [
      'Unlimited tailored resumes',
      'Unlimited cover letters',
      'Priority 24/7 support'
    ],
    ctaText: 'Upgrade to Pro',
    ctaRoute: 'payment-modal:pro_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-exhausted'],
    priority: 10,
    autoDismissMs: 30000,
  },
  {
    id: 'upgrade-free-user',
    title: 'Supercharge Your Job Search',
    description: 'Tired of applying into the void? Pro users get hired 3x faster with our AI toolkit.',
    benefits: [
      'Unlimited AI resume tailoring',
      'Advanced ATS analysis',
      'Automated cover letters'
    ],
    ctaText: 'Unlock Premium',
    ctaRoute: 'payment-modal:pro_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['free-user', 'dashboard'],
    priority: 6,
    autoDismissMs: 15000,
  },
  {
    id: 'job-tracking-no-jobs',
    title: 'Stop Losing Track of Apps',
    description: 'Manage your job search pipeline efficiently in one organized board.',
    benefits: [
      'Track status and deadlines',
      'Get interview reminders',
      'Analyze application success'
    ],
    ctaText: 'Add First Job',
    ctaRoute: '/dashboard/tracker?action=add-job',
    imageUrl: IMAGE_URLS.jobTracking,
    contexts: ['dashboard'],
    priority: 5,
    autoDismissMs: 15000,
  },
];

// Helper to get promotion by ID
export function getPromotionById(id: string): PromotionConfig | undefined {
  return PROMOTION_TYPES.find((p) => p.id === id);
}

// Helper to get promotions by context
export function getPromotionsByContext(context: PromotionContext): PromotionConfig[] {
  return PROMOTION_TYPES.filter((p) => p.contexts.includes(context));
}

// Helper to get all promotion IDs
export function getAllPromotionIds(): string[] {
  return PROMOTION_TYPES.map((p) => p.id);
}

