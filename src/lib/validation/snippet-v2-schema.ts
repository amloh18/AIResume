/**
 * Zod Validation Schemas for V2 Types
 */

import { z } from 'zod';

// ─── SNIPPET CONTENT SCHEMAS ─────────────────────────────

export const HeaderContentSchema = z.object({
  name: z.string(),
  label: z.string(),
  email: z.string(),
  phone: z.string(),
  url: z.string(),
  location: z.object({
    city: z.string(),
    region: z.string(),
    countryCode: z.string(),
    address: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  profiles: z.array(z.object({
    network: z.string(),
    username: z.string(),
    url: z.string(),
  })),
  image: z.string().optional(),
});

export const SummaryContentSchema = z.object({
  text: z.string(),
});

export const ExperienceContentSchema = z.object({
  company: z.string(),
  position: z.string(),
  url: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  current: z.boolean(),
  summary: z.string().optional(),
  highlights: z.array(z.string()),
});

export const EducationContentSchema = z.object({
  institution: z.string(),
  area: z.string(),
  studyType: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  score: z.string().optional(),
  url: z.string().optional(),
  courses: z.array(z.string()).optional(),
  description: z.string().optional(),
});

export const SkillsContentSchema = z.object({
  category: z.string(),
  skills: z.array(z.string()),
});

export const ProjectContentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  highlights: z.array(z.string()),
  keywords: z.array(z.string()),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  current: z.boolean().optional(),
});

export const CertificationContentSchema = z.object({
  name: z.string(),
  date: z.string(),
  issuer: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const PublicationContentSchema = z.object({
  name: z.string(),
  publisher: z.string(),
  releaseDate: z.string(),
  url: z.string().optional(),
  summary: z.string().optional(),
});

export const LanguageContentSchema = z.object({
  language: z.string(),
  fluency: z.string(),
});

export const AwardContentSchema = z.object({
  title: z.string(),
  date: z.string(),
  awarder: z.string(),
  summary: z.string().optional(),
});

export const VolunteerContentSchema = z.object({
  organization: z.string(),
  position: z.string(),
  url: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  current: z.boolean().optional(),
  summary: z.string().optional(),
  highlights: z.array(z.string()),
});

export const InterestContentSchema = z.object({
  name: z.string(),
  keywords: z.array(z.string()),
});

export const ReferenceContentSchema = z.object({
  name: z.string(),
  reference: z.string(),
});

export const SnippetContentSchema = z.union([
  HeaderContentSchema,
  SummaryContentSchema,
  ExperienceContentSchema,
  EducationContentSchema,
  SkillsContentSchema,
  ProjectContentSchema,
  CertificationContentSchema,
  PublicationContentSchema,
  LanguageContentSchema,
  AwardContentSchema,
  VolunteerContentSchema,
  InterestContentSchema,
  ReferenceContentSchema,
]);

// ─── SNIPPET METADATA & LINEAGE ──────────────────────────

export const SnippetMetadataSchema = z.object({
  industry: z.string().optional(),
  role: z.string().optional(),
  seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'executive']).optional(),
  tags: z.array(z.string()).optional(),
  source: z.enum(['user', 'library', 'ai-generated', 'imported']).optional(),
  importSource: z.enum(['linkedin', 'pdf', 'manual']).optional(),
});

export const FormatHintsSchema = z.object({
  emphasize: z.array(z.string()).optional(),
  metrics: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  hierarchy: z.enum(['primary', 'secondary', 'tertiary']).optional(),
});

export const SnippetEditSchema = z.object({
  timestamp: z.date(),
  field: z.string(),
  oldValue: z.string(),
  newValue: z.string(),
  source: z.enum(['user', 'ai']),
});

export const SnippetLineageSchema = z.object({
  parentSnippetId: z.string().optional(),
  derivedFrom: z.string().optional(),
  editHistory: z.array(SnippetEditSchema),
  isGlobal: z.boolean(),
  libraryVersion: z.number().optional(),
});

// ─── SNIPPET V2 ──────────────────────────────────────────

export const SnippetTypeSchema = z.enum([
  'header', 'summary', 'experience', 'education', 'skills',
  'project', 'certification', 'publication', 'language',
  'award', 'volunteer', 'interest', 'reference',
]);

export const SnippetV2Schema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  type: SnippetTypeSchema,
  content: SnippetContentSchema,
  metadata: SnippetMetadataSchema,
  formatHints: FormatHintsSchema,
  lineage: SnippetLineageSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ─── SLOT & TEMPLATE SCHEMAS ─────────────────────────────

export const SlotConstraintsSchema = z.object({
  allowedSnippetTypes: z.array(SnippetTypeSchema),
  maxContentLength: z.number().optional(),
  preferredFormat: z.enum(['bullets', 'paragraph', 'tags', 'grid']).optional(),
});

export const SlotDefinitionSchema = z.object({
  id: z.string(),
  type: z.enum([
    'header', 'summary', 'experience', 'education', 'skills',
    'projects', 'certifications', 'publications', 'languages',
    'awards', 'volunteer', 'interests', 'references', 'custom',
  ]),
  label: z.string(),
  required: z.boolean(),
  repeatable: z.boolean(),
  maxInstances: z.number().optional(),
  column: z.enum(['main', 'sidebar']),
  order: z.number(),
  constraints: SlotConstraintsSchema,
});

// ─── BINDING SCHEMAS ─────────────────────────────────────

export const SlotBindingSchema = z.object({
  slotId: z.string(),
  snippetId: z.string(),
  order: z.number(),
  visible: z.boolean(),
});

export const CVInstanceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(),
  title: z.string().min(1).max(100),
  templateId: z.string(),
  styleOverrides: z.any().optional(),
  slotBindings: z.array(SlotBindingSchema),
  status: z.enum(['draft', 'published', 'archived']),
  version: z.number(),
  schemaVersion: z.union([z.literal(1), z.literal(2)]),
  cvType: z.enum(['master', 'journey', 'standalone']),
  journeyId: z.string().optional(),
  metadata: z.object({
    isMaster: z.boolean(),
    lastModified: z.date(),
    createdFrom: z.string().optional(),
    createdVia: z.string().optional(),
    tags: z.array(z.string()),
    isPublic: z.boolean(),
    viewCount: z.number(),
    downloadCount: z.number(),
    atsScore: z.number().optional(),
    thumbnailUrl: z.string().optional(),
    starred: z.boolean(),
    cvType: z.enum(['master', 'journey', 'standalone']).optional(),
    atsScoreCap: z.number().optional(),
    parentMasterId: z.string().optional(),
    isUserMaster: z.boolean().optional(),
    fresherMode: z.boolean().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// ─── VALIDATION HELPERS ──────────────────────────────────

export function validateSnippetForSlot(
  snippetType: string,
  slotConstraints: { allowedSnippetTypes: string[] }
): boolean {
  return slotConstraints.allowedSnippetTypes.includes(snippetType);
}

export function validateBindings(
  bindings: z.infer<typeof SlotBindingSchema>[]
): string[] {
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const binding of bindings) {
    const key = `${binding.slotId}:${binding.snippetId}`;
    if (seen.has(key)) {
      errors.push(`Duplicate binding: slot=${binding.slotId}, snippet=${binding.snippetId}`);
    }
    seen.add(key);
  }

  return errors;
}
