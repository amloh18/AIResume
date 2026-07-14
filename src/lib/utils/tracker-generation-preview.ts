import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { TrackerCreatedStagePreview } from '@/lib/utils/tracker-created-stage-modal';

export const loadTrackerGenerationPreview = async (userId: string | undefined): Promise<TrackerCreatedStagePreview> => {
  if (!userId) {
    return getFallbackPreview();
  }

  try {
    const response = await authenticatedFetch('/api/jobs/tracker-generation-preview');
    const result = await response.json();
    const preview = result?.preview;

    if (result?.success && preview) {
      return {
        mode: preview.mode,
        entitlementReasonCode: result.entitlementReasonCode,
        title: preview.title,
        summary: preview.summary,
        supportMessage: preview.supportMessage,
        aiCreditsRemaining: preview.aiCreditsRemaining,
        aiCreditsLimit: preview.aiCreditsLimit,
        isTailoredEligible: preview.isTailoredEligible
      };
    }
  } catch (error) {
    console.error('Failed to load tracker generation preview:', error);
  }

  return getFallbackPreview();
};

const getFallbackPreview = (): TrackerCreatedStagePreview => {
  return {
    mode: 'tailored',
    title: 'Documents will be generated',
    summary: 'Moving this job to Created will start CV and cover letter generation for this tracker journey.',
    supportMessage: 'The tracker will show whether the generated drafts are tailored or fallback once processing begins.'
  };
};
