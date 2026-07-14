import { authenticatedFetchWithUserId } from '@/lib/utils/apiUtils';
import { isCreditError, handleCreditError } from './tracker-credit-error';

export const moveJobToCreated = async (
  jobId: string,
  userId: string | undefined,
  showExhaustionModal: (data: any, plan: string) => void,
  toast: any,
  onSuccess?: () => void
) => {
  try {
    const response = await fetch(`/api/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: 'created',
      }),
    });

    if (!response.ok) {
      let errorData: any = {};
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('Failed to parse error response:', parseError);
      }

      if (isCreditError(response.status, errorData, true)) {
        handleCreditError(errorData, showExhaustionModal, toast, 'Failed to update job status');
        return false;
      }
      
      toast.error(errorData.message || errorData.error || `Failed to move job (${response.status}). Please try again.`);
      return false;
    }

    toast.success('Job moved to Created stage!');
    if (onSuccess) onSuccess();
    return true;
  } catch (error: any) {
    console.error('Error moving job:', error);
    toast.error('An unexpected error occurred. Please try again.');
    return false;
  }
};
