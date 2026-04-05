/**
 * TEMPLATE V2 — Slot-Based Architecture
 *
 * Templates define WHERE content goes (slots), NOT the content itself.
 * Content is bound via SlotBinding in CVInstance.
 * Style is defined via StylePreset, overridable per-CV.
 */

import { SnippetType } from './snippet-v2';

// ─── SLOT TYPES ──────────────────────────────────────────

export type SlotType =
  | 'header'
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'publications'
  | 'languages'
  | 'awards'
  | 'volunteer'
  | 'interests'
  | 'references'
  | 'custom';

export interface SlotConstraints {
  allowedSnippetTypes: SnippetType[];
  maxContentLength?: number;
  preferredFormat?: 'bullets' | 'paragraph' | 'tags' | 'grid';
}

export interface SlotDefinition {
  id: string;
  type: SlotType;
  label: string;
  required: boolean;
  repeatable: boolean;
  maxInstances?: number;
  column: 'main' | 'sidebar';
  order: number;
  constraints: SlotConstraints;
}

// ─── LAYOUT ──────────────────────────────────────────────

export type LayoutType = 'single-column' | 'two-column' | 'sidebar-left' | 'sidebar-right';

export interface ColumnDefinition {
  id: 'main' | 'sidebar';
  width: string;
  slots: string[];
}

export interface LayoutConfig {
  type: LayoutType;
  columns: ColumnDefinition[];
}

// ─── STYLE PRESET ────────────────────────────────────────

export interface TypeSpec {
  fontSize: string;
  fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'italic' | 'normal';
  textTransform?: 'uppercase' | 'none' | 'capitalize';
  letterSpacing?: string;
  lineHeight: string;
}

export interface TypographyScale {
  sectionHeading: TypeSpec;
  jobTitle: TypeSpec;
  companyDate: TypeSpec;
  bodyText: TypeSpec;
  contactInfo: TypeSpec;
  skillTag: TypeSpec;
}

export interface SpacingScale {
  sectionGap: string;
  itemGap: string;
  bulletGap: string;
  paragraphGap: string;
  headerPadding: string;
  ratio: number;
}

export interface ColorPalette {
  primary: string;
  secondary: string;
  text: string;
  heading: string;
  muted: string;
  background: string;
  accent: string;
}

export interface LayoutStyle {
  sectionTitleDecoration: 'bordered' | 'minimal' | 'accent-bar' | 'spaced';
  contactDisplay: 'inline-bar' | 'stacked' | 'minimal';
  showContactIcons: boolean;
  dateFormat: 'MMM_YYYY' | 'MM_YYYY' | 'FULL_MONTH' | 'ISO';
  twoThirdsRule: boolean;
  verticalRhythm: boolean;
}

export interface BulletStyle {
  character: string;
  indent: string;
  maxWidth?: string;
  orphanPrevention: boolean;
}

export interface StylePreset {
  id: string;
  name: string;
  typography: TypographyScale;
  spacing: SpacingScale;
  colors: ColorPalette;
  layout: LayoutStyle;
  bullets: BulletStyle;
}

// ─── PAGE SETTINGS ───────────────────────────────────────

export interface PageSettings {
  format: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  margins: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
}

// ─── TEMPLATE V2 ─────────────────────────────────────────

export interface TemplateV2 {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'professional' | 'creative' | 'minimal' | 'academic';
  tier: 'free' | 'premium';
  slots: SlotDefinition[];
  layout: LayoutConfig;
  stylePreset: StylePreset;
  pageSettings: PageSettings;
  version: number;
  compatibleSnippetTypes: SnippetType[];
}
