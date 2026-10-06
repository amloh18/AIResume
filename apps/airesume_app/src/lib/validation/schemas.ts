// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
/**
 * Zod Validation Schemas
 * Centralized validation for API endpoints and forms
 */

import { z } from 'zod';

// ============================================
// AUTHENTICATION SCHEMAS
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  userRole: z.enum(['Student', 'Professional', 'Recruiter']).optional(),
});

export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const passwordResetSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ============================================
// USER SCHEMAS
// ============================================

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().max(200).optional(),
  linkedin: z.string().url().max(200).optional(),
  github: z.string().url().max(200).optional(),
  summary: z.string().max(1000).optional(),
  company: z.string().max(100).optional(),
  jobTitle: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  experience: z.enum(['entry', 'mid', 'senior', 'executive']).optional(),
});

export const updateUsernameSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores'),
});

export const updateMonthlyGoalSchema = z.object({
  monthlyGoal: z.number().int().min(1).max(100),
});

// ============================================
// PRICING & PAYMENT SCHEMAS
// ============================================

const planKeySchema = z.enum([
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

export const createPaymentIntentSchema = z.object({
  planKey: planKeySchema,
  billingCycle: z.enum(['one-time', 'monthly', 'quarterly', 'yearly']).optional(),
  couponCode: z.string().optional(),
});

export const applyCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
  planKey: planKeySchema,
});

// ============================================
// CV & DOCUMENT SCHEMAS
// ============================================

export const createCVSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  templateId: z.string().optional(),
  cvData: z.any().optional(), // UnifiedCVDataStructure
  personalInfo: z.object({
    fullName: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().max(20).optional(),
    location: z.string().max(100).optional(),
    website: z.string().url().max(200).optional(),
    linkedin: z.string().url().max(200).optional(),
    github: z.string().url().max(200).optional(),
  }).optional(),
});

export const updateCVSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  templateId: z.string().optional(),
  cvData: z.any().optional(), // UnifiedCVDataStructure
  personalInfo: z.any().optional(), // Legacy format (backward compat)
  workExperience: z.array(z.any()).optional(), // Legacy format (backward compat)
  education: z.array(z.any()).optional(),
  skills: z.array(z.any()).optional(),
  certificates: z.array(z.any()).optional(), // Unified format
  certifications: z.array(z.any()).optional(), // Legacy format (backward compat)
  projects: z.array(z.any()).optional(),
  summary: z.string().optional(),
});

export const cvIdSchema = z.object({
  id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid CV ID format'),
});

// ============================================
// JOB & APPLICATION SCHEMAS
// ============================================

export const createJobSchema = z.object({
  title: z.string().min(1, 'Job title is required').max(200),
  company: z.string().min(1, 'Company name is required').max(200),
  location: z.string().max(100).optional(),
  jobUrl: z.string().url('Invalid URL').max(500).optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  salary: z.string().max(100).optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']).optional(),
  status: z.enum(['saved', 'applied', 'interviewing', 'offered', 'rejected']).optional(),
});

export const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(100).optional(),
  jobUrl: z.string().url().max(500).optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  salary: z.string().max(100).optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'freelance', 'internship']).optional(),
  status: z.enum(['saved', 'applied', 'interviewing', 'offered', 'rejected']).optional(),
  notes: z.string().optional(),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

export const updatePricingPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  price_monthly: z.number().min(0).optional(),
  price_quarterly: z.number().min(0).optional(),
  price_yearly: z.number().min(0).optional(),
  price_one_time: z.number().min(0).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  features: z.array(z.string()).optional(),
  isPopular: z.boolean().optional(),
  isBestValue: z.boolean().optional(),
});

export const createPromotionalOfferSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100),
  description: z.string().max(500).optional(),
  bannerText: z.string().max(100).optional(),
  discountType: z.enum(['percentage', 'fixed']),
  discountValue: z.number().min(0),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  applicablePlans: z.array(z.string()),
  isActive: z.boolean().default(true),
});

export const updateUserRoleSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'),
  role: z.enum(['user', 'admin']),
});

// Country Mapping Schemas
export const createCountryMappingSchema = z.object({
  countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
  regionId: z.string().min(1, 'Region ID is required'),
});

export const deleteCountryMappingSchema = z.object({
  countryCode: z.string().length(2, 'Country code must be 2 characters').toUpperCase(),
});

// Pricing Region Schemas
export const pricingPlansSchema = z.object({
  monthly: z.number().min(0, 'Monthly price must be non-negative'),
  quarterly: z.number().min(0, 'Quarterly price must be non-negative'),
  yearly: z.number().min(0, 'Yearly price must be non-negative'),
  lifetime: z.number().min(0, 'Lifetime price must be non-negative'),
});

export const createPriceRegionSchema = z.object({
  regionId: z.string().min(1, 'Region ID is required'),
  isDefault: z.boolean().optional().default(false),
  currency: z.string().length(3, 'Currency must be 3 characters'),
  currencySymbol: z.string().min(1, 'Currency symbol is required'),
  plans: pricingPlansSchema,
});

export const updatePriceRegionSchema = z.object({
  regionId: z.string().min(1, 'Region ID is required'),
  isDefault: z.boolean().optional(),
  currency: z.string().length(3, 'Currency must be 3 characters').optional(),
  currencySymbol: z.string().min(1, 'Currency symbol is required').optional(),
  plans: pricingPlansSchema.optional(),
});

export const deletePriceRegionSchema = z.object({
  regionId: z.string().min(1, 'Region ID is required'),
});

// ============================================
// NOTIFICATION SCHEMAS
// ============================================

export const createNotificationSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid user ID'),
  type: z.string().min(1),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  actionUrl: z.string().url().optional(),
});

export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  preferences: z.record(z.object({
    enabled: z.boolean(),
    channels: z.object({
      'in-app': z.boolean(),
      email: z.boolean(),
      push: z.boolean(),
    }),
  })).optional(),
});

// ============================================
// FEEDBACK SCHEMAS
// ============================================

export const createFeedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement', 'other']),
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000),
  rating: z.number().int().min(1).max(5).optional(),
  page: z.string().optional(),
});

// ============================================
// TYPE EXPORTS
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;
export type CreateCVInput = z.infer<typeof createCVSchema>;
export type UpdateCVInput = z.infer<typeof updateCVSchema>;
export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
