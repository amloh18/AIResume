// @ts-nocheck
'use client';

import { useMemo } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { useCredits } from '@/lib/hooks/useCredits';
import type { PromotionContext } from '@/lib/promotions/promotionTypes';

interface PromotionContextData {
  contexts: PromotionContext[];
  cvId?: string;
  jobId?: string;
  journeyId?: string;
  coverLetterId?: string;
  hasCoverLetter: boolean;
  hasCV: boolean;
  hasJobs: boolean;
  isFreeUser: boolean;
  isPaidUser: boolean;
  isAdmin: boolean;
  isB2B: boolean;
  creditPercentage: number;
  creditsExhausted: boolean;
}

export function usePromotionContext(): PromotionContextData {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useUnifiedAuth();
  const { credits, isLoading: creditsLoading } = useCredits();

  return useMemo(() => {
    const contexts: PromotionContext[] = [];
    let cvId: string | undefined;
    let jobId: string | undefined;
    let journeyId: string | undefined;
    let coverLetterId: string | undefined;
    let hasCoverLetter = false;
    let hasCV = false;
    let hasJobs = false;
    let isFreeUser = false;
    let isPaidUser = false;
    let isAdmin = false;
    let isB2B = false;
    let creditPercentage = 100;
    let creditsExhausted = false;

    // Check user roles and special statuses
    if (user) {
      isAdmin = user.role === 'admin' || user.role === 'superadmin';
      isB2B = !!user.b2b?.tenantId;
    }

    // Extract IDs from URL params
    cvId = searchParams?.get('cvId') || undefined;
    jobId = searchParams?.get('jobId') || undefined;
    journeyId = searchParams?.get('journeyId') || undefined;
    coverLetterId = searchParams?.get('coverLetterId') || undefined;

    // Detect route-based contexts
    if (pathname) {
      if (pathname.includes('/editor')) {
        const mode = searchParams?.get('mode');
        if (mode === 'edit' || mode === 'edit-master' || mode === 'journey') {
          contexts.push('cv-editing');
        } else if (mode === 'create') {
          // Creating new CV
        }
      } else if (pathname.includes('/studio')) {
        const documentType = searchParams?.get('documentType');
        if (documentType === 'cv') {
          contexts.push('cv-editing');
        } else if (documentType === 'cl') {
          contexts.push('cover-letter-editing');
        }
      } else if (pathname.includes('/editor')) {
        contexts.push('cv-viewing');
      } else if (pathname.includes('/dashboard/tracker') || pathname.includes('/jobs')) {
        contexts.push('job-tracking');
      } else if (pathname.includes('/dashboard')) {
        contexts.push('dashboard');
      }
    }

    // Check user subscription status
    const paidPlans = ['pro_monthly', 'pro_quarterly', 'pro_yearly', 'pro_lifetime'];
    if (user?.currentPlanKey) {
      isFreeUser = user.currentPlanKey === 'free';
      isPaidUser = paidPlans.includes(user.currentPlanKey);
      if (isFreeUser) {
        contexts.push('free-user');
      }
    }

    // Check credit levels - only for users with limited credits (not unlimited)
    if (!creditsLoading && credits) {
      const jobCredits = credits.jobCredits;
      const jobLimit = credits.jobLimit;
      const userPlan = credits.planKey || user?.currentPlanKey;

      // Only check credit levels for free users or users with limited credits
      // Paid plans (pro_monthly, pro_quarterly, pro_lifetime) have unlimited credits (limit === -1)
      if (jobLimit !== -1 && jobCredits !== undefined && userPlan === 'free') {
        creditPercentage = (jobCredits / jobLimit) * 100;
        
        if (jobCredits <= 0) {
          creditsExhausted = true;
          contexts.push('credit-exhausted');
        } else if (creditPercentage < 20) {
          contexts.push('credit-low');
        }
      }
    }

    // Note: hasCoverLetter, hasCV, hasJobs would need to be passed as props
    // or fetched from API. For now, we'll infer from URL params
    if (coverLetterId) {
      hasCoverLetter = true;
    }
    if (cvId) {
      hasCV = true;
    }

    // If we have a journeyId, we likely have both CV and job
    if (journeyId) {
      hasCV = true;
      hasJobs = true;
    }

    return {
      contexts,
      cvId,
      jobId,
      journeyId,
      coverLetterId,
      hasCoverLetter,
      hasCV,
      hasJobs,
      isFreeUser,
      isPaidUser,
      isAdmin,
      isB2B,
      creditPercentage,
      creditsExhausted,
    };
  }, [pathname, searchParams, user, credits, creditsLoading]);
}

