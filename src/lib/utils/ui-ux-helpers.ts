/**
 * UI/UX Helper Utilities
 * 
 * Handles edge cases for UI/UX & Formatting (EC-31 to EC-40)
 */

/**
 * EC-31: PDF Orphan Protection
 * Detect if content would be cut across pages
 */
export interface PageBreakCheck {
  hasOrphans: boolean;
  problematicSections: string[];
  suggestions: string[];
}

export function checkForPageBreakIssues(
  contentHeights: Record<string, number>,
  pageHeight: number = 1100, // A4 in pixels at 96dpi
  headerHeight: number = 100,
  footerHeight: number = 50
): PageBreakCheck {
  const usableHeight = pageHeight - headerHeight - footerHeight;
  const problems: string[] = [];
  const suggestions: string[] = [];
  
  let currentPosition = 0;
  
  for (const [section, height] of Object.entries(contentHeights)) {
    const remainingOnPage = usableHeight - (currentPosition % usableHeight);
    
    // Check if section header would be orphaned (less than 100px left)
    if (remainingOnPage < 100 && height > 100) {
      problems.push(section);
      suggestions.push(`Consider adding page break before "${section}" section`);
    }
    
    // Check if a very short section would leave too much whitespace
    if (remainingOnPage > 300 && height < 50) {
      suggestions.push(`"${section}" section may leave awkward whitespace`);
    }
    
    currentPosition += height;
  }
  
  return {
    hasOrphans: problems.length > 0,
    problematicSections: problems,
    suggestions
  };
}

/**
 * EC-32: UTF-8 Font Encoding Check
 * Validate that special characters in names can be rendered
 */
export function validateCharacterSupport(
  text: string
): { hasUnsupported: boolean; unsupportedChars: string[]; suggestion?: string } {
  if (!text) return { hasUnsupported: false, unsupportedChars: [] };
  
  const unsupportedChars: string[] = [];
  
  // Check for characters that commonly cause issues
  // Most modern fonts support accented Latin, but some special chars may fail
  const problematicRanges = [
    { start: 0x10000, end: 0x10FFFF }, // Supplementary planes (emoji, etc)
    { start: 0x2000, end: 0x206F },    // General punctuation (some)
  ];
  
  for (const char of text) {
    const code = char.codePointAt(0) || 0;
    
    for (const range of problematicRanges) {
      if (code >= range.start && code <= range.end) {
        if (!unsupportedChars.includes(char)) {
          unsupportedChars.push(char);
        }
      }
    }
  }
  
  return {
    hasUnsupported: unsupportedChars.length > 0,
    unsupportedChars,
    suggestion: unsupportedChars.length > 0 
      ? 'Some characters may not render correctly in all PDF viewers' 
      : undefined
  };
}

/**
 * EC-33: Bullet Point Length Validation
 * Flag overly long bullet points
 */
export interface BulletValidation {
  isValid: boolean;
  length: number;
  lineCount: number;
  message?: string;
}

export function validateBulletLength(
  text: string,
  maxChars: number = 250,
  maxLines: number = 3
): BulletValidation {
  if (!text) return { isValid: true, length: 0, lineCount: 0 };
  
  const length = text.length;
  // Rough estimate: ~80 chars per line
  const lineCount = Math.ceil(length / 80);
  
  if (length > maxChars || lineCount > maxLines) {
    return {
      isValid: false,
      length,
      lineCount,
      message: `Bullet point is ${lineCount} lines (${length} chars). Consider splitting into multiple points.`
    };
  }
  
  return { isValid: true, length, lineCount };
}

/**
 * EC-34: Mobile Responsive Check
 * Determine if UI should show mobile-optimized layout
 */
export function shouldShowMobileLayout(
  windowWidth: number,
  breakpoint: number = 768
): { isMobile: boolean; layout: 'mobile' | 'tablet' | 'desktop' } {
  if (windowWidth < breakpoint) {
    return { isMobile: true, layout: 'mobile' };
  }
  if (windowWidth < 1024) {
    return { isMobile: false, layout: 'tablet' };
  }
  return { isMobile: false, layout: 'desktop' };
}

/**
 * EC-35: Cover Letter Length Check
 * Ensure cover letter fits on one page
 */
export function validateCoverLetterLength(
  bodyText: string,
  maxWords: number = 400,
  maxChars: number = 2500
): { isValid: boolean; wordCount: number; charCount: number; message?: string } {
  if (!bodyText) return { isValid: true, wordCount: 0, charCount: 0 };
  
  const wordCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
  const charCount = bodyText.length;
  
  if (wordCount > maxWords || charCount > maxChars) {
    return {
      isValid: false,
      wordCount,
      charCount,
      message: `Cover letter is ${wordCount} words. Consider trimming to ${maxWords} words to fit on one page.`
    };
  }
  
  return { isValid: true, wordCount, charCount };
}

/**
 * EC-36: Missing Photo Fallback
 * Generate initials avatar when photo is missing
 */
export function generateInitialsAvatar(
  name: string
): { initials: string; backgroundColor: string } {
  if (!name) {
    return { initials: '?', backgroundColor: '#6B7280' };
  }
  
  const parts = name.trim().split(/\s+/);
  let initials = '';
  
  if (parts.length >= 2) {
    initials = (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  } else if (parts.length === 1 && parts[0].length >= 2) {
    initials = parts[0].substring(0, 2).toUpperCase();
  } else {
    initials = name.substring(0, 1).toUpperCase();
  }
  
  // Generate consistent color based on name
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return {
    initials,
    backgroundColor: colors[colorIndex]
  };
}

/**
 * EC-37: Template Whitespace Recalculation
 * Adjust spacing when switching between column layouts
 */
export function calculateLayoutSpacing(
  fromLayout: 'one-column' | 'two-column' | 'three-column',
  toLayout: 'one-column' | 'two-column' | 'three-column',
  contentLength: number
): { lineHeightMultiplier: number; marginAdjustment: number; needsReflow: boolean } {
  const layoutMultipliers: Record<string, number> = {
    'one-column': 1,
    'two-column': 0.85,
    'three-column': 0.75
  };
  
  const fromMultiplier = layoutMultipliers[fromLayout] || 1;
  const toMultiplier = layoutMultipliers[toLayout] || 1;
  
  const ratio = toMultiplier / fromMultiplier;
  
  return {
    lineHeightMultiplier: ratio > 1 ? 1 : 0.95,
    marginAdjustment: ratio > 1 ? 0 : -5,
    needsReflow: fromLayout !== toLayout && contentLength > 2000
  };
}

/**
 * EC-38: Download Button Loading State
 * Provide download progress feedback
 */
export interface DownloadState {
  status: 'idle' | 'preparing' | 'generating' | 'downloading' | 'complete' | 'error';
  progress: number;
  message: string;
}

export function getDownloadStateMessage(status: DownloadState['status']): string {
  const messages: Record<DownloadState['status'], string> = {
    idle: 'Download CV',
    preparing: 'Preparing document...',
    generating: 'Generating PDF...',
    downloading: 'Starting download...',
    complete: 'Downloaded!',
    error: 'Download failed. Try again.'
  };
  
  return messages[status] || 'Download';
}

/**
 * EC-39: Step Skip Prevention
 * Validate that required steps are completed before proceeding
 */
export function validateStepCompletion(
  currentStep: number,
  stepValidation: Record<number, () => boolean>
): { canProceed: boolean; missingSteps: number[]; message?: string } {
  const missingSteps: number[] = [];
  
  for (let step = 1; step < currentStep; step++) {
    const validator = stepValidation[step];
    if (validator && !validator()) {
      missingSteps.push(step);
    }
  }
  
  if (missingSteps.length > 0) {
    const stepNames: Record<number, string> = {
      1: 'Personal Info',
      2: 'Template Selection',
      3: 'Content Building'
    };
    
    const missingNames = missingSteps.map(s => stepNames[s] || `Step ${s}`);
    
    return {
      canProceed: false,
      missingSteps,
      message: `Please complete: ${missingNames.join(', ')}`
    };
  }
  
  return { canProceed: true, missingSteps: [] };
}

/**
 * EC-40: Dark Mode Preview Consistency
 * Ensure preview matches actual PDF output (white background)
 */
export function getPreviewStyles(
  isDarkMode: boolean
): { containerBg: string; paperBg: string; textColor: string; shadowColor: string } {
  // PDF will always be white background with black text
  // Preview should show this regardless of theme
  return {
    containerBg: isDarkMode ? '#1a1a1a' : '#f5f5f5',
    paperBg: '#ffffff',  // Always white for actual CV
    textColor: '#000000', // Always black text
    shadowColor: isDarkMode ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)'
  };
}

/**
 * Debounce utility for input validation
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle utility for scroll/resize events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

