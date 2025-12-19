import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { formatValidationErrors } from '@/lib/validation';

/**
 * Standardized API Error Handling
 * 
 * Provides consistent error responses across all API routes.
 */

export class APIError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Common API errors
export class NotFoundError extends APIError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends APIError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ValidationError extends APIError {
  constructor(details: any) {
    super('Validation failed', 400, 'VALIDATION_ERROR', details);
  }
}

export class ConflictError extends APIError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
  }
}

/**
 * Standard error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    details?: any;
    stack?: string;
  };
  statusCode: number;
}

/**
 * Convert any error to standard API error response
 */
export function handleAPIError(error: unknown): ErrorResponse {
  // Check for Event objects first (common cause of [object Event] errors)
  if (error && typeof error === 'object') {
    if (error instanceof Event || ('target' in error && 'preventDefault' in error)) {
      console.error('Event object caught in API error handler:', {
        type: (error as Event).type,
        target: (error as Event).target
      });
      return {
        success: false,
        error: {
          message: 'Resource loading error occurred',
          code: 'RESOURCE_ERROR',
          details: 'An error occurred while loading a resource'
        },
        statusCode: 500,
      };
    }
  }
  
  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: formatValidationErrors(error),
      },
      statusCode: 400,
    };
  }

  // Custom API errors
  if (error instanceof APIError) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code || 'API_ERROR',
        details: error.details,
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
      },
      statusCode: error.statusCode,
    };
  }

  // Mongoose validation errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
    const mongooseError = error as any;
    const details = Object.values(mongooseError.errors || {}).map((err: any) => ({
      field: err.path,
      message: err.message,
    }));
    
    return {
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details,
      },
      statusCode: 400,
    };
  }

  // Mongoose duplicate key errors
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    const mongooseError = error as any;
    const field = Object.keys(mongooseError.keyPattern || {})[0] || 'field';
    
    return {
      success: false,
      error: {
        message: `${field} already exists`,
        code: 'DUPLICATE_KEY',
        details: { field },
      },
      statusCode: 409,
    };
  }

  // Mongoose cast errors
  if (error && typeof error === 'object' && 'name' in error && error.name === 'CastError') {
    const castError = error as any;
    return {
      success: false,
      error: {
        message: `Invalid ${castError.path}: ${castError.value}`,
        code: 'INVALID_INPUT',
        details: { field: castError.path, value: castError.value },
      },
      statusCode: 400,
    };
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV === 'development' ? { stack: error.stack } : {}),
      },
      statusCode: 500,
    };
  }

  // Unknown errors - safely handle any type
  let errorMessage = 'An unknown error occurred';
  if (error && typeof error === 'object') {
    // Try to extract meaningful information
    try {
      if ('message' in error && typeof error.message === 'string') {
        errorMessage = error.message;
      } else {
        errorMessage = JSON.stringify(error);
      }
    } catch {
      errorMessage = String(error);
    }
  } else {
    errorMessage = String(error);
  }
  
  return {
    success: false,
    error: {
      message: errorMessage,
      code: 'UNKNOWN_ERROR',
    },
    statusCode: 500,
  };
}

/**
 * Create NextResponse from error
 */
export function createErrorResponse(error: unknown): NextResponse {
  // Safely handle Event objects before processing
  let safeError = error;
  if (error && typeof error === 'object') {
    if (error instanceof Event || ('target' in error && 'preventDefault' in error)) {
      // Convert Event object to Error
      safeError = new Error('Resource loading error occurred');
    }
  }
  
  const errorResponse = handleAPIError(safeError);
  
  return NextResponse.json(
    {
      success: errorResponse.success,
      error: errorResponse.error,
    },
    { status: errorResponse.statusCode }
  );
}

/**
 * Success response helper
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...(message ? { message } : {}),
      data,
    },
    { status }
  );
}

/**
 * Async handler wrapper for API routes
 * Automatically handles errors and returns standardized responses
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const result = await handler(...args);
      
      // If handler returns a NextResponse, return it directly
      if (result instanceof NextResponse) {
        return result;
      }
      
      // Otherwise wrap in success response
      return createSuccessResponse(result);
    } catch (error) {
      return createErrorResponse(error);
    }
  };
}

/**
 * Assert user is authenticated
 */
export function assertAuthenticated(userId: string | null | undefined): asserts userId is string {
  if (!userId) {
    throw new UnauthorizedError('Authentication required');
  }
}

/**
 * Assert user has required role
 */
export function assertRole(userRole: string | undefined, requiredRoles: string[]): void {
  if (!userRole || !requiredRoles.includes(userRole)) {
    throw new ForbiddenError('Insufficient permissions');
  }
}

/**
 * Assert resource belongs to user
 */
export function assertOwnership(
  resourceUserId: string,
  currentUserId: string,
  allowAdmin: boolean = true,
  userRole?: string
): void {
  const isOwner = resourceUserId === currentUserId;
  const isAdmin = allowAdmin && (userRole === 'admin' || userRole === 'superadmin');
  
  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('Access denied');
  }
}

/**
 * Sanitizes error messages for user display
 * Filters out technical/internal error details that shouldn't be shown to users
 */
export function sanitizeErrorMessage(error: unknown, fallbackMessage: string = 'An error occurred. Please try again.'): string {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Filter out Gemini API quota errors - show user-friendly message instead
  if (
    errorMessage.includes('All Gemini API keys failed') ||
    errorMessage.includes('Gemini API error') ||
    errorMessage.includes('quota') ||
    errorMessage.includes('RESOURCE_EXHAUSTED') ||
    errorMessage.includes('generativelanguage.googleapis.com')
  ) {
    return 'The AI service is temporarily unavailable. Please try again in a few moments.';
  }
  
  // Filter out other technical API errors
  if (
    errorMessage.includes('AI API call failed') &&
    (errorMessage.includes('429') || errorMessage.includes('quota'))
  ) {
    return 'The AI service is temporarily unavailable. Please try again in a few moments.';
  }
  
  // Return the original error message if it's user-friendly, otherwise return fallback
  // Check if the error message looks like a technical error (contains API details, stack traces, etc.)
  const isTechnicalError = 
    errorMessage.includes('at ') ||
    errorMessage.includes('Error:') ||
    errorMessage.includes('TypeError') ||
    errorMessage.includes('ReferenceError') ||
    errorMessage.includes('api.google') ||
    errorMessage.includes('generativelanguage');
  
  if (isTechnicalError && !errorMessage.includes('Please')) {
    return fallbackMessage;
  }
  
  return errorMessage;
}