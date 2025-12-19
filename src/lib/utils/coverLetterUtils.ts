import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Format cover letter header from CV basics
 * Format: Name\nLocation | Phone | Email
 */
export function formatCoverLetterHeader(cvData: UnifiedCVDataStructure): string {
  const basics = cvData.basics || {};
  const name = basics.name || 'Your Name';
  
  // Handle location - can be string or object
  let locationStr = '';
  if (basics.location) {
    if (typeof basics.location === 'string') {
      locationStr = basics.location;
    } else if (typeof basics.location === 'object') {
      const parts: string[] = [];
      if (basics.location.city) parts.push(basics.location.city);
      if (basics.location.state) parts.push(basics.location.state);
      if (basics.location.country) parts.push(basics.location.country);
      locationStr = parts.join(', ') || '';
    }
  }
  
  const phone = basics.phone || '';
  const email = basics.email || '';
  
  // Build header lines
  const lines: string[] = [name];
  
  // Second line: Location | Phone | Email
  const infoParts: string[] = [];
  if (locationStr) infoParts.push(locationStr);
  if (phone) infoParts.push(phone);
  if (email) infoParts.push(email);
  
  if (infoParts.length > 0) {
    lines.push(infoParts.join(' | '));
  }
  
  return lines.join('\n');
}

/**
 * Merge header and body into full cover letter content
 */
export function mergeCoverLetterContent(header: string, body: string): string {
  const headerTrimmed = header.trim();
  const bodyTrimmed = body.trim();
  
  if (!headerTrimmed && !bodyTrimmed) {
    return '';
  }
  
  if (!headerTrimmed) {
    return bodyTrimmed;
  }
  
  if (!bodyTrimmed) {
    return headerTrimmed;
  }
  
  return `${headerTrimmed}\n\n${bodyTrimmed}`;
}

/**
 * Extract header from cover letter content (first 3 lines typically)
 */
export function extractHeaderFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  return lines.slice(0, 3).join('\n').trim();
}

/**
 * Extract body from cover letter content (after first 3 lines)
 */
export function extractBodyFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  return lines.slice(3).join('\n').trim();
}

