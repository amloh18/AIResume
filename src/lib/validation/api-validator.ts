// @ts-nocheck
/**
 * API Validation Helper
 * Provides consistent validation and error handling for API routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

/**
 * Standard API Error Response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/**
 * Standard API Success Response
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Validate request body against a Zod schema
 * Returns validated data or throws a formatted error
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Validation failed', error);
    }
    throw error;
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  try {
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError('Query validation failed', error);
    }
    throw error;
  }
}

/**
 * Custom Validation Error
 */
export class ValidationError extends Error {
  public zodError: ZodError;

  constructor(message: string, zodError: ZodError) {
    super(message);
    this.name = 'ValidationError';
    this.zodError = zodError;
  }
}

/**
 * Format Zod errors into a user-friendly structure
 */
export function formatZodError(error: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });
  
  return formatted;
}

/**
 * Create a standard error response
 */
export function errorResponse(
  code: string,
  message: string,
  details?: Record<string, string[]>,
  status: number = 400
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
    },
    { status }
  );
}

/**
 * Create a standard success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(message && { message }),
    },
    { status }
  );
}

/**
 * Handle validation errors and return formatted response
 */
export function handleValidationError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ValidationError) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed',
      formatZodError(error.zodError),
      400
    );
  }
  
  if (error instanceof ZodError) {
    return errorResponse(
      'VALIDATION_ERROR',
      'Request validation failed',
      formatZodError(error),
      400
    );
  }
  
  // Generic error
  return errorResponse(
    'INTERNAL_ERROR',
    error instanceof Error ? error.message : 'An unexpected error occurred',
    undefined,
    500
  );
}

/**
 * API Route wrapper with automatic error handling
 * Example usage:
 * 
 * export const POST = withValidation(loginSchema, async (request, validatedData) => {
 *   // validatedData is already validated and typed
 *   const user = await authenticateUser(validatedData.email, validatedData.password);
 *   return successResponse({ user });
 * });
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, validatedData: T) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const validatedData = await validateRequest(request, schema);
      return await handler(request, validatedData);
    } catch (error) {
      return handleValidationError(error);
    }
  };
}

/**
 * API Route wrapper without validation (for GET requests, etc.)
 */
export function withErrorHandling(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      console.error('API Error:', error);
      return handleValidationError(error);
    }
  };
}

