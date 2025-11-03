import { z } from 'zod';

/**
 * CV Data Validation Schemas
 * 
 * Provides Zod schemas for validating CV data throughout the application.
 * Ensures data integrity and prevents invalid data from entering the system.
 */

// Basic information schema
export const CVBasicsSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name cannot exceed 100 characters'),
  label: z.string().max(100).optional(),
  image: z.string().url().optional().or(z.literal('')),
  email: z.string().email('Invalid email address').or(z.literal('')),
  phone: z.string().max(20).optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  summary: z.string().max(2000, 'Summary cannot exceed 2000 characters').optional().or(z.literal('')),
  location: z.object({
    address: z.string().max(200).optional().or(z.literal('')),
    postalCode: z.string().max(20).optional().or(z.literal('')),
    city: z.string().max(100).optional().or(z.literal('')),
    countryCode: z.string().max(10).optional().or(z.literal('')),
    region: z.string().max(100).optional().or(z.literal('')),
  }).optional(),
  profiles: z.array(z.object({
    network: z.string().max(50),
    username: z.string().max(100),
    url: z.string().url(),
  })).optional(),
});

// Work experience schema
export const WorkExperienceSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(200),
  position: z.string().min(1, 'Position is required').max(200),
  url: z.string().url().optional().or(z.literal('')),
  startDate: z.string(),
  endDate: z.string().optional().or(z.literal('')),
  summary: z.string().max(2000).optional().or(z.literal('')),
  highlights: z.array(z.string().max(500)).optional(),
});

// Education schema
export const EducationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(200),
  url: z.string().url().optional().or(z.literal('')),
  area: z.string().max(200).optional().or(z.literal('')),
  studyType: z.string().max(100).optional().or(z.literal('')),
  startDate: z.string(),
  endDate: z.string().optional().or(z.literal('')),
  score: z.string().max(50).optional().or(z.literal('')),
  courses: z.array(z.string().max(200)).optional(),
  description: z.string().max(1000).optional().or(z.literal('')),
});

// Skills schema
export const SkillSchema = z.object({
  category: z.string().max(100),
  skills: z.array(z.string().max(100)),
});

// Project schema
export const ProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  startDate: z.string().optional().or(z.literal('')),
  endDate: z.string().optional().or(z.literal('')),
  description: z.string().max(2000).optional().or(z.literal('')),
  highlights: z.array(z.string().max(500)).optional(),
  url: z.string().url().optional().or(z.literal('')),
});

// Certificate schema
export const CertificateSchema = z.object({
  name: z.string().min(1, 'Certificate name is required').max(200),
  date: z.string().optional().or(z.literal('')),
  issuer: z.string().max(200).optional().or(z.literal('')),
  url: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
});

// Language schema
export const LanguageSchema = z.object({
  language: z.string().min(1, 'Language is required').max(100),
  fluency: z.string().max(100).optional().or(z.literal('')),
});

// Complete CV data structure schema
export const CVDataSchema = z.object({
  basics: CVBasicsSchema,
  work: z.array(WorkExperienceSchema).default([]),
  volunteer: z.array(z.any()).optional().default([]),
  education: z.array(EducationSchema).default([]),
  awards: z.array(z.any()).optional().default([]),
  certificates: z.array(CertificateSchema).default([]),
  publications: z.array(z.any()).optional().default([]),
  skills: z.array(SkillSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  interests: z.array(z.any()).optional().default([]),
  references: z.array(z.any()).optional().default([]),
  projects: z.array(ProjectSchema).default([]),
});

// CV metadata schema
export const CVMetadataSchema = z.object({
  isMaster: z.boolean().default(false),
  tags: z.array(z.string().max(50)).default([]),
  isPublic: z.boolean().default(false),
  starred: z.boolean().default(false),
  lastModified: z.date().optional(),
  createdFrom: z.string().optional(),
  viewCount: z.number().min(0).optional(),
  downloadCount: z.number().min(0).optional(),
  atsScore: z.number().min(0).max(100).optional(),
  atsScoreDate: z.date().optional(),
  thumbnailUrl: z.string().url().optional(),
  thumbnailGeneratedAt: z.date().optional(),
  aiAnalysis: z.any().optional(),
  createdVia: z.string().max(100).optional(),
});

// Complete CV schema
export const CVSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(1, 'CV title is required').max(100, 'Title cannot exceed 100 characters'),
  cvData: CVDataSchema,
  templateId: z.union([z.string(), z.any()]), // Allow string or ObjectId
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  metadata: CVMetadataSchema.optional(),
});

// CV creation request schema
export const CreateCVSchema = z.object({
  title: z.string().min(1).max(100),
  cvData: CVDataSchema.optional(),
  templateId: z.string().min(1, 'Template ID is required'),
  status: z.enum(['draft', 'published', 'archived']).optional().default('draft'),
  metadata: CVMetadataSchema.optional(),
});

// CV update request schema (all fields optional)
export const UpdateCVSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  cvData: CVDataSchema.optional(),
  templateId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  metadata: CVMetadataSchema.partial().optional(),
});

// Export validation functions
export function validateCVData(data: unknown) {
  return CVDataSchema.parse(data);
}

export function validateCreateCV(data: unknown) {
  return CreateCVSchema.parse(data);
}

export function validateUpdateCV(data: unknown) {
  return UpdateCVSchema.parse(data);
}

export function validateCVMetadata(data: unknown) {
  return CVMetadataSchema.parse(data);
}

// Safe parse versions (returns { success, data, error })
export function safeValidateCVData(data: unknown) {
  return CVDataSchema.safeParse(data);
}

export function safeValidateCreateCV(data: unknown) {
  return CreateCVSchema.safeParse(data);
}

export function safeValidateUpdateCV(data: unknown) {
  return UpdateCVSchema.safeParse(data);
}