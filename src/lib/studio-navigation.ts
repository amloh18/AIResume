/**
 * Studio Navigation Utilities
 * 
 * These functions handle navigation from ApplicationJourney to Studio
 * with proper parameter passing and context establishment.
 */

import { DocumentType } from '@/types/studio';

export interface StudioNavigationParams {
  // Journey Mode
  journeyId?: string;
  
  // Standalone Mode
  documentId?: string;
  
  // Common
  documentType: DocumentType;
  userId?: string;
  
  // Optional
  returnUrl?: string;
}

/**
 * Navigate to Studio from ApplicationJourney Modal
 * Used when user clicks "CV Tailoring" or "Cover Letter" from journey timeline
 */
export function navigateToStudioFromJourney(
  journeyId: string,
  documentType: DocumentType,
  userId?: string
): string {
  // Map documentType to URL format (cl for cover-letter)
  const urlDocumentType = documentType === 'cover-letter' ? 'cl' : 'cv';
  const mode = documentType === 'cover-letter' ? 'cledit' : 'cvedit';
  
  const params = new URLSearchParams({
    journeyId,
    documentType: urlDocumentType,
    mode
  });

  if (userId) {
    params.set('userId', userId);
  }

  // Set return URL to jobs page
  params.set('returnUrl', `/dashboard/tracker?journeyId=${journeyId}`);

  return `/studio?${params.toString()}`;
}

/**
 * Navigate to Studio for standalone document editing
 * Used when user wants to edit CV/cover letter directly from Canvas/Dashboard
 */
export function navigateToStudioStandalone(
  documentType: DocumentType,
  documentId?: string,
  userId?: string
): string {
  const params = new URLSearchParams({
    documentType,
    mode: 'standalone'
  });

  if (documentId) {
    params.set('documentId', documentId);
  }

  if (userId) {
    params.set('userId', userId);
  }

  // Set return URL to dashboard
  params.set('returnUrl', '/dashboard');

  return `/studio?${params.toString()}`;
}

/**
 * Create navigation function for ApplicationJourney Modal buttons
 * Returns functions that can be attached to onClick handlers
 */
export function createJourneyStudioActions(
  journeyId: string,
  userId: string,
  router: any // Next.js router
) {
  return {
    /**
     * Navigate to CV Tailoring for this journey
     */
    navigateToCVTailoring: () => {
      const url = navigateToStudioFromJourney(journeyId, 'cv', userId);
      router.push(url);
    },

    /**
     * Navigate to Cover Letter writing for this journey
     */
    navigateToCoverLetter: () => {
      const url = navigateToStudioFromJourney(journeyId, 'cover-letter', userId);
      router.push(url);
    },

    /**
     * Get URL for CV tailoring (for programmatic use)
     */
    getCVTailoringUrl: () => {
      return navigateToStudioFromJourney(journeyId, 'cv', userId);
    },

    /**
     * Get URL for cover letter (for programmatic use)
     */
    getCoverLetterUrl: () => {
      return navigateToStudioFromJourney(journeyId, 'cover-letter', userId);
    }
  };
}

/**
 * Create navigation function for Dashboard/Canvas CV/Cover Letter actions
 */
export function createStandaloneStudioActions(
  userId: string,
  router: any
) {
  return {
    /**
     * Create new CV
     */
    createNewCV: () => {
      const url = navigateToStudioStandalone('cv', undefined, userId);
      router.push(url);
    },

    /**
     * Edit existing CV
     */
    editCV: (cvId: string) => {
      const url = navigateToStudioStandalone('cv', cvId, userId);
      router.push(url);
    },

    /**
     * Create new cover letter
     */
    createNewCoverLetter: () => {
      const url = navigateToStudioStandalone('cover-letter', undefined, userId);
      router.push(url);
    },

    /**
     * Edit existing cover letter
     */
    editCoverLetter: (coverLetterId: string) => {
      const url = navigateToStudioStandalone('cover-letter', coverLetterId, userId);
      router.push(url);
    }
  };
}

/**
 * Parse Studio URL parameters
 * Used by Studio component to understand entry context
 */
export function parseStudioParams(searchParams: URLSearchParams): StudioNavigationParams {
  return {
    journeyId: searchParams.get('journeyId') || undefined,
    documentId: searchParams.get('documentId') || undefined,
    documentType: (searchParams.get('documentType') as DocumentType) || 'cv',
    userId: searchParams.get('userId') || undefined,
    returnUrl: searchParams.get('returnUrl') || undefined
  };
}

/**
 * Get return URL from Studio parameters
 * Used when user exits Studio
 */
export function getReturnUrl(searchParams: URLSearchParams, fallback: string = '/dashboard'): string {
  return searchParams.get('returnUrl') || fallback;
}

/**
 * Hook for Studio navigation in React components
 */
export function useStudioNavigation(router: any, userId?: string) {
  const journeyActions = (journeyId: string) => 
    createJourneyStudioActions(journeyId, userId || '', router);
  
  const standaloneActions = createStandaloneStudioActions(userId || '', router);

  return {
    journeyActions,
    standaloneActions,
    navigateToStudioFromJourney: (journeyId: string, documentType: DocumentType) => {
      const url = navigateToStudioFromJourney(journeyId, documentType, userId);
      router.push(url);
    },
    navigateToStudioStandalone: (documentType: DocumentType, documentId?: string) => {
      const url = navigateToStudioStandalone(documentType, documentId, userId);
      router.push(url);
    }
  };
}

/**
 * Studio entry point validation
 * Validates that required parameters are present
 */
export function validateStudioEntry(params: StudioNavigationParams): {
  isValid: boolean;
  mode: 'journey' | 'standalone';
  errors: string[];
} {
  const errors: string[] = [];
  
  // Determine mode
  const mode = params.journeyId ? 'journey' : 'standalone';
  
  // Validate based on mode
  if (mode === 'journey') {
    if (!params.journeyId) {
      errors.push('Journey ID is required for journey mode');
    }
  } else {
    // Standalone mode can work with or without documentId
    // No specific validation needed
  }
  
  // Common validations
  if (!params.documentType || !['cv', 'cover-letter'].includes(params.documentType)) {
    errors.push('Valid document type is required');
  }
  
  return {
    isValid: errors.length === 0,
    mode,
    errors
  };
}

/**
 * Generate Studio URL with all parameters
 * Utility function for programmatic URL generation
 */
export function generateStudioUrl(params: StudioNavigationParams): string {
  const urlParams = new URLSearchParams();
  
  if (params.journeyId) {
    urlParams.set('journeyId', params.journeyId);
    // Map documentType to URL format and set appropriate mode
    const urlDocumentType = params.documentType === 'cover-letter' ? 'cl' : 'cv';
    const mode = params.documentType === 'cover-letter' ? 'cledit' : 'cvedit';
    urlParams.set('documentType', urlDocumentType);
    urlParams.set('mode', mode);
  } else {
    // Standalone mode
    if (params.documentId) {
      if (params.documentType === 'cover-letter') {
        urlParams.set('coverLetterId', params.documentId);
      } else {
        urlParams.set('cvId', params.documentId);
      }
    }
    urlParams.set('documentType', params.documentType);
  }
  
  if (params.userId) urlParams.set('userId', params.userId);
  if (params.returnUrl) urlParams.set('returnUrl', params.returnUrl);
  
  return `/studio?${urlParams.toString()}`;
}

/**
 * Studio breadcrumb generation
 * Creates breadcrumb trail based on entry mode
 */
export function generateStudioBreadcrumbs(params: StudioNavigationParams): Array<{
  label: string;
  href?: string;
}> {
  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' }
  ];
  
  if (params.journeyId) {
    breadcrumbs.push({
      label: 'Jobs',
      href: '/dashboard/tracker'
    });
    breadcrumbs.push({
      label: `Journey ${params.journeyId.slice(-6)}`,
      href: `/dashboard/tracker?journeyId=${params.journeyId}`
    });
  }
  
  breadcrumbs.push({
    label: `${params.documentType === 'cv' ? 'CV' : 'Cover Letter'} Studio`,
    href: '/studio'
  });
  
  return breadcrumbs;
}
