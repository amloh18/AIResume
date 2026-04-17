import { PLAN_LIMITS, getPlanLimits } from './subscription-helpers';

export interface PlanFeature {
  text: string;
  icon?: string;
  highlight?: boolean;
}

export function generatePlanFeatures(planKey: string): PlanFeature[] {
  const features: PlanFeature[] = [];

  const isFree = planKey === 'free';
  const isPaid = !isFree && planKey !== 'day_pass'; // pro_monthly, pro_quarterly, pro_yearly, pro_lifetime

  if (isFree) {
    features.push({ text: 'Access to ALL templates and snippets', highlight: true });
    features.push({ text: 'Application Tracker (Full Kanban access)' });
    features.push({ text: 'Basic Chrome Extension functionality' });
    features.push({ text: 'Basic AI Writing (Grammar & rephrasing)' });
    features.push({ text: 'Limited Free AI Credits' });
  } else if (isPaid || planKey === 'day_pass') {
    features.push({ text: 'Unlimited AI Generation', highlight: true });
    features.push({ text: 'ATS Scoring & Editing (Real-time feedback)' });
    features.push({ text: 'Advanced Sentence Structuring (STAR method)' });
    features.push({ text: 'Unlimited AI Cover Letter Generator' });
    features.push({ text: 'LinkedIn Enhancer (Profile suggestions)' });
    features.push({ text: 'Interview Coach (Mock simulator)' });
    features.push({ text: 'Access to ALL templates and snippets' });
    features.push({ text: 'Application Tracker (Full Kanban access)' });
  }

  // Lifetime specific additional perks
  if (planKey === 'pro_lifetime') {
    features.push({ text: 'Career Vault (Permanent Archive)', highlight: true });
    features.push({ text: 'Priority Support' });
  }

  return features;
}

export function generateNotIncludedFeatures(planKey: string): string[] {
  const notIncluded: string[] = [];

  const isFree = planKey === 'free';

  if (isFree) {
    notIncluded.push('Unlimited AI Generation');
    notIncluded.push('ATS Scoring & Editing');
    notIncluded.push('Advanced Sentence Structuring (STAR method)');
    notIncluded.push('AI Cover Letter Generator');
    notIncluded.push('LinkedIn Enhancer');
    notIncluded.push('Interview Coach Simulator');
  }

  return notIncluded;
}

