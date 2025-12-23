/**
 * Surgeon Safeguards
 * 
 * Handles edge cases for AI Surgeon & AI Logic (EC-11 to EC-20)
 * Prevents hallucination, keyword stuffing, and ensures ethical constraints
 */

import type { SurgicalFix } from '@/lib/services/cv-surgeon-service';

/**
 * EC-11: Hallucination Prevention
 * Validates that AI fixes don't add content not present in the original
 * 
 * For Master CVs: Only report potential gaps, never auto-add facts
 */
export function validateNoHallucination(
  fix: SurgicalFix,
  originalCVContent: string
): { isValid: boolean; reason?: string } {
  // Check if the fix is trying to add numerical metrics not in original
  const numericPattern = /(\d+%|\$[\d,]+|\d+[xX]|\d+\s*million)/gi;
  const fixedNumerics = fix.fixed_text.match(numericPattern) || [];
  const originalNumerics = fix.original_text.match(numericPattern) || [];
  
  // If fix adds new numerics, it might be hallucinating
  for (const numeric of fixedNumerics) {
    if (!originalNumerics.some(o => o.toLowerCase() === numeric.toLowerCase())) {
      // Check if numeric exists anywhere in original CV
      if (!originalCVContent.includes(numeric.replace(/[%,$]/g, ''))) {
        return {
          isValid: false,
          reason: `Fix attempts to add metric "${numeric}" not found in original CV`
        };
      }
    }
  }
  
  // Check for new skill/technology claims
  const techTerms = [
    'python', 'java', 'javascript', 'react', 'angular', 'vue', 'node',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'sql', 'mongodb',
    'certified', 'certification', 'expert', 'proficient', 'advanced'
  ];
  
  const fixedLower = fix.fixed_text.toLowerCase();
  const originalLower = fix.original_text.toLowerCase();
  const cvLower = originalCVContent.toLowerCase();
  
  for (const term of techTerms) {
    if (fixedLower.includes(term) && !originalLower.includes(term)) {
      // Check if term exists elsewhere in CV
      if (!cvLower.includes(term)) {
        return {
          isValid: false,
          reason: `Fix attempts to add skill/technology "${term}" not mentioned in CV`
        };
      }
    }
  }
  
  return { isValid: true };
}

/**
 * EC-14: Keyword Stuffing Detection
 * Prevents over-optimization that reduces readability
 * Threshold: keyword density should not exceed 5%
 */
export function detectKeywordStuffing(
  text: string,
  keywords: string[],
  maxDensity: number = 0.05
): { isStuffed: boolean; density: number; problematicKeywords: string[] } {
  if (!text || keywords.length === 0) {
    return { isStuffed: false, density: 0, problematicKeywords: [] };
  }
  
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  
  if (totalWords === 0) {
    return { isStuffed: false, density: 0, problematicKeywords: [] };
  }
  
  const keywordCounts: Record<string, number> = {};
  const problematicKeywords: string[] = [];
  let totalKeywordOccurrences = 0;
  
  keywords.forEach(keyword => {
    const keywordLower = keyword.toLowerCase();
    const count = words.filter(w => w.includes(keywordLower) || keywordLower.includes(w)).length;
    keywordCounts[keyword] = count;
    totalKeywordOccurrences += count;
    
    // Individual keyword appearing more than 3% is problematic
    if (count / totalWords > 0.03) {
      problematicKeywords.push(keyword);
    }
  });
  
  const density = totalKeywordOccurrences / totalWords;
  
  return {
    isStuffed: density > maxDensity || problematicKeywords.length > 0,
    density,
    problematicKeywords
  };
}

/**
 * EC-15: Ethical Constraints - Missing Certification Gap
 * Never fake certifications or skills the user doesn't have
 * Instead, add to "Missing Skills" gap report
 */
export function validateEthicalFix(
  fix: SurgicalFix,
  userSkills: string[],
  userCertifications: string[]
): { isEthical: boolean; reason?: string } {
  const certificationPatterns = [
    /certified/i,
    /certification/i,
    /\bpmp\b/i,
    /\baws\b.*\bcertified\b/i,
    /\bazure\b.*\bcertified\b/i,
    /\bgoogle\b.*\bcertified\b/i,
    /\bcpa\b/i,
    /\bcfa\b/i,
    /\bcissp\b/i,
    /\bceh\b/i
  ];
  
  // Check if fix adds certification language
  for (const pattern of certificationPatterns) {
    if (pattern.test(fix.fixed_text) && !pattern.test(fix.original_text)) {
      // Check if user has this certification
      const hasCert = userCertifications.some(cert => 
        pattern.test(cert)
      );
      
      if (!hasCert) {
        return {
          isEthical: false,
          reason: 'Cannot add certification claims not verified in user\'s credentials'
        };
      }
    }
  }
  
  return { isEthical: true };
}

/**
 * EC-13: Content Length Warning
 * Flag overly long bullet points (>4 lines / ~200 chars)
 */
export function checkContentLength(
  text: string,
  maxLength: number = 200
): { isTooLong: boolean; length: number; suggestion?: string } {
  if (!text) return { isTooLong: false, length: 0 };
  
  const length = text.length;
  
  if (length > maxLength) {
    return {
      isTooLong: true,
      length,
      suggestion: 'Consider splitting this into two bullet points for better readability'
    };
  }
  
  return { isTooLong: false, length };
}

/**
 * EC-17: JD Title Inference
 * Extract job title from JD when not explicitly provided
 */
export function inferJobTitleFromJD(jdText: string): string | null {
  if (!jdText) return null;
  
  // Common patterns for job titles in JDs
  const patterns = [
    /(?:job title|position|role):\s*([^\n,]+)/i,
    /(?:we are (?:looking for|hiring|seeking) (?:a|an))\s+([^\n,.]+)/i,
    /(?:title):\s*([^\n,]+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Engineer|Developer|Manager|Designer|Analyst|Specialist|Lead|Director|Coordinator))+)/m
  ];
  
  for (const pattern of patterns) {
    const match = jdText.match(pattern);
    if (match && match[1]) {
      const title = match[1].trim();
      // Clean up common artifacts
      return title
        .replace(/^(a|an|the)\s+/i, '')
        .replace(/[.!?]$/, '')
        .trim();
    }
  }
  
  return null;
}

/**
 * EC-50: Low Match Warning
 * Check if CV-JD similarity is below threshold
 */
export function checkLowMatchWarning(
  matchScore: number,
  threshold: number = 10
): { isLowMatch: boolean; message?: string } {
  if (matchScore < threshold) {
    return {
      isLowMatch: true,
      message: `Your CV matches only ${matchScore}% of the job requirements. This might not be the right job for your profile.`
    };
  }
  
  if (matchScore < 30) {
    return {
      isLowMatch: false,
      message: `Low match score (${matchScore}%). Consider adding relevant experience or skills.`
    };
  }
  
  return { isLowMatch: false };
}

/**
 * Filter and validate a batch of surgical fixes
 * Returns only safe, ethical, non-hallucinated fixes
 */
export function filterSafeFixes(
  fixes: SurgicalFix[],
  originalCVContent: string,
  userSkills: string[] = [],
  userCertifications: string[] = []
): { safeFixes: SurgicalFix[]; rejectedFixes: Array<{ fix: SurgicalFix; reason: string }> } {
  const safeFixes: SurgicalFix[] = [];
  const rejectedFixes: Array<{ fix: SurgicalFix; reason: string }> = [];
  
  for (const fix of fixes) {
    // Check hallucination
    const hallucinationCheck = validateNoHallucination(fix, originalCVContent);
    if (!hallucinationCheck.isValid) {
      rejectedFixes.push({ fix, reason: hallucinationCheck.reason || 'Hallucination detected' });
      continue;
    }
    
    // Check ethical constraints
    const ethicalCheck = validateEthicalFix(fix, userSkills, userCertifications);
    if (!ethicalCheck.isEthical) {
      rejectedFixes.push({ fix, reason: ethicalCheck.reason || 'Ethical constraint violated' });
      continue;
    }
    
    // Content length check (warning, not rejection)
    const lengthCheck = checkContentLength(fix.fixed_text);
    if (lengthCheck.isTooLong) {
      fix.issue = `${fix.issue} (Note: ${lengthCheck.suggestion})`;
    }
    
    safeFixes.push(fix);
  }
  
  return { safeFixes, rejectedFixes };
}

/**
 * EC-20: API Retry with Exponential Backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Attempt ${attempt + 1}/${maxRetries} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
}

