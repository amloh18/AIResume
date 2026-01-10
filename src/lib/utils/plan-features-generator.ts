import { PLAN_LIMITS, getPlanLimits } from './subscription-helpers';

export interface PlanFeature {
  text: string;
  icon?: string;
  highlight?: boolean;
}

export function generatePlanFeatures(planKey: string): PlanFeature[] {
  const limits = getPlanLimits(planKey);

  const features: PlanFeature[] = [];

  // Master CV
  features.push({
    text: 'Unlimited Master CV edits',
    highlight: true
  });

  // Standalone CV
  if (limits.maxCVs === -1) {
    features.push({ text: 'Unlimited Standalone CVs' });
  } else {
    features.push({ text: '1st CV free' });
  }

  // Journey CV
  if (limits.activeJourneyCVs === -1) {
    features.push({ text: 'Unlimited Journey CVs', highlight: true });
  } else if (limits.activeJourneyCVs === 50) {
    features.push({ text: '50 Active Journey CVs per month', highlight: true });
  } else {
    features.push({
      text: `${limits.activeJourneyCVs} Active Journey CV${limits.activeJourneyCVs !== 1 ? 's' : ''}`,
      highlight: true
    });
  }

  // Job Tracker
  if (limits.maxJobs === -1) {
    features.push({ text: 'Unlimited Job Applications' });
  } else {
    features.push({ text: `${limits.maxJobs} Job Applications in Tracker` });
  }

  // Downloads
  if (limits.downloads === -1) {
    features.push({ text: 'Unlimited PDF & DOCX Downloads' });
  } else {
    features.push({ text: `${limits.downloads} Downloads per month` });
  }

  // AI Surgeon
  if (limits.aiSurgeonMode === 'full') {
    features.push({ text: 'Full AI Rewrite & Keyword Injection', highlight: true });
  } else {
    features.push({ text: 'Spelling & Grammar Fixes Only' });
  }

  // Cover Letter
  if (limits.coverLetterAI && planKey !== 'day_pass') {
    features.push({ text: 'AI-Generated Cover Letters', highlight: true });
  } else {
    features.push({ text: 'Manual Cover Letter Draft Only' });
  }

  // Premium Templates
  if (limits.premiumTemplates) {
    features.push({ text: 'All Premium Templates' });
  } else {
    features.push({ text: 'Basic Templates Only' });
  }

  // Day Pass specific
  if (planKey === 'day_pass') {
    features.push({ text: '24-Hour Full Access', highlight: true });
    features.push({ text: 'Read-Only Mode After Expiry' });
  }

  // Lifetime specific
  if (limits.hasVault) {
    features.push({ text: 'Career Vault (Permanent Archive)', highlight: true });
    features.push({ text: 'Custom Domain Hosting' });
    features.push({ text: 'Priority Support' });
  }

  return features;
}

export function generateNotIncludedFeatures(planKey: string): string[] {
  const limits = getPlanLimits(planKey);
  const notIncluded: string[] = [];

  if (!limits.premiumTemplates) {
    notIncluded.push('Premium Templates');
  }

  if (limits.aiSurgeonMode !== 'full') {
    notIncluded.push('AI Rewrite & Keyword Injection');
  }

  if (!limits.coverLetterAI) {
    notIncluded.push('AI Cover Letter Generation');
  }

  if (!limits.docxExport) {
    notIncluded.push('DOCX Export');
  }

  if (limits.maxJobs !== -1) {
    notIncluded.push('Unlimited Job Tracking');
  }

  if (limits.activeJourneyCVs !== -1 && limits.activeJourneyCVs < 50) {
    notIncluded.push('Unlimited Journey CVs');
  }

  return notIncluded;
}

