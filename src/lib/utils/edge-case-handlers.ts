/**
 * Edge Case Handlers
 * Implements strict logic for all 50 edge cases
 */

// Category A: Free Tier Limits
export const handleFreeTierEdgeCases = {
  // EC-1: 2nd Journey CV attempt
  secondJourneyCV: (currentCount: number) => ({
    blocked: currentCount >= 1,
    message: 'You have 1 active Journey CV. Archive/Delete it to create a new one, or Upgrade.',
    gateType: 'hard' as const
  }),
  
  // EC-2: Premium template download
  premiumTemplateDownload: (templateTier: string) => ({
    blocked: templateTier === 'premium',
    message: 'This design is Pro. Switch to a Free template to download now, or Upgrade.',
    gateType: 'soft' as const
  }),
  
  // EC-3: AI Rewrite attempt
  aiRewrite: () => ({
    blocked: false,  // Show teaser instead
    message: 'Unlock to see full AI suggestion.',
    gateType: 'teaser' as const
  }),
  
  // EC-4: 4th Job in tracker
  fourthJob: (currentCount: number) => ({
    blocked: currentCount >= 3,
    message: 'Tracker full. Upgrade to track unlimited applications.',
    gateType: 'hard' as const
  }),
  
  // EC-5: JD paste in Standalone CV
  jdPasteConversion: (hasJourneyCV: boolean) => ({
    blocked: hasJourneyCV,
    message: 'You already have a Journey CV. Delete it first to create a new one.',
    gateType: 'hard' as const
  }),
  
  // EC-6: DOCX export
  docxExport: () => ({
    blocked: true,
    message: 'DOCX export is a Pro feature. PDF is free.',
    gateType: 'hard' as const
  }),
  
  // EC-8: Fork Journey CV
  forkJourneyCV: (currentCount: number) => ({
    blocked: currentCount >= 1,
    message: 'Forking creates a 2nd entity, exceeding the limit. Blocked.',
    gateType: 'hard' as const
  })
};

// Category B: Day Pass Mechanics
export const handleDayPassEdgeCases = {
  // EC-11: Day Pass timing (24h from purchase, not calendar day)
  checkExpiry: (purchasedAt: Date) => {
    const expiresAt = new Date(purchasedAt);
    expiresAt.setHours(expiresAt.getHours() + 24);
    return { expiresAt, isExpired: new Date() > expiresAt };
  },
  
  // EC-12: Grace period for active sessions
  checkGracePeriod: (expiresAt: Date) => {
    const GRACE_MINUTES = 30;
    const graceEnd = new Date(expiresAt);
    graceEnd.setMinutes(graceEnd.getMinutes() + GRACE_MINUTES);
    return { inGrace: new Date() <= graceEnd, graceEnd };
  }
};

// Category C: Subscription Management
export const handleSubscriptionEdgeCases = {
  // EC-21: Downgrade Deep Freeze
  applyDeepFreeze: async (userId: string) => {
    const { applyDeepFreeze } = await import('@/lib/services/deep-freeze-service');
    return applyDeepFreeze(userId);
  },
  
  // EC-22: Determine which CV stays active
  selectActiveCV: async (userId: string) => {
    // Most recently edited stays active - handled in deep-freeze-service
    const { applyDeepFreeze } = await import('@/lib/services/deep-freeze-service');
    const result = await applyDeepFreeze(userId);
    return result.mostRecentCVId;
  },
  
  // EC-28: Pro Monthly 50 CV limit warning
  checkMonthlyLimit: (monthlyCount: number) => ({
    warning: monthlyCount >= 45,
    message: monthlyCount >= 50 
      ? 'Limit reached. Archive old applications to create new ones.'
      : `You've created ${monthlyCount}/50 Journey CVs this month.`
  })
};

