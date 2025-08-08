import { Types } from 'mongoose';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export class DatabaseError extends Error {
  constructor(message: string, public statusCode: number = 500) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validate MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

/**
 * Convert string to MongoDB ObjectId
 */
export function toObjectId(id: string): Types.ObjectId {
  if (!isValidObjectId(id)) {
    throw new ValidationError('Invalid ObjectId format');
  }
  return new Types.ObjectId(id);
}

/**
 * Create pagination options from query parameters
 */
export function createPaginationOptions(query: any): PaginationOptions {
  return {
    page: Math.max(1, parseInt(query.page as string) || 1),
    limit: Math.min(100, Math.max(1, parseInt(query.limit as string) || 10)),
    sortBy: query.sortBy as string || 'createdAt',
    sortOrder: (query.sortOrder as 'asc' | 'desc') || 'desc'
  };
}

/**
 * Apply pagination to a Mongoose query
 */
export async function paginateQuery<T>(
  query: any,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { page, limit, sortBy, sortOrder } = options;
  
  // Clone the query for counting
  const countQuery = query.clone();
  
  // Apply sorting
  const sort: any = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  // Apply pagination
  const skip = (page - 1) * limit;
  
  // Execute queries
  const [data, total] = await Promise.all([
    query.sort(sort).skip(skip).limit(limit).exec(),
    countQuery.countDocuments().exec()
  ]);
  
  const totalPages = Math.ceil(total / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

/**
 * Create search filter for text fields
 */
export function createSearchFilter(searchTerm: string, fields: string[]) {
  if (!searchTerm) return {};
  
  const searchRegex = new RegExp(searchTerm, 'i');
  const searchConditions = fields.map(field => ({
    [field]: searchRegex
  }));
  
  return { $or: searchConditions };
}

/**
 * Create date range filter
 */
export function createDateRangeFilter(
  startDate?: string,
  endDate?: string,
  field: string = 'createdAt'
) {
  const filter: any = {};
  
  if (startDate) {
    filter[field] = { $gte: new Date(startDate) };
  }
  
  if (endDate) {
    filter[field] = { ...filter[field], $lte: new Date(endDate) };
  }
  
  return Object.keys(filter).length > 0 ? filter : {};
}

/**
 * Sanitize and validate email
 */
export function validateEmail(email: string): string {
  // More permissive email regex that handles edge cases
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
  return email.toLowerCase().trim();
}

/**
 * Sanitize and validate password
 */
export function validatePassword(password: string): string {
  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long', 'password');
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    throw new ValidationError('Password must contain at least one lowercase letter', 'password');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    throw new ValidationError('Password must contain at least one uppercase letter', 'password');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    throw new ValidationError('Password must contain at least one number', 'password');
  }
  
  return password;
}

/**
 * Generate random string for tokens
 */
export function generateRandomString(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Calculate storage usage in MB
 */
export function calculateStorageSize(sizeInBytes: number): number {
  return Math.round((sizeInBytes / (1024 * 1024)) * 100) / 100;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Create error response
 */
export function createErrorResponse(error: any) {
  if (error instanceof DatabaseError) {
    return {
      success: false,
      message: error.message,
      statusCode: error.statusCode
    };
  }
  
  if (error instanceof ValidationError) {
    return {
      success: false,
      message: error.message,
      field: error.field,
      statusCode: 400
    };
  }
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((err: any) => err.message);
    return {
      success: false,
      message: 'Validation failed',
      errors: messages,
      statusCode: 400
    };
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return {
      success: false,
      message: `${field} already exists`,
      field,
      statusCode: 409
    };
  }
  
  return {
    success: false,
    message: 'Internal server error',
    statusCode: 500
  };
} 