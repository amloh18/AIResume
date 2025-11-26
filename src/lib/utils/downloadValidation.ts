/**
 * Download Validation Utilities
 * 
 * Provides validation for download requests
 */

import { z } from 'zod';
import { configService } from '@/lib/services/configService';

export const downloadFormatSchema = z.enum(['pdf', 'docx', 'doc']);
export const paperSizeSchema = z.enum(['A4', 'Letter']);
export const orientationSchema = z.enum(['portrait', 'landscape']);

export interface DownloadValidationResult {
  valid: boolean;
  errors: string[];
  format?: 'pdf' | 'docx' | 'doc';
  paperSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
}

/**
 * Validate download request parameters
 */
export function validateDownloadParams(
  format: string | null,
  paperSize: string | null,
  orientation: string | null
): DownloadValidationResult {
  const errors: string[] = [];
  const config = configService.getDownloadConfig();

  // Validate format
  const formatResult = downloadFormatSchema.safeParse(format || 'pdf');
  if (!formatResult.success) {
    errors.push(`Invalid format. Allowed: ${config.allowedFormats.join(', ')}`);
  }

  // Validate paper size
  const paperSizeResult = paperSizeSchema.safeParse(paperSize || 'A4');
  if (!paperSizeResult.success) {
    errors.push('Invalid paper size. Allowed: A4, Letter');
  }

  // Validate orientation
  const orientationResult = orientationSchema.safeParse(orientation || 'portrait');
  if (!orientationResult.success) {
    errors.push('Invalid orientation. Allowed: portrait, landscape');
  }

  // Check if format is allowed
  if (formatResult.success && !config.allowedFormats.includes(formatResult.data)) {
    errors.push(`Format ${formatResult.data} is not allowed`);
  }

  return {
    valid: errors.length === 0,
    errors,
    format: formatResult.success ? formatResult.data : 'pdf',
    paperSize: paperSizeResult.success ? paperSizeResult.data : 'A4',
    orientation: orientationResult.success ? orientationResult.data : 'portrait'
  };
}

/**
 * Sanitize filename to prevent path traversal
 */
export function sanitizeFilename(filename: string): string {
  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\./g, '').replace(/\//g, '').replace(/\\/g, '');
  
  // Remove special characters except dash and underscore
  sanitized = sanitized.replace(/[^a-zA-Z0-9\-_]/g, '-');
  
  // Limit length
  sanitized = sanitized.substring(0, 100);
  
  return sanitized || 'file';
}

/**
 * Validate file size
 */
export function validateFileSize(fileSize: number): { valid: boolean; error?: string } {
  const config = configService.getDownloadConfig();
  
  if (fileSize > config.maxFileSize) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${config.maxFileSize} bytes`
    };
  }
  
  return { valid: true };
}

