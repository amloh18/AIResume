import type React from 'react';

/**
 * Type definitions for the WYSIWYG snippet canvas editor.
 * 
 * The canvas editor uses a snippet-based architecture where each CV section
 * is rendered by a "snippet" -- a configurable render variant. Zones hold
 * snippets, and layouts arrange zones on the page.
 */

// ---------------------------------------------------------------------------
// Snippet Data Model (internal to the canvas editor)
// ---------------------------------------------------------------------------

export interface SnippetBasics {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  avatar: string;
  showAvatar: boolean;
}

export interface SnippetExperienceEntry {
  id: string;
  company: string;
  role: string;
  date: string;
  description: string;
}

export interface SnippetEducationEntry {
  id: string;
  institution: string;
  degree: string;
  date: string;
  description: string;
}

export interface SnippetProjectEntry {
  id: string;
  name: string;
  role: string;
  date: string;
  description: string;
}

export interface SnippetCertificationEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface SnippetSkills {
  languages: string;
  frameworks: string;
  tools: string;
}

export interface SnippetSectionTitles {
  summary: string;
  experience: string;
  education: string;
  skills: string;
  projects: string;
  certifications: string;
  languages: string;
  volunteer: string;
  awards: string;
  publications: string;
  interests: string;
  references: string;
  [key: string]: string;
}

/** The flat data model used internally by the snippet canvas editor. */
export interface SnippetData {
  basics: SnippetBasics;
  experience: SnippetExperienceEntry[];
  education: SnippetEducationEntry[];
  projects: SnippetProjectEntry[];
  certifications: SnippetCertificationEntry[];
  skills: SnippetSkills;
  sectionTitles: SnippetSectionTitles;
}

// ---------------------------------------------------------------------------
// Snippet Registry
// ---------------------------------------------------------------------------

export type SnippetCategoryId =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'volunteer'
  | 'awards'
  | 'publications'
  | 'interests'
  | 'references'
  | 'contact';

export interface SnippetVariant {
  id: string;
  category: SnippetCategoryId;
  name: string;
  description?: string;
  /** Render function receives the snippet data + style vars and returns JSX */
  render: (props: SnippetRenderProps) => React.ReactNode;
}

export interface SnippetRenderProps {
  data: SnippetData;
  designVars: DesignVars;
  isEditing: boolean;
  onFieldChange: (path: string, value: string) => void;
  highlightedField?: string | null;
  fixAnnotations?: any[];
  onAnnotationClick?: (fixId: string) => void;
}

// ---------------------------------------------------------------------------
// Zone & Layout State
// ---------------------------------------------------------------------------

export interface ZoneSnippet {
  instanceId: string;
  snippetId: string;
  category: SnippetCategoryId;
}

export interface Zone {
  id: string;
  label: string;
  snippets: ZoneSnippet[];
}

export type LayoutType =
  | '1-col'
  | '2-col'
  | 'sidebar-left'
  | 'sidebar-right'
  | 'dark-sidebar-left'
  | 'dark-sidebar-right'
  | 'top-sidebar'
  | 'hybrid-split'
  | 'modern-split';

export interface CanvasTemplate {
  id: string;
  name: string;
  category: string;
  layout: LayoutType;
  zones: Zone[];
  accentColor: string;
  thumbnail?: string;
}

// ---------------------------------------------------------------------------
// Design Variables (CSS custom properties)
// ---------------------------------------------------------------------------

export interface DesignVars {
  fontFamily: string;
  fontSize: number;         // base body font size in pt
  lineSpacing: number;      // line-height multiplier
  pageMargin: number;       // mm
  accentColor: string;
  headerFontSize: number;   // pt
  sectionFontSize: number;  // pt
}

export const DEFAULT_DESIGN_VARS: DesignVars = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 10,
  lineSpacing: 1.4,
  pageMargin: 20,
  accentColor: '#2563eb',
  headerFontSize: 24,
  sectionFontSize: 13,
};

// ---------------------------------------------------------------------------
// Drag State
// ---------------------------------------------------------------------------

export interface DragState {
  isDragging: boolean;
  dragType: 'snippet' | 'entry' | null;
  dragSourceZoneId: string | null;
  dragSourceIndex: number | null;
  dragOverZoneId: string | null;
  dragOverIndex: number | null;
}

export const INITIAL_DRAG_STATE: DragState = {
  isDragging: false,
  dragType: null,
  dragSourceZoneId: null,
  dragSourceIndex: null,
  dragOverZoneId: null,
  dragOverIndex: null,
};

// ---------------------------------------------------------------------------
// Template Categories
// ---------------------------------------------------------------------------

export const TEMPLATE_CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'professional', label: 'Professional' },
  { id: 'creative', label: 'Creative' },
  { id: 'modern', label: 'Modern' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'academic', label: 'Academic' },
] as const;

// ---------------------------------------------------------------------------
// Default Section Titles
// ---------------------------------------------------------------------------

export const DEFAULT_SECTION_TITLES: SnippetSectionTitles = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  projects: 'Projects',
  certifications: 'Certifications',
  languages: 'Languages',
  volunteer: 'Volunteer Experience',
  awards: 'Awards & Recognition',
  publications: 'Publications',
  interests: 'Interests',
  references: 'References',
};
