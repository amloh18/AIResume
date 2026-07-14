export interface CreditErrorData {
  error?: string;
  message?: string;
  requiresUpgrade?: boolean;
  limit?: number;
  currentUsage?: number;
}

export const isCreditError = (status: number, errorData: CreditErrorData, isDraftToCreated: boolean = false): boolean => {
  const errorMsg = (errorData.error || '').toLowerCase();
  const message = (errorData.message || '').toLowerCase();
  
  return (
    (status === 403 && (errorData.requiresUpgrade || errorMsg.includes('limit exceeded') || errorMsg.includes('insufficient credits') || errorMsg.includes('plan limit exceeded'))) ||
    (status === 500 && (errorMsg.includes('limit exceeded') || errorMsg.includes('insufficient credits') || errorMsg.includes('plan limit exceeded'))) ||
    (isDraftToCreated && status === 500) ||
    (isDraftToCreated && (errorData.requiresUpgrade || errorMsg.includes('limit') || errorMsg.includes('credit'))) ||
    message.includes('insufficient credits') ||
    message.includes('requires a pro membership')
  );
};

export const handleCreditError = (
  errorData: CreditErrorData,
  showExhaustionModal: (data: any, plan: string) => void,
  toast: any,
  fallbackMessage: string
) => {
  const limit = errorData.limit || 1;
  const currentUsage = errorData.currentUsage || limit;
  const creditsRemaining = Math.max(0, limit - currentUsage);

  showExhaustionModal(
    {
      creditsRemaining,
      limit,
      reason: errorData.message || errorData.error || 'Buy premium plans to create automatic CV and CL with ATS for multiple jobs'
    },
    'pro_monthly'
  );
};
