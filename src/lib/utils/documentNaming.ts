/**
 * Utility functions for generating consistent document names
 */

export interface DocumentNamingOptions {
  jobTitle?: string;
  company?: string;
  documentType: 'cv' | 'cover-letter';
  baseName?: string;
  isMaster?: boolean;
}

/**
 * Generate a standardized document name based on job and document type
 */
export function generateDocumentName(options: DocumentNamingOptions): string {
  const { jobTitle, company, documentType, baseName, isMaster } = options;

  // Handle master CV naming
  if (isMaster && documentType === 'cv') {
    return baseName ? `${baseName} (Master CV)` : 'Master CV';
  }

  // Handle job-specific naming
  if (jobTitle && company) {
    const cleanJobTitle = cleanString(jobTitle);
    const cleanCompany = cleanString(company);
    
    switch (documentType) {
      case 'cv':
        return `${cleanJobTitle}-${cleanCompany}-CV`;
      case 'cover-letter':
        return `${cleanJobTitle}-${cleanCompany}-CoverLetter`;
      default:
        return `${cleanJobTitle}-${cleanCompany}-Document`;
    }
  }

  // Handle partial job information
  if (jobTitle && !company) {
    const cleanJobTitle = cleanString(jobTitle);
    switch (documentType) {
      case 'cv':
        return `${cleanJobTitle}-CV`;
      case 'cover-letter':
        return `${cleanJobTitle}-CoverLetter`;
      default:
        return `${cleanJobTitle}-Document`;
    }
  }

  if (company && !jobTitle) {
    const cleanCompany = cleanString(company);
    switch (documentType) {
      case 'cv':
        return `${cleanCompany}-CV`;
      case 'cover-letter':
        return `${cleanCompany}-CoverLetter`;
      default:
        return `${cleanCompany}-Document`;
    }
  }

  // Fallback naming
  if (baseName) {
    switch (documentType) {
      case 'cv':
        return `${baseName} (Copy)`;
      case 'cover-letter':
        return `${baseName} (Copy)`;
      default:
        return `${baseName} (Copy)`;
    }
  }

  // Default naming
  switch (documentType) {
    case 'cv':
      return 'New CV';
    case 'cover-letter':
      return 'New Cover Letter';
    default:
      return 'New Document';
  }
}

/**
 * Clean string for use in file names (remove special characters, limit length)
 */
function cleanString(str: string): string {
  return str
    .trim()
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .substring(0, 50) // Limit length
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Generate suggestions for document names based on context
 */
export function generateDocumentNameSuggestions(options: DocumentNamingOptions): string[] {
  const { jobTitle, company, documentType, baseName } = options;
  const suggestions: string[] = [];

  // Primary suggestion
  suggestions.push(generateDocumentName(options));

  // Alternative suggestions
  if (jobTitle && company) {
    const cleanJobTitle = cleanString(jobTitle);
    const cleanCompany = cleanString(company);
    
    // Different formats
    suggestions.push(`${cleanCompany}_${cleanJobTitle}_${documentType.toUpperCase()}`);
    suggestions.push(`${cleanJobTitle}_at_${cleanCompany}`);
    
    if (documentType === 'cover-letter') {
      suggestions.push(`CoverLetter_${cleanJobTitle}_${cleanCompany}`);
      suggestions.push(`${cleanCompany}_Application_Letter`);
    }
  }

  // Date-based suggestions
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
  suggestions.push(`${documentType.replace('-', '_')}_${dateStr}`);

  // Remove duplicates and return
  return Array.from(new Set(suggestions));
}

/**
 * Validate document name for common issues
 */
export function validateDocumentName(name: string): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Check length
  if (name.length < 1) {
    errors.push('Document name cannot be empty');
  }
  if (name.length > 100) {
    errors.push('Document name is too long (max 100 characters)');
    suggestions.push(name.substring(0, 97) + '...');
  }

  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/g;
  if (invalidChars.test(name)) {
    errors.push('Document name contains invalid characters');
    suggestions.push(name.replace(invalidChars, '-'));
  }

  // Check for reserved names (Windows)
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  if (reservedNames.includes(name.toUpperCase())) {
    errors.push('Document name is a reserved system name');
    suggestions.push(`${name}_document`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}