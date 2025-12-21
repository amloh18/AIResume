/**
 * Live Keyword Validator Component
 * Real-time keyword checking as user types
 * Updates fix status immediately when keywords are found
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { checkSemanticMatch, checkMultipleKeywords, type SemanticMatchResult } from '@/lib/services/semantic-matcher-service';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface LiveKeywordValidatorProps {
  cvData: UnifiedCVDataStructure;
  fixAnnotations: FixAnnotation[];
  onFixStatusUpdate: (fixId: string, status: 'open' | 'semantic_match', semanticMatch?: { requiredTerm: string; foundTerm: string; confidenceScore: number }) => void;
  debounceMs?: number;
}

/**
 * Extract text from CV data for keyword checking
 */
function extractTextFromCV(cvData: UnifiedCVDataStructure): string {
  const sections: string[] = [];
  
  // Summary
  if (cvData.basics?.summary) {
    sections.push(cvData.basics.summary);
  }
  
  // Skills
  if (cvData.skills) {
    cvData.skills.forEach((skill) => {
      if (typeof skill === 'string') {
        sections.push(skill);
      } else if (skill.name) {
        sections.push(skill.name);
        if (skill.keywords) {
          sections.push(skill.keywords.join(' '));
        }
      }
    });
  }
  
  // Work experience
  if (cvData.work) {
    cvData.work.forEach((job) => {
      if (job.position) sections.push(job.position);
      if (job.summary) sections.push(job.summary);
      if (job.highlights) {
        job.highlights.forEach((highlight) => {
          if (typeof highlight === 'string') {
            sections.push(highlight);
          }
        });
      }
    });
  }
  
  // Projects
  if (cvData.projects) {
    cvData.projects.forEach((project) => {
      if (project.name) sections.push(project.name);
      if (project.description) sections.push(project.description);
      if (project.highlights) {
        project.highlights.forEach((highlight) => {
          if (typeof highlight === 'string') {
            sections.push(highlight);
          }
        });
      }
    });
  }
  
  return sections.join(' ');
}

/**
 * Debounce function
 */
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Live Keyword Validator Component
 */
export default function LiveKeywordValidator({
  cvData,
  fixAnnotations,
  onFixStatusUpdate,
  debounceMs = 300
}: LiveKeywordValidatorProps) {
  const previousCVHashRef = useRef<string>('');
  
  /**
   * Check all keyword-related fixes against current CV text
   */
  const validateKeywords = useCallback(() => {
    const cvText = extractTextFromCV(cvData);
    
    // Only process keyword-related fixes that are still open
    const keywordFixes = fixAnnotations.filter(
      (fix) => fix.category === 'keywords' && fix.status === 'open'
    );
    
    if (keywordFixes.length === 0) return;
    
    // Extract required keywords from fixes
    // Look for keywords in replacementText or issue
    const requiredKeywords: Array<{ fixId: string; keyword: string }> = [];
    
    keywordFixes.forEach((fix) => {
      // Try to extract keyword from replacementText (e.g., "Add Python" -> "Python")
      const keywordMatch = fix.replacementText?.match(/\b([A-Z][a-zA-Z]+(?:\.js|\.py|#|\+\+)?)\b/) ||
                          fix.issue?.match(/['"]([A-Z][a-zA-Z]+(?:\.js|\.py|#|\+\+)?)['"]/) ||
                          fix.replacementText?.match(/Add\s+([A-Z][a-zA-Z]+(?:\.js|\.py|#|\+\+)?)/i);
      
      if (keywordMatch && keywordMatch[1]) {
        requiredKeywords.push({
          fixId: fix.id,
          keyword: keywordMatch[1]
        });
      } else if (fix.replacementText) {
        // Fallback: use replacementText as keyword
        requiredKeywords.push({
          fixId: fix.id,
          keyword: fix.replacementText.trim()
        });
      }
    });
    
    // Check each keyword
    requiredKeywords.forEach(({ fixId, keyword }) => {
      const matchResult = checkSemanticMatch(keyword, cvText);
      
      if (matchResult.matched) {
        // Keyword found - update status
        if (matchResult.matchType === 'exact') {
          // Exact match - mark as resolved (will be handled by parent)
          // For now, we'll mark as semantic_match with high confidence
          onFixStatusUpdate(fixId, 'semantic_match', {
            requiredTerm: matchResult.originalTerm,
            foundTerm: matchResult.foundTerm || keyword,
            confidenceScore: matchResult.confidenceScore
          });
        } else if (matchResult.matchType === 'dictionary' || matchResult.matchType === 'fuzzy') {
          // Semantic match - mark as semantic_match
          onFixStatusUpdate(fixId, 'semantic_match', {
            requiredTerm: matchResult.originalTerm,
            foundTerm: matchResult.foundTerm || keyword,
            confidenceScore: matchResult.confidenceScore
          });
        }
      }
    });
  }, [cvData, fixAnnotations, onFixStatusUpdate]);
  
  // Debounced validation
  const debouncedValidate = useRef(
    debounce(validateKeywords, debounceMs)
  ).current;
  
  // Watch for CV data changes
  useEffect(() => {
    // Create a simple hash of CV data to detect changes
    const cvHash = JSON.stringify(cvData);
    
    if (cvHash !== previousCVHashRef.current) {
      previousCVHashRef.current = cvHash;
      debouncedValidate();
    }
  }, [cvData, debouncedValidate]);
  
  // Also validate when fixAnnotations change (new fixes added)
  useEffect(() => {
    debouncedValidate();
  }, [fixAnnotations.length, debouncedValidate]);
  
  // This component doesn't render anything
  return null;
}

