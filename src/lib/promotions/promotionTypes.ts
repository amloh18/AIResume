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
    title: 'Complete Your Application Package',
    description: 'Add a tailored cover letter to increase your chances of landing the job.',
    benefits: [
      'Stand out from other applicants',
      'Showcase your personality',
      'Address specific job requirements',
    ],
    ctaText: 'Create Cover Letter',
    ctaRoute: '', // Will be dynamically set based on context
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-editing'],
    priority: 10,
    autoDismissMs: 8000,
  },
  {
    id: 'cover-letter-cv-viewing',
    title: 'Add a Cover Letter',
    description: 'Complete your application package with a personalized cover letter.',
    benefits: [
      'Increase application success rate',
      'Show your interest in the role',
      'Highlight key achievements',
    ],
    ctaText: 'Create Cover Letter',
    ctaRoute: '', // Will be dynamically set based on context
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-viewing'],
    priority: 9,
    autoDismissMs: 8000,
  },
  {
    id: 'ats-analysis-job',
    title: 'Optimize Your Resume for ATS',
    description: 'Get your resume ATS-optimized for this specific job posting.',
    benefits: [
      'Increase application success rate',
      'Identify missing keywords',
      'Improve match score',
    ],
    ctaText: 'Run ATS Analysis',
    ctaRoute: '', // Will be dynamically set based on context
    imageUrl: IMAGE_URLS.atsAnalysis,
    contexts: ['job-tracking', 'ats-analysis'],
    priority: 8,
    autoDismissMs: 8000,
  },
  {
    id: 'cv-creation-no-cv',
    title: 'Create Your First CV',
    description: 'Build a professional CV to start tracking your job applications.',
    benefits: [
      'Track applications with CV journeys',
      'Get ATS optimization',
      'Generate tailored cover letters',
    ],
    ctaText: 'Create CV',
    ctaRoute: '/editor?mode=create',
    imageUrl: IMAGE_URLS.cvCreation,
    contexts: ['job-tracking', 'dashboard'],
    priority: 7,
    autoDismissMs: 8000,
  },
  {
    id: 'upgrade-credit-low',
    title: 'Unlock Unlimited Features',
    description: 'You\'re running low on credits. Upgrade to Pro for unlimited access.',
    benefits: [
      'Unlimited job applications',
      'Advanced ATS analysis',
      'Priority support',
    ],
    ctaText: 'Upgrade Now',
    ctaRoute: '/pricing',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-low'],
    priority: 9,
    autoDismissMs: 10000,
  },
  {
    id: 'upgrade-credit-exhausted',
    title: 'Upgrade to Continue',
    description: 'You\'ve used all your credits. Upgrade to Pro for unlimited features.',
    benefits: [
      'Unlimited job applications',
      'Advanced ATS analysis',
      'Priority support',
    ],
    ctaText: 'Upgrade Now',
    ctaRoute: '/pricing',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-exhausted'],
    priority: 10,
    autoDismissMs: 10000,
  },
  {
    id: 'upgrade-free-user',
    title: 'Unlock Premium Features',
    description: 'Upgrade to Pro and unlock powerful features to accelerate your job search.',
    benefits: [
      'Unlimited job tracking',
      'Advanced AI features',
      'Priority support',
    ],
    ctaText: 'View Plans',
    ctaRoute: '/pricing',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['free-user', 'dashboard'],
    priority: 6,
    autoDismissMs: 8000,
  },
  {
    id: 'job-tracking-no-jobs',
    title: 'Start Tracking Your Applications',
    description: 'Track your job applications and manage your job search in one place.',
    benefits: [
      'Organize all your applications',
      'Track application status',
      'Get interview reminders',
    ],
    ctaText: 'Add Job',
    ctaRoute: '/dashboard/tracker?action=add-job',
    imageUrl: IMAGE_URLS.jobTracking,
    contexts: ['dashboard'],
    priority: 5,
    autoDismissMs: 8000,
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

