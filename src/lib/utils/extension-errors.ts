/**
 * Extension-Specific Error Handling
 * 
 * Standardized error codes and formatting for Chrome Extension API responses.
 * Provides consistent error structure that the extension can handle.
 */

export enum ExtensionErrorCode {
  // Authentication errors
  AUTH_FAILED = 'EXT_AUTH_FAILED',
  AUTH_EXPIRED = 'EXT_AUTH_EXPIRED',
  AUTH_INVALID = 'EXT_AUTH_INVALID',
  AUTH_MISSING = 'EXT_AUTH_MISSING',
  
  // Credit errors
  INSUFFICIENT_CREDITS = 'EXT_INSUFFICIENT_CREDITS',
  CREDIT_CHECK_FAILED = 'EXT_CREDIT_CHECK_FAILED',
  
  // Job creation errors
  JOB_CREATION_FAILED = 'EXT_JOB_CREATION_FAILED',
  JOB_VALIDATION_FAILED = 'EXT_JOB_VALIDATION_FAILED',
  JOB_ALREADY_EXISTS = 'EXT_JOB_ALREADY_EXISTS',
  
  // CV match errors
  CV_MATCH_FAILED = 'EXT_CV_MATCH_FAILED',
  CV_MATCH_TIMEOUT = 'EXT_CV_MATCH_TIMEOUT',
  CV_NOT_FOUND = 'EXT_CV_NOT_FOUND',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'EXT_RATE_LIMIT_EXCEEDED',
  
  // General errors
  NETWORK_ERROR = 'EXT_NETWORK_ERROR',
  SERVER_ERROR = 'EXT_SERVER_ERROR',
  UNKNOWN_ERROR = 'EXT_UNKNOWN_ERROR'
}

export interface ExtensionError {
  code: ExtensionErrorCode;
  message: string;
  timestamp: string;
  details?: any;
  retryable?: boolean;
  retryAfter?: number; // seconds
}

export interface ExtensionErrorResponse {
  success: false;
  error: ExtensionError;
}

export interface ExtensionSuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

export type ExtensionResponse<T = any> = ExtensionSuccessResponse<T> | ExtensionErrorResponse;

/**
 * Format an error response for the extension
 */
export function formatExtensionError(
  code: ExtensionErrorCode,
  message: string,
  details?: any,
  retryable: boolean = false,
  retryAfter?: number
): ExtensionErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      details,
      retryable,
      retryAfter
    }
  };
}

/**
 * Format a success response for the extension
 */
export function formatExtensionSuccess<T>(
  data?: T,
  message?: string
): ExtensionSuccessResponse<T> {
  return {
    success: true,
    data,
    message
  };
}

/**
 * Get user-friendly error message for extension error code
 */
export function getExtensionErrorMessage(code: ExtensionErrorCode): string {
  const messages: Record<ExtensionErrorCode, string> = {
    [ExtensionErrorCode.AUTH_FAILED]: 'Authentication failed. Please sign in again.',
    [ExtensionErrorCode.AUTH_EXPIRED]: 'Your session has expired. Please sign in again.',
    [ExtensionErrorCode.AUTH_INVALID]: 'Invalid authentication token. Please sign in again.',
    [ExtensionErrorCode.AUTH_MISSING]: 'Authentication required. Please sign in.',
    
    [ExtensionErrorCode.INSUFFICIENT_CREDITS]: 'You have run out of credits. Please upgrade your plan.',
    [ExtensionErrorCode.CREDIT_CHECK_FAILED]: 'Unable to check credits. Please try again.',
    
    [ExtensionErrorCode.JOB_CREATION_FAILED]: 'Failed to create job. Please try again.',
    [ExtensionErrorCode.JOB_VALIDATION_FAILED]: 'Invalid job data. Please check your input.',
    [ExtensionErrorCode.JOB_ALREADY_EXISTS]: 'This job already exists in your tracker.',
    
    [ExtensionErrorCode.CV_MATCH_FAILED]: 'Failed to analyze CV match. Please try again.',
    [ExtensionErrorCode.CV_MATCH_TIMEOUT]: 'CV match analysis timed out. Please try again.',
    [ExtensionErrorCode.CV_NOT_FOUND]: 'CV not found. Please create a CV first.',
    
    [ExtensionErrorCode.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait a moment and try again.',
    
    [ExtensionErrorCode.NETWORK_ERROR]: 'Network error. Please check your connection.',
    [ExtensionErrorCode.SERVER_ERROR]: 'Server error. Please try again later.',
    [ExtensionErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
  };
  
  return messages[code] || messages[ExtensionErrorCode.UNKNOWN_ERROR];
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(code: ExtensionErrorCode): boolean {
  const retryableCodes = [
    ExtensionErrorCode.NETWORK_ERROR,
    ExtensionErrorCode.SERVER_ERROR,
    ExtensionErrorCode.CV_MATCH_TIMEOUT,
    ExtensionErrorCode.CREDIT_CHECK_FAILED
  ];
  
  return retryableCodes.includes(code);
}

