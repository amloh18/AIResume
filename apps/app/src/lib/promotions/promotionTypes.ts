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
    title: 'Complete the Winning Duo',
    description: 'A great CV tells them what you\'ve done. A tailored cover letter tells them why you\'re the one. Let\'s draft a narrative that sticks.',
    benefits: [
      'AI-generated based on your exact profile',
      'Tailored to this specific job description',
      'Stand out from 90% of other applicants'
    ],
    ctaText: 'Draft Cover Letter',
    ctaRoute: 'action:open-cover-letter',
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-editing'],
    priority: 10,
    autoDismissMs: 15000,
    cooldownDays: 1,
  },
  {
    id: 'cover-letter-cv-viewing',
    title: 'Your Story, Perfected',
    description: 'Don\'t leave your application half-finished. A personalized cover letter bridges the gap between your resume and the hiring manager.',
    benefits: [
      'Showcase your personality and "why"',
      'Directly address job requirements',
      'Professional formatting that matches your CV'
    ],
    ctaText: 'Add Cover Letter',
    ctaRoute: 'action:open-cover-letter',
    imageUrl: IMAGE_URLS.coverLetter,
    contexts: ['cv-viewing'],
    priority: 9,
    autoDismissMs: 15000,
    cooldownDays: 1,
  },
  {
    id: 'ats-analysis-job',
    title: 'Is Your Resume Invisible?',
    description: '75% of resumes are filtered out by ATS before a human ever sees them. Scan your CV against this job to ensure you make the cut.',
    benefits: [
      'Find missing industry keywords',
      'Identify formatting red flags',
      'Get an instant ATS match score'
    ],
    ctaText: 'Scan for ATS Match',
    ctaRoute: 'action:open-ats-scanner',
    imageUrl: IMAGE_URLS.atsAnalysis,
    contexts: ['job-tracking', 'ats-analysis'],
    priority: 8,
    autoDismissMs: 15000,
    cooldownDays: 2,
  },
  {
    id: 'cv-creation-no-cv',
    title: 'Build Your Foundation',
    description: 'Tracking jobs is easier when you have a Master CV to pull from. Build your professional foundation in minutes with our AI assistant.',
    benefits: [
      'Auto-fill job applications later',
      'One-click tailoring for any role',
      'Professional, recruiter-vetted formats'
    ],
    ctaText: 'Create Master CV',
    ctaRoute: '/editor',
    imageUrl: IMAGE_URLS.cvCreation,
    contexts: ['job-tracking', 'dashboard'],
    priority: 7,
    autoDismissMs: 15000,
    cooldownDays: 5,
  },
  {
    id: 'upgrade-credit-low',
    title: 'Keep Your Edge Sharp',
    description: 'You\'re doing great, but your AI credits are running low. Upgrade to Pro for unlimited tailoring and never miss an opportunity.',
    benefits: [
      'Unlimited AI Resume Tailoring',
      'Unlimited Cover Letters',
      'Early access to new AI features'
    ],
    ctaText: 'Go Pro & Save',
    ctaRoute: 'payment-modal:focused_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-low'],
    priority: 9,
    autoDismissMs: 20000,
    cooldownDays: 1,
  },
  {
    id: 'upgrade-credit-exhausted',
    title: 'Don\'t Let the Momentum Stop',
    description: 'You\'ve reached your free limit. Pro members get hired 3x faster with unlimited access to our full AI toolkit.',
    benefits: [
      'Unlimited Smart Tailoring',
      'Deep ATS Optimization',
      'Priority AI Processing'
    ],
    ctaText: 'Unlock Unlimited Access',
    ctaRoute: 'payment-modal:focused_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['credit-exhausted'],
    priority: 10,
    autoDismissMs: 30000,
    cooldownDays: 0.5,
  },
  {
    id: 'upgrade-free-user',
    title: 'Land Your Dream Role Faster',
    description: 'Stop sending the same resume everywhere. Pro users use AI to tailor every application and get 3x more interviews.',
    benefits: [
      'Unlimited Smart Tailoring',
      'Deep ATS Optimization',
      'Premium Resume Templates'
    ],
    ctaText: 'Supercharge My Search',
    ctaRoute: 'payment-modal:focused_monthly',
    imageUrl: IMAGE_URLS.upgrade,
    contexts: ['free-user'],
    priority: 6,
    autoDismissMs: 25000,
    cooldownDays: 3,
  },
  {
    id: 'job-tracking-no-jobs',
    title: 'The Smarter Way to Search',
    description: 'Spreadsheets are for accounting. Use our Job Tracker to manage your pipeline, deadlines, and follow-ups in one place.',
    benefits: [
      'Visual Kanban progress board',
      'Save jobs from any website',
      'Never miss a follow-up deadline'
    ],
    ctaText: 'Add Your First Job',
    ctaRoute: '/dashboard/jobs?tab=applications&newJob=1',
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

