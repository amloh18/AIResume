/**
 * Centralized Error Code Definitions
 * 
 * This file provides a comprehensive set of error codes for the application.
 * All API routes should use these codes for consistent error handling.
 */

export enum ErrorCode {
  // ========== Authentication Errors ==========
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_EXPIRED = 'AUTH_EXPIRED',
  AUTH_INVALID = 'AUTH_INVALID',
  AUTH_MISSING_TOKEN = 'AUTH_MISSING_TOKEN',
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_SESSION_EXPIRED = 'AUTH_SESSION_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  
  // ========== Credit & Usage Errors ==========
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  CREDIT_CHECK_FAILED = 'CREDIT_CHECK_FAILED',
  CREDIT_DEDUCTION_FAILED = 'CREDIT_DEDUCTION_FAILED',
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_INACTIVE = 'SUBSCRIPTION_INACTIVE',
  
  // ========== Payment Errors ==========
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_PROVIDER_UNAVAILABLE = 'PAYMENT_PROVIDER_UNAVAILABLE',
  PAYMENT_INVALID_AMOUNT = 'PAYMENT_INVALID_AMOUNT',
  PAYMENT_INVALID_CURRENCY = 'PAYMENT_INVALID_CURRENCY',
  PAYMENT_METHOD_REQUIRED = 'PAYMENT_METHOD_REQUIRED',
  PAYMENT_VERIFICATION_FAILED = 'PAYMENT_VERIFICATION_FAILED',
  PAYMENT_WEBHOOK_INVALID = 'PAYMENT_WEBHOOK_INVALID',
  
  // ========== Database Errors ==========
  DB_CONNECTION_FAILED = 'DB_CONNECTION_FAILED',
  DB_TRANSACTION_FAILED = 'DB_TRANSACTION_FAILED',
  DB_QUERY_FAILED = 'DB_QUERY_FAILED',
  DB_UPDATE_FAILED = 'DB_UPDATE_FAILED',
  DB_DELETE_FAILED = 'DB_DELETE_FAILED',
  DB_RECORD_NOT_FOUND = 'DB_RECORD_NOT_FOUND',
  DB_DUPLICATE_RECORD = 'DB_DUPLICATE_RECORD',
  
  // ========== Validation Errors ==========
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  INVALID_DATE = 'INVALID_DATE',
  INVALID_ENUM_VALUE = 'INVALID_ENUM_VALUE',
  
  // ========== Resource Errors ==========
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  RESOURCE_DELETED = 'RESOURCE_DELETED',
  
  // ========== Job & CV Errors ==========
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',
  JOB_CREATION_FAILED = 'JOB_CREATION_FAILED',
  JOB_UPDATE_FAILED = 'JOB_UPDATE_FAILED',
  JOB_DELETE_FAILED = 'JOB_DELETE_FAILED',
  CV_NOT_FOUND = 'CV_NOT_FOUND',
  CV_CREATION_FAILED = 'CV_CREATION_FAILED',
  CV_UPDATE_FAILED = 'CV_UPDATE_FAILED',
  CV_DELETE_FAILED = 'CV_DELETE_FAILED',
  CV_CONFLICT = 'CV_CONFLICT',
  
  // ========== Subscription Errors ==========
  SUBSCRIPTION_NOT_FOUND = 'SUBSCRIPTION_NOT_FOUND',
  SUBSCRIPTION_ACTIVATION_FAILED = 'SUBSCRIPTION_ACTIVATION_FAILED',
  SUBSCRIPTION_RENEWAL_FAILED = 'SUBSCRIPTION_RENEWAL_FAILED',
  SUBSCRIPTION_CANCELLATION_FAILED = 'SUBSCRIPTION_CANCELLATION_FAILED',
  PLAN_NOT_FOUND = 'PLAN_NOT_FOUND',
  PLAN_NOT_AVAILABLE = 'PLAN_NOT_AVAILABLE',
  INVALID_PLAN_KEY = 'INVALID_PLAN_KEY',
  
  // ========== Webhook Errors ==========
  WEBHOOK_INVALID_SIGNATURE = 'WEBHOOK_INVALID_SIGNATURE',
  WEBHOOK_DUPLICATE_EVENT = 'WEBHOOK_DUPLICATE_EVENT',
  WEBHOOK_PROCESSING_FAILED = 'WEBHOOK_PROCESSING_FAILED',
  WEBHOOK_RETRY_EXHAUSTED = 'WEBHOOK_RETRY_EXHAUSTED',
  
  // ========== Rate Limiting ==========
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_QUOTA_EXCEEDED = 'RATE_LIMIT_QUOTA_EXCEEDED',
  
  // ========== External Service Errors ==========
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXTERNAL_SERVICE_UNAVAILABLE',
  EXTERNAL_SERVICE_TIMEOUT = 'EXTERNAL_SERVICE_TIMEOUT',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  AI_SERVICE_TIMEOUT = 'AI_SERVICE_TIMEOUT',
  
  // ========== File & Storage Errors ==========
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_DELETE_FAILED = 'FILE_DELETE_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  
  // ========== General Errors ==========
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * HTTP Status Code Mapping
 * Maps error codes to appropriate HTTP status codes
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  // Auth errors - 401 Unauthorized
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_EXPIRED]: 401,
  [ErrorCode.AUTH_INVALID]: 401,
  [ErrorCode.AUTH_MISSING_TOKEN]: 401,
  [ErrorCode.AUTH_INVALID_TOKEN]: 401,
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 403,
  
  // Credit errors - 402 Payment Required or 403 Forbidden
  [ErrorCode.INSUFFICIENT_CREDITS]: 402,
  [ErrorCode.CREDIT_CHECK_FAILED]: 500,
  [ErrorCode.CREDIT_DEDUCTION_FAILED]: 500,
  [ErrorCode.USAGE_LIMIT_EXCEEDED]: 403,
  [ErrorCode.SUBSCRIPTION_EXPIRED]: 402,
  [ErrorCode.SUBSCRIPTION_INACTIVE]: 402,
  
  // Payment errors - 402 Payment Required or 400 Bad Request
  [ErrorCode.PAYMENT_FAILED]: 402,
  [ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE]: 503,
  [ErrorCode.PAYMENT_INVALID_AMOUNT]: 400,
  [ErrorCode.PAYMENT_INVALID_CURRENCY]: 400,
  [ErrorCode.PAYMENT_METHOD_REQUIRED]: 400,
  [ErrorCode.PAYMENT_VERIFICATION_FAILED]: 400,
  [ErrorCode.PAYMENT_WEBHOOK_INVALID]: 400,
  
  // Database errors - 500 Internal Server Error
  [ErrorCode.DB_CONNECTION_FAILED]: 503,
  [ErrorCode.DB_TRANSACTION_FAILED]: 500,
  [ErrorCode.DB_QUERY_FAILED]: 500,
  [ErrorCode.DB_UPDATE_FAILED]: 500,
  [ErrorCode.DB_DELETE_FAILED]: 500,
  [ErrorCode.DB_RECORD_NOT_FOUND]: 404,
  [ErrorCode.DB_DUPLICATE_RECORD]: 409,
  
  // Validation errors - 400 Bad Request
  [ErrorCode.VALIDATION_FAILED]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.INVALID_EMAIL]: 400,
  [ErrorCode.INVALID_PHONE]: 400,
  [ErrorCode.INVALID_DATE]: 400,
  [ErrorCode.INVALID_ENUM_VALUE]: 400,
  
  // Resource errors - 404 Not Found, 409 Conflict, etc.
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_CONFLICT]: 409,
  [ErrorCode.RESOURCE_LOCKED]: 423,
  [ErrorCode.RESOURCE_DELETED]: 410,
  
  // Job & CV errors
  [ErrorCode.JOB_NOT_FOUND]: 404,
  [ErrorCode.JOB_CREATION_FAILED]: 500,
  [ErrorCode.JOB_UPDATE_FAILED]: 500,
  [ErrorCode.JOB_DELETE_FAILED]: 500,
  [ErrorCode.CV_NOT_FOUND]: 404,
  [ErrorCode.CV_CREATION_FAILED]: 500,
  [ErrorCode.CV_UPDATE_FAILED]: 500,
  [ErrorCode.CV_DELETE_FAILED]: 500,
  [ErrorCode.CV_CONFLICT]: 409,
  
  // Subscription errors
  [ErrorCode.SUBSCRIPTION_NOT_FOUND]: 404,
  [ErrorCode.SUBSCRIPTION_ACTIVATION_FAILED]: 500,
  [ErrorCode.SUBSCRIPTION_RENEWAL_FAILED]: 500,
  [ErrorCode.SUBSCRIPTION_CANCELLATION_FAILED]: 500,
  [ErrorCode.PLAN_NOT_FOUND]: 404,
  [ErrorCode.PLAN_NOT_AVAILABLE]: 400,
  [ErrorCode.INVALID_PLAN_KEY]: 400,
  
  // Webhook errors
  [ErrorCode.WEBHOOK_INVALID_SIGNATURE]: 401,
  [ErrorCode.WEBHOOK_DUPLICATE_EVENT]: 409,
  [ErrorCode.WEBHOOK_PROCESSING_FAILED]: 500,
  [ErrorCode.WEBHOOK_RETRY_EXHAUSTED]: 500,
  
  // Rate limiting - 429 Too Many Requests
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.RATE_LIMIT_QUOTA_EXCEEDED]: 429,
  
  // External service errors - 503 Service Unavailable
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.AI_SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.AI_SERVICE_TIMEOUT]: 504,
  
  // File & storage errors
  [ErrorCode.FILE_UPLOAD_FAILED]: 500,
  [ErrorCode.FILE_DELETE_FAILED]: 500,
  [ErrorCode.FILE_NOT_FOUND]: 404,
  [ErrorCode.FILE_TOO_LARGE]: 413,
  [ErrorCode.INVALID_FILE_TYPE]: 400,
  [ErrorCode.STORAGE_QUOTA_EXCEEDED]: 413,
  
  // General errors
  [ErrorCode.INTERNAL_SERVER_ERROR]: 500,
  [ErrorCode.NOT_IMPLEMENTED]: 501,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * Error Response Interface
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    retryable?: boolean;
    retryAfterSeconds?: number;
  };
}

/**
 * Success Response Interface
 */
export interface SuccessResponse<T = any> {
  success: true;
  data?: T;
  message?: string;
}

/**
 * Create a standardized error response
 * 
 * @param code - Error code from ErrorCode enum
 * @param message - Human-readable error message
 * @param details - Additional error details (optional)
 * @param retryable - Whether the error is retryable (optional)
 * @param retryAfterSeconds - Seconds to wait before retry (optional)
 * @returns ErrorResponse object
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  retryable: boolean = false,
  retryAfterSeconds?: number
): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
      timestamp: new Date().toISOString(),
      retryable,
      retryAfterSeconds,
    },
  };
}

/**
 * Get HTTP status code for an error code
 * 
 * @param code - Error code
 * @returns HTTP status code
 */
export function getErrorStatus(code: ErrorCode): number {
  return ERROR_STATUS_MAP[code] || 500;
}

/**
 * Create a Next.js Response with error
 * 
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional details
 * @param retryable - Whether retryable
 * @param retryAfterSeconds - Retry after seconds
 * @returns NextResponse with error
 */
export function createErrorNextResponse(
  code: ErrorCode,
  message: string,
  details?: any,
  retryable: boolean = false,
  retryAfterSeconds?: number
) {
  const errorResponse = createErrorResponse(code, message, details, retryable, retryAfterSeconds);
  const status = getErrorStatus(code);
  
  const headers: HeadersInit = {};
  if (retryAfterSeconds !== undefined) {
    headers['Retry-After'] = retryAfterSeconds.toString();
  }
  
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

/**
 * Check if an error is retryable
 * 
 * @param code - Error code
 * @returns Whether the error is typically retryable
 */
export function isRetryableError(code: ErrorCode): boolean {
  const retryableCodes = [
    ErrorCode.DB_CONNECTION_FAILED,
    ErrorCode.DB_TRANSACTION_FAILED,
    ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
    ErrorCode.EXTERNAL_SERVICE_TIMEOUT,
    ErrorCode.AI_SERVICE_UNAVAILABLE,
    ErrorCode.AI_SERVICE_TIMEOUT,
    ErrorCode.PAYMENT_PROVIDER_UNAVAILABLE,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.WEBHOOK_PROCESSING_FAILED,
  ];
  
  return retryableCodes.includes(code);
}

