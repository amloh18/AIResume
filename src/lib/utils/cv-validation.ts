/**
 * CV Validation Utilities
 * 
 * Handles edge cases for Input & Parsing (EC-01 to EC-10)
 */

export interface ValidationError {
  field: string;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * EC-01: Date Validation - Ensure end date is not before start date
 */
export function validateDateRange(
  startDate: string | Date | undefined,
  endDate: string | Date | undefined,
  fieldName: string = 'date'
): ValidationError | null {
  if (!startDate || !endDate) return null;
  
  // Handle "present" or "current" as valid end dates
  const endDateStr = typeof endDate === 'string' ? endDate.toLowerCase() : '';
  if (endDateStr === 'present' || endDateStr === 'current' || endDateStr === 'now') {
    return null;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Check for invalid dates
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return null; // Let other validation handle invalid date formats
  }
  
  if (end < start) {
    return {
      field: fieldName,
      message: 'End date cannot be before start date',
      type: 'error'
    };
  }
  
  return null;
}

/**
 * EC-02: Fresher Detection - Check if user has no meaningful work experience
 */
export function detectFresherMode(cvData: any): boolean {
  const work = cvData?.work;
  
  // No work array at all
  if (!work || !Array.isArray(work) || work.length === 0) {
    return true;
  }
  
  // Check if work entries have meaningful content
  const hasValidWork = work.some((job: any) => 
    job && (
      (job.name && job.name.trim()) ||
      (job.company && job.company.trim()) ||
      (job.position && job.position.trim())
    )
  );
  
  return !hasValidWork;
}

/**
 * EC-07: JD Length Validation - Check if JD has enough content for analysis
 */
export function validateJDLength(jdText: string): {
  isValid: boolean;
  wordCount: number;
  message?: string;
  severity?: 'error' | 'warning'
} {
  if (!jdText || !jdText.trim()) {
    return {
      isValid: false,
      wordCount: 0,
      message: 'Job description is required for ATS optimization',
      severity: 'error'
    };
  }
  
  const wordCount = jdText.trim().split(/\s+/).filter(Boolean).length;
  
  if (wordCount < 20) {
    return {
      isValid: false,
      wordCount,
      message: 'Job description is too short. Please provide more details.',
      severity: 'error'
    };
  }
  
  if (wordCount < 50) {
    return {
      isValid: true,
      wordCount,
      message: 'Job description may be too short for accurate keyword matching.',
      severity: 'warning'
    };
  }
  
  if (wordCount < 100) {
    return {
      isValid: true,
      wordCount,
      message: 'Consider providing a more detailed job description for better results.',
      severity: 'warning'
    };
  }
  
  return {
    isValid: true,
    wordCount
  };
}

/**
 * EC-08: Language Detection - Basic check for non-English content
 */
export function detectNonEnglishContent(text: string): {
  isEnglish: boolean;
  confidence: number;
  detectedLanguage?: string;
} {
  if (!text) {
    return { isEnglish: true, confidence: 1 };
  }
  
  // Common English words to check frequency
  const englishWords = [
    'the', 'and', 'or', 'is', 'are', 'was', 'were', 'be', 'been',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can',
    'for', 'of', 'to', 'in', 'on', 'with', 'at', 'by', 'from',
    'as', 'an', 'a', 'this', 'that', 'these', 'those', 'it'
  ];
  
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 1);
  if (words.length === 0) return { isEnglish: true, confidence: 1 };
  
  let englishCount = 0;
  words.forEach(word => {
    if (englishWords.includes(word)) {
      englishCount++;
    }
  });
  
  const ratio = englishCount / Math.min(words.length, 100); // Cap at 100 words
  const confidence = Math.min(ratio * 5, 1); // Scale up, cap at 1
  
  return {
    isEnglish: confidence > 0.1, // At least 10% common English words
    confidence
  };
}

/**
 * EC-09: Multi-Role JD Detection - Check if JD contains multiple distinct roles
 */
export function detectMultipleRoles(jdText: string): {
  hasMultipleRoles: boolean;
  detectedRoles: string[];
} {
  if (!jdText) {
    return { hasMultipleRoles: false, detectedRoles: [] };
  }
  
  // Common role title patterns
  const rolePatterns = [
    /(?:position|role|title):\s*([^,\n]+)/gi,
    /(?:we are (?:looking for|hiring|seeking) (?:a|an))\s+([^,.\n]+)/gi,
    /(?:job title):\s*([^,\n]+)/gi
  ];
  
  const detectedRoles: string[] = [];
  
  rolePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(jdText)) !== null) {
      const role = match[1].trim();
      if (role && !detectedRoles.includes(role)) {
        detectedRoles.push(role);
      }
    }
  });
  
  // Also check for "or" patterns suggesting multiple roles
  const orPattern = /(?:senior|junior|lead|principal)?\s*([a-z]+(?:\s+[a-z]+)?)\s+(?:or|\/)\s+(?:senior|junior|lead|principal)?\s*([a-z]+(?:\s+[a-z]+)?)/gi;
  let match;
  while ((match = orPattern.exec(jdText)) !== null) {
    if (match[1] && !detectedRoles.includes(match[1])) {
      detectedRoles.push(match[1].trim());
    }
    if (match[2] && !detectedRoles.includes(match[2])) {
      detectedRoles.push(match[2].trim());
    }
  }
  
  return {
    hasMultipleRoles: detectedRoles.length > 1,
    detectedRoles
  };
}

/**
 * EC-28: Career Gap Detection - Find gaps > 6 months in employment history
 */
export function detectCareerGaps(
  work: any[],
  minGapMonths: number = 6
): { hasGaps: boolean; gaps: Array<{ startDate: string; endDate: string; months: number }> } {
  if (!work || work.length < 2) {
    return { hasGaps: false, gaps: [] };
  }
  
  // Sort by end date descending
  const sortedWork = [...work]
    .filter(job => job.startDate)
    .sort((a, b) => {
      const aEnd = parseWorkDate(a.endDate) || new Date();
      const bEnd = parseWorkDate(b.endDate) || new Date();
      return bEnd.getTime() - aEnd.getTime();
    });
  
  const gaps: Array<{ startDate: string; endDate: string; months: number }> = [];
  
  for (let i = 0; i < sortedWork.length - 1; i++) {
    const currentStart = parseWorkDate(sortedWork[i].startDate);
    const previousEnd = parseWorkDate(sortedWork[i + 1].endDate);
    
    if (currentStart && previousEnd && currentStart > previousEnd) {
      const monthsDiff = (currentStart.getTime() - previousEnd.getTime()) / (1000 * 60 * 60 * 24 * 30);
      
      if (monthsDiff >= minGapMonths) {
        gaps.push({
          startDate: formatDate(previousEnd),
          endDate: formatDate(currentStart),
          months: Math.round(monthsDiff)
        });
      }
    }
  }
  
  return {
    hasGaps: gaps.length > 0,
    gaps
  };
}

/**
 * Helper: Parse work experience dates
 */
function parseWorkDate(dateStr: string | Date | undefined): Date | null {
  if (!dateStr) return null;
  
  if (dateStr instanceof Date) return dateStr;
  
  const str = dateStr.toLowerCase().trim();
  
  // Handle "present", "current", "now"
  if (str === 'present' || str === 'current' || str === 'now') {
    return new Date();
  }
  
  // Try direct parsing
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) return date;
  
  // Try "Month Year" format (e.g., "January 2023")
  const monthYear = dateStr.match(/^([a-z]+)\s+(\d{4})$/i);
  if (monthYear) {
    const parsed = new Date(`${monthYear[1]} 1, ${monthYear[2]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Try "YYYY-MM" format
  const yyyyMm = dateStr.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMm) {
    return new Date(parseInt(yyyyMm[1]), parseInt(yyyyMm[2]) - 1);
  }
  
  return null;
}

/**
 * Helper: Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

/**
 * Validate entire CV data structure
 */
export function validateCVData(cvData: any): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  // Validate work experience dates
  if (cvData.work && Array.isArray(cvData.work)) {
    cvData.work.forEach((job: any, index: number) => {
      const dateError = validateDateRange(job.startDate, job.endDate, `work[${index}].dates`);
      if (dateError) {
        errors.push({
          ...dateError,
          field: `work[${index}]`,
          message: `Work experience "${job.position || job.name || `#${index + 1}`}": ${dateError.message}`
        });
      }
    });
    
    // Check for career gaps
    const gapResult = detectCareerGaps(cvData.work);
    if (gapResult.hasGaps) {
      gapResult.gaps.forEach(gap => {
        warnings.push({
          field: 'work',
          message: `Career gap detected: ${gap.months} months (${gap.startDate} - ${gap.endDate}). Consider adding a "Career Break" entry.`,
          type: 'warning'
        });
      });
    }
  }
  
  // Validate education dates
  if (cvData.education && Array.isArray(cvData.education)) {
    cvData.education.forEach((edu: any, index: number) => {
      const dateError = validateDateRange(edu.startDate, edu.endDate, `education[${index}].dates`);
      if (dateError) {
        errors.push({
          ...dateError,
          field: `education[${index}]`,
          message: `Education "${edu.studyType || edu.institution || `#${index + 1}`}": ${dateError.message}`
        });
      }
    });
  }
  
  // Check fresher mode
  if (detectFresherMode(cvData)) {
    warnings.push({
      field: 'work',
      message: 'No work experience detected. Focus on Projects, Education, and Skills sections.',
      type: 'warning'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

