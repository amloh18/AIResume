/**
 * SNIPPET V2 — Atomic Reusable Content Blocks
 *
 * Snippets are PORTABLE across templates.
 * Editing creates a DERIVED COPY (never mutates original).
 * Snippets store FORMAT HINTS, not fixed styles.
 */

// ─── SNIPPET TYPES ───────────────────────────────────────

export type SnippetType =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'project'
  | 'certification'
  | 'publication'
  | 'language'
  | 'award'
  | 'volunteer'
  | 'interest'
  | 'reference';

// ─── CONTENT (Discriminated Union) ───────────────────────

export interface HeaderContent {
  name: string;
  label: string;
  email: string;
  phone: string;
  url: string;
  location: {
    city: string;
    region: string;
    countryCode: string;
    address?: string;
    postalCode?: string;
  };
  profiles: Array<{
    network: string;
    username: string;
    url: string;
  }>;
  image?: string;
}

export interface SummaryContent {
  text: string;
}

export interface ExperienceContent {
  company: string;
  position: string;
  url?: string;
  startDate: string;
  endDate: string;
  current: boolean;
  summary?: string;
  highlights: string[];
}

export interface EducationContent {
  institution: string;
  area: string;
  studyType: string;
  startDate: string;
  endDate: string;
  score?: string;
  url?: string;
  courses?: string[];
  description?: string;
}

export interface SkillsContent {
  category: string;
  skills: string[];
}

export interface ProjectContent {
  name: string;
  description?: string;
  highlights: string[];
  keywords: string[];
  startDate?: string;
  endDate?: string;
  url?: string;
  current?: boolean;
}

export interface CertificationContent {
  name: string;
  date: string;
  issuer: string;
  url?: string;
  description?: string;
}

export interface PublicationContent {
  name: string;
  publisher: string;
  releaseDate: string;
  url?: string;
  summary?: string;
}

export interface LanguageContent {
  language: string;
  fluency: string;
}

export interface AwardContent {
  title: string;
  date: string;
  awarder: string;
  summary?: string;
}

export interface VolunteerContent {
  organization: string;
  position: string;
  url?: string;
  startDate: string;
  endDate: string;
  current?: boolean;
  summary?: string;
  highlights: string[];
}

export interface InterestContent {
  name: string;
  keywords: string[];
}

export interface ReferenceContent {
  name: string;
  reference: string;
}

export type SnippetContent =
  | HeaderContent
  | SummaryContent
  | ExperienceContent
  | EducationContent
  | SkillsContent
  | ProjectContent
  | CertificationContent
  | PublicationContent
  | LanguageContent
  | AwardContent
  | VolunteerContent
  | InterestContent
  | ReferenceContent;

// ─── METADATA ────────────────────────────────────────────

export interface SnippetMetadata {
  industry?: string;
  role?: string;
  seniority?: 'junior' | 'mid' | 'senior' | 'lead' | 'executive';
  tags?: string[];
  source?: 'user' | 'library' | 'ai-generated' | 'imported';
  importSource?: 'linkedin' | 'pdf' | 'manual';
}

// ─── FORMAT HINTS ────────────────────────────────────────

export interface FormatHints {
  emphasize?: string[];
  metrics?: string[];
  keywords?: string[];
  hierarchy?: 'primary' | 'secondary' | 'tertiary';
}

// ─── LINEAGE ─────────────────────────────────────────────

export interface SnippetEdit {
  timestamp: Date;
  field: string;
  oldValue: string;
  newValue: string;
  source: 'user' | 'ai';
}

export interface SnippetLineage {
  parentSnippetId?: string;
  derivedFrom?: string;
  editHistory: SnippetEdit[];
  isGlobal: boolean;
  libraryVersion?: number;
}

// ─── SNIPPET V2 ──────────────────────────────────────────

export interface SnippetV2 {
  id: string;
  userId: string;
  type: SnippetType;
  content: SnippetContent;
  metadata: SnippetMetadata;
  formatHints: FormatHints;
  lineage: SnippetLineage;
  createdAt: Date;
  updatedAt: Date;
}

// ─── HELPERS ─────────────────────────────────────────────

export const SNIPPET_TYPE_TO_CONTENT_KEY: Record<SnippetType, string> = {
  header: 'basics',
  summary: 'summary',
  experience: 'work',
  education: 'education',
  skills: 'skills',
  project: 'projects',
  certification: 'certificates',
  publication: 'publications',
  language: 'languages',
  award: 'awards',
  volunteer: 'volunteer',
  interest: 'interests',
  reference: 'references',
};

export const CONTENT_KEY_TO_SNIPPET_TYPE: Record<string, SnippetType> = {
  basics: 'header',
  summary: 'summary',
  work: 'experience',
  experience: 'experience',
  education: 'education',
  skills: 'skills',
  projects: 'project',
  certificates: 'certification',
  publications: 'publication',
  languages: 'language',
  awards: 'award',
  volunteer: 'volunteer',
  interests: 'interest',
  references: 'reference',
};
