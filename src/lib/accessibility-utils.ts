/**
 * Accessibility and Error Handling Utilities
 * 
 * Implements WCAG AA compliance and graceful error handling
 * for the CV Preview Engine
 */

// WCAG AA Color Contrast Ratios
export const CONTRAST_RATIOS = {
  NORMAL_TEXT: 4.5,
  LARGE_TEXT: 3.0,
  UI_COMPONENTS: 3.0
} as const;

// Error types for user-friendly messages
export enum ErrorType {
  RENDER_FAILED = 'RENDER_FAILED',
  TEMPLATE_INVALID = 'TEMPLATE_INVALID',
  DATA_MISSING = 'DATA_MISSING',
  SECTION_ERROR = 'SECTION_ERROR',
  PAGINATION_ERROR = 'PAGINATION_ERROR',
  ACCESSIBILITY_ERROR = 'ACCESSIBILITY_ERROR'
}

// User-friendly error messages
export const ERROR_MESSAGES = {
  [ErrorType.RENDER_FAILED]: {
    title: 'Preview Generation Failed',
    message: 'We encountered an issue while generating your CV preview. Please try again.',
    action: 'Retry Preview'
  },
  [ErrorType.TEMPLATE_INVALID]: {
    title: 'Template Error',
    message: 'The selected template has some issues. Please choose a different template.',
    action: 'Select Different Template'
  },
  [ErrorType.DATA_MISSING]: {
    title: 'Missing Information',
    message: 'Some required information is missing from your CV. Please add the missing details.',
    action: 'Add Missing Information'
  },
  [ErrorType.SECTION_ERROR]: {
    title: 'Section Rendering Error',
    message: 'There was an issue rendering one of your CV sections. The section has been skipped.',
    action: 'Review Section'
  },
  [ErrorType.PAGINATION_ERROR]: {
    title: 'Page Layout Error',
    message: 'There was an issue with the page layout. Some content may not display correctly.',
    action: 'Adjust Layout'
  },
  [ErrorType.ACCESSIBILITY_ERROR]: {
    title: 'Accessibility Issue',
    message: 'The current design may not meet accessibility standards. Consider adjusting colors or fonts.',
    action: 'Improve Accessibility'
  }
} as const;

/**
 * Calculate color contrast ratio between two colors
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const luminance1 = getLuminance(rgb1);
  const luminance2 = getLuminance(rgb2);
  
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color combination meets WCAG AA standards
 */
export function meetsWCAGAA(foreground: string, background: string, isLargeText: boolean = false): boolean {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? CONTRAST_RATIOS.LARGE_TEXT : CONTRAST_RATIOS.NORMAL_TEXT;
  return ratio >= requiredRatio;
}

/**
 * Get accessibility recommendations for color combinations
 */
export function getAccessibilityRecommendations(
  foreground: string, 
  background: string, 
  isLargeText: boolean = false
): {
  meetsStandards: boolean;
  ratio: number;
  requiredRatio: number;
  recommendations: string[];
} {
  const ratio = calculateContrastRatio(foreground, background);
  const requiredRatio = isLargeText ? CONTRAST_RATIOS.LARGE_TEXT : CONTRAST_RATIOS.NORMAL_TEXT;
  const meetsStandards = ratio >= requiredRatio;
  
  const recommendations: string[] = [];
  
  if (!meetsStandards) {
    if (ratio < requiredRatio) {
      recommendations.push(
        `Increase contrast by using a darker text color or lighter background color.`
      );
    }
    
    if (ratio < CONTRAST_RATIOS.NORMAL_TEXT) {
      recommendations.push(
        `Consider using larger text or bold fonts to improve readability.`
      );
    }
  }
  
  return {
    meetsStandards,
    ratio: Math.round(ratio * 100) / 100,
    requiredRatio,
    recommendations
  };
}

/**
 * Validate design settings for accessibility
 */
export function validateDesignSettings(settings: {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
}): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Check color contrast
  if (settings.primaryColor && settings.backgroundColor) {
    const contrast = getAccessibilityRecommendations(
      settings.primaryColor, 
      settings.backgroundColor, 
      false
    );
    
    if (!contrast.meetsStandards) {
      errors.push(`Primary color contrast ratio ${contrast.ratio}:1 is below WCAG AA standard of ${contrast.requiredRatio}:1`);
      recommendations.push(...contrast.recommendations);
    }
  }
  
  if (settings.secondaryColor && settings.backgroundColor) {
    const contrast = getAccessibilityRecommendations(
      settings.secondaryColor, 
      settings.backgroundColor, 
      false
    );
    
    if (!contrast.meetsStandards) {
      warnings.push(`Secondary color contrast ratio ${contrast.ratio}:1 is below WCAG AA standard of ${contrast.requiredRatio}:1`);
      recommendations.push(...contrast.recommendations);
    }
  }
  
  // Check font size
  if (settings.fontSize && settings.fontSize < 12) {
    warnings.push('Font size below 12px may be difficult to read for some users');
    recommendations.push('Consider using a font size of at least 12px for better readability');
  }
  
  // Check font family
  if (settings.fontFamily && settings.fontFamily.includes('serif')) {
    recommendations.push('Sans-serif fonts are generally more accessible for digital content');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    recommendations
  };
}

/**
 * Create user-friendly error object
 */
export function createUserFriendlyError(
  errorType: ErrorType,
  originalError?: Error,
  context?: Record<string, any>
): {
  type: ErrorType;
  title: string;
  message: string;
  action: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
} {
  const errorInfo = ERROR_MESSAGES[errorType];
  
  return {
    type: errorType,
    title: errorInfo.title,
    message: errorInfo.message,
    action: errorInfo.action,
    originalError,
    context,
    timestamp: new Date()
  };
}

/**
 * Handle preview engine errors gracefully
 */
export function handlePreviewError(error: unknown, context?: Record<string, any>): {
  type: ErrorType;
  title: string;
  message: string;
  action: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: Date;
} {
  // Determine error type based on error content
  let errorType: ErrorType = ErrorType.RENDER_FAILED;
  
  if (error instanceof Error) {
    if (error.message.includes('template')) {
      errorType = ErrorType.TEMPLATE_INVALID;
    } else if (error.message.includes('data') || error.message.includes('missing')) {
      errorType = ErrorType.DATA_MISSING;
    } else if (error.message.includes('section')) {
      errorType = ErrorType.SECTION_ERROR;
    } else if (error.message.includes('page') || error.message.includes('layout')) {
      errorType = ErrorType.PAGINATION_ERROR;
    } else if (error.message.includes('accessibility') || error.message.includes('contrast')) {
      errorType = ErrorType.ACCESSIBILITY_ERROR;
    }
  }
  
  return createUserFriendlyError(
    errorType,
    error instanceof Error ? error : undefined,
    context
  );
}

/**
 * Generate accessibility report for CV preview
 */
export function generateAccessibilityReport(settings: {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
}): {
  score: number; // 0-100
  issues: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    recommendation: string;
  }>;
  recommendations: string[];
} {
  const validation = validateDesignSettings(settings);
  const issues: Array<{ type: 'error' | 'warning' | 'info'; message: string; recommendation: string }> = [];
  
  // Add validation issues
  validation.errors.forEach(error => {
    issues.push({
      type: 'error',
      message: error,
      recommendation: 'Fix this issue to improve accessibility'
    });
  });
  
  validation.warnings.forEach(warning => {
    issues.push({
      type: 'warning',
      message: warning,
      recommendation: 'Consider addressing this for better accessibility'
    });
  });
  
  // Calculate score
  const totalChecks = 4; // Color contrast, font size, font family, line height
  const passedChecks = totalChecks - validation.errors.length - Math.ceil(validation.warnings.length / 2);
  const score = Math.max(0, Math.round((passedChecks / totalChecks) * 100));
  
  return {
    score,
    issues,
    recommendations: validation.recommendations
  };
}

// Helper functions
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getLuminance(rgb: { r: number; g: number; b: number }): number {
  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}
