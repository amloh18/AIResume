export interface ReadinessValidationResult {
  isReady: boolean;
  missingFields: string[];
}

export function validateStagingReadiness(application: any, cvDoc: any): ReadinessValidationResult {
  const missing: string[] = [];

  if (!application.cvId && !cvDoc) {
    missing.push('Tailored CV');
  }

  return {
    isReady: missing.length === 0,
    missingFields: missing,
  };
}
