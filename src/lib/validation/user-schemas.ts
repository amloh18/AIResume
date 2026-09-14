import { z } from 'zod';

/**
 * User Data Validation Schemas
 * 
 * Provides Zod schemas for validating user-related data.
 */

// User registration schema
export const UserRegistrationSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  userRole: z.enum(['Student', 'Professional', 'Recruiter']).optional(),
});

// User login schema
export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Admin login schema
export const AdminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Passwordless login schema
export const PasswordlessLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  verificationCode: z.string().length(6, 'Verification code must be 6 digits'),
});

// User profile update schema
export const UserProfileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
  linkedin: z.string().url().max(200).optional().or(z.literal('')),
  github: z.string().url().max(200).optional().or(z.literal('')),
  summary: z.string().max(1000).optional(),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  experience: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
});

// User settings schema
export const UserSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }).optional(),
  timezone: z.string().max(100).optional(),
  languagePreference: z.string().max(10).optional(),
});

// Subscription schema
const PlanKeySchema = z.enum([
  'free',
  'starter_monthly',
  'starter_yearly',
  'focused_monthly',
  'focused_yearly',
  'focused_monthly',
  'focused_quarterly',
  'focused_yearly',
  'focused_yearly'
]);

export const SubscriptionSchema = z.object({
  planKey: PlanKeySchema,
  status: z.enum(['active', 'inactive', 'cancelled', 'expired']),
  provider: z.enum(['stripe', 'razorpay', 'polar', 'admin', 'none']),
  providerSubscriptionId: z.string().optional(),
  providerCustomerId: z.string().optional(),
  interval: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']),
});

// Email verification schema
export const EmailVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

// Password reset request schema
export const PasswordResetRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// Password reset schema
export const PasswordResetSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

// Export validation functions
export function validateUserRegistration(data: unknown) {
  return UserRegistrationSchema.parse(data);
}

export function validateUserLogin(data: unknown) {
  return UserLoginSchema.parse(data);
}

export function validateAdminLogin(data: unknown) {
  return AdminLoginSchema.parse(data);
}

export function validatePasswordlessLogin(data: unknown) {
  return PasswordlessLoginSchema.parse(data);
}

export function validateUserProfileUpdate(data: unknown) {
  return UserProfileUpdateSchema.parse(data);
}

export function validateUserSettings(data: unknown) {
  return UserSettingsSchema.parse(data);
}

export function validateEmailVerification(data: unknown) {
  return EmailVerificationSchema.parse(data);
}

export function validatePasswordReset(data: unknown) {
  return PasswordResetSchema.parse(data);
}

// Safe parse versions
export function safeValidateUserRegistration(data: unknown) {
  return UserRegistrationSchema.safeParse(data);
}

export function safeValidateUserLogin(data: unknown) {
  return UserLoginSchema.safeParse(data);
}

export function safeValidateUserProfileUpdate(data: unknown) {
  return UserProfileUpdateSchema.safeParse(data);
}
