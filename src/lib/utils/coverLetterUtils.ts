// @ts-nocheck
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

/**
 * Format cover letter header from CV basics and job data
 * Format: 
 * [Full name]
 * [phone], [email], [location]
 * [date]
 * [Hiring manager]
 * [company name]
 */
export function formatCoverLetterHeader(cvData: UnifiedCVDataStructure, jobData?: any): string {
  const basics = cvData.basics || {};
  const name = basics.name || 'Your Name';
  
  // Handle location - can be string or object
  let locationStr = 'Your Location';
  if (basics.location) {
    if (typeof basics.location === 'string') {
      locationStr = basics.location;
    } else if (typeof basics.location === 'object') {
      const parts: string[] = [];
      if (basics.location.city) parts.push(basics.location.city);
      if (basics.location.region) parts.push(basics.location.region);
      if (basics.location.countryCode) parts.push(basics.location.countryCode);
      locationStr = parts.join(', ') || 'Your Location';
    }
  }
  
  const phone = basics.phone || '555-555-5555';
  const email = basics.email || 'email@example.com';
  
  // Format date as MM/DD/YYYY
  const today = new Date();
  const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
  
  // Get recipient info from job data
  const recipientName = jobData?.contactPerson || jobData?.contactDetails?.name || 'Hiring Manager';
  const companyName = jobData?.company || 'Company Name';
  
  // Build header lines - new format: name, contact info, date, recipient, company
  const lines: string[] = [
    name,
    `${phone}, ${email}, ${locationStr}`,
    formattedDate,
    recipientName,
    companyName
  ];
  
  return lines.join('\n');
}

/**
 * Format cover letter footer from CV basics
 * Format:
 * Sincerely,
 * [Your Name]
 */
export function formatCoverLetterFooter(cvData: UnifiedCVDataStructure): string {
  const basics = cvData.basics || {};
  // Use actual name value
  const name = basics.name || 'Your Name';
  
  const lines: string[] = [
    'Sincerely,',
    name
  ];
  
  return lines.join('\n');
}

/**
 * Merge header, body, and footer into full cover letter content
 */
export function mergeCoverLetterContent(header: string, body: string, footer: string = ''): string {
  const headerTrimmed = header.trim();
  const bodyTrimmed = body.trim();
  const footerTrimmed = footer.trim();
  
  const parts: string[] = [];
  
  if (headerTrimmed) {
    parts.push(headerTrimmed);
  }
  
  if (bodyTrimmed) {
    parts.push(bodyTrimmed);
  }
  
  if (footerTrimmed) {
    parts.push(footerTrimmed);
  }
  
  return parts.join('\n\n');
}

/**
 * Extract header from cover letter content
 * Header includes: name, contact info, date, recipient info
 * Stops when body content (greeting or paragraphs) is detected
 */
export function extractHeaderFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  const headerLines: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Stop if we detect greeting (body starts here)
    if (/^Dear\s+/i.test(trimmed)) {
      break;
    }
    
    // Stop if line looks like body content (long paragraph starting with "I", "With", etc.)
    if (trimmed.length > 100 && 
        (/^I\s+/i.test(trimmed) || 
         /^With\s+/i.test(trimmed) || 
         /^As\s+/i.test(trimmed) ||
         /^Having\s+/i.test(trimmed))) {
      break;
    }
    
    // Add line to header (includes contact info, date, recipient info)
    headerLines.push(line);
    
    // Stop after company name (typically 5 lines: name, contact, date, recipient, company)
    if (i >= 4 && trimmed && !trimmed.includes(',') && !trimmed.includes('|') && !trimmed.includes('@') && 
        !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
      // Check if next line is greeting or body
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (/^Dear\s+/i.test(nextLine) || nextLine.length > 50) {
          break;
        }
      }
    }
  }
  
  return headerLines.join('\n').trim();
}

/**
 * Extract body from cover letter content (after header, before footer)
 */
export function extractBodyFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  
  // Find where header ends (first empty line or date/recipient detection)
  let bodyStartIndex = 0;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    
    // Skip empty lines at start
    if (!line && bodyStartIndex === 0) continue;
    
    // If we hit greeting, this is where body starts
    if (/^Dear\s+/i.test(line)) {
      bodyStartIndex = i;
      break;
    }
    
    // If we hit a long paragraph that doesn't look like contact info, body starts here
    if (line.length > 80 && !line.includes('|') && !line.includes('@') && i > 1) {
      bodyStartIndex = i;
      break;
    }
  }
  
  // If we found a clear body start, use it; otherwise skip first 5 lines (header)
  if (bodyStartIndex === 0) {
    bodyStartIndex = 5; // Default: skip first 5 lines (name, contact, date, recipient, company)
  }
  
  // Find where footer starts (look for "Thank you" or "Sincerely" near the end)
  let bodyEndIndex = lines.length;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 10); i--) {
    const line = lines[i].trim();
    if (/^(Thank you|Sincerely)/i.test(line)) {
      bodyEndIndex = i;
      break;
    }
  }
  
  return lines.slice(bodyStartIndex, bodyEndIndex).join('\n').trim();
}

/**
 * Extract footer from cover letter content (closing section)
 */
export function extractFooterFromContent(content: string): string {
  if (!content) return '';
  const lines = content.split('\n');
  
  // Find where footer starts (look for "Thank you" or "Sincerely" near the end)
  let footerStartIndex = -1;
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 15); i--) {
    const line = lines[i].trim();
    if (/^(Thank you|Sincerely)/i.test(line)) {
      footerStartIndex = i;
      break;
    }
  }
  
  // If footer not found, check if last few lines look like footer (Sincerely, name pattern)
  if (footerStartIndex === -1) {
    const lastLines = lines.slice(-5);
    for (let i = 0; i < lastLines.length - 1; i++) {
      const line1 = lastLines[i].trim();
      const line2 = lastLines[i + 1].trim();
      // Check for "Sincerely," followed by a name
      if (/^Sincerely,?$/i.test(line1) && line2 && line2.length > 0) {
        footerStartIndex = lines.length - (lastLines.length - i);
        break;
      }
    }
  }
  
  if (footerStartIndex === -1) {
    return ''; // No footer found
  }
  
  return lines.slice(footerStartIndex).join('\n').trim();
}

/**
 * Clean header to remove body content but keep header structure
 * Removes long paragraphs that look like body content
 */
export function cleanHeaderContent(header: string): string {
  if (!header) return '';
  const lines = header.split('\n');
  const cleanLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Keep empty lines (they separate header sections)
    if (!trimmed) {
      cleanLines.push('');
      continue;
    }
    
    // Skip long paragraphs that don't look like header info (body content)
    if (trimmed.length > 100 && !trimmed.includes('|') && !trimmed.includes('@') && 
        !/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed) &&
        !/^(Hiring Manager|Recruitment Team|Human Resources)/i.test(trimmed) &&
        !/^[A-Z][a-zA-Z\s&,]+(?:Inc|LLC|Ltd|Corp|Corporation|Company)\.?$/.test(trimmed)) {
      continue;
    }
    
    // Keep all header lines (contact info, date, recipient info)
    cleanLines.push(trimmed);
  }
  
  return cleanLines.join('\n').trim();
}

