/**
 * Validation Layer
 * 
 * Central exports for all validation schemas and utilities.
 */

// CV validation
export * from './cv-schemas';

// User validation
export * from './user-schemas';

// Common validation utilities
export { z } from 'zod';

/**
 * Generic validation error formatter
 */
export function formatValidationErrors(error: any): { field: string; message: string }[] {
  if (error.errors) {
    return error.errors.map((err: any) => ({
      field: err.path.join('.'),
      message: err.message,
    }));
  }
  return [{ field: 'unknown', message: error.message || 'Validation failed' }];
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: any): boolean {
  return error.name === 'ZodError' || error.errors !== undefined;
}