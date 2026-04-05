/**
 * Style Presets for TemplateV2
 *
 * Each preset defines typography, spacing, colors, layout, and bullet styles.
 * Templates reference these presets; CVs can override individual values.
 */

import type { StylePreset } from '@/types/template-v2';

export const PROFESSIONAL_CLASSIC_PRESET: StylePreset = {
  id: 'professional-classic',
  name: 'Professional Classic',
  typography: {
    sectionHeading: { fontSize: '13pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.4' },
    jobTitle: { fontSize: '11pt', fontWeight: 'bold', lineHeight: '1.4' },
    companyDate: { fontSize: '10pt', fontWeight: 'medium', fontStyle: 'italic', lineHeight: '1.3' },
    bodyText: { fontSize: '10pt', fontWeight: 'normal', lineHeight: '1.5' },
    contactInfo: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.4' },
    skillTag: { fontSize: '9pt', fontWeight: 'medium', lineHeight: '1.3' },
  },
  spacing: {
    sectionGap: '16px',
    itemGap: '8px',
    bulletGap: '4px',
    paragraphGap: '8px',
    headerPadding: '12px',
    ratio: 2.0,
  },
  colors: {
    primary: '#1a1a1a',
    secondary: '#4a4a4a',
    text: '#333333',
    heading: '#1a1a1a',
    muted: '#666666',
    background: '#ffffff',
    accent: '#2563eb',
  },
  layout: {
    sectionTitleDecoration: 'bordered',
    contactDisplay: 'inline-bar',
    showContactIcons: true,
    dateFormat: 'MMM_YYYY',
    twoThirdsRule: true,
    verticalRhythm: true,
  },
  bullets: {
    character: '•',
    indent: '16px',
    maxWidth: '75%',
    orphanPrevention: true,
  },
};

export const MODERN_MINIMAL_PRESET: StylePreset = {
  id: 'modern-minimal',
  name: 'Modern Minimal',
  typography: {
    sectionHeading: { fontSize: '12pt', fontWeight: 'semibold', textTransform: 'uppercase', letterSpacing: '1px', lineHeight: '1.3' },
    jobTitle: { fontSize: '11pt', fontWeight: 'semibold', lineHeight: '1.4' },
    companyDate: { fontSize: '10pt', fontWeight: 'normal', lineHeight: '1.3' },
    bodyText: { fontSize: '10pt', fontWeight: 'normal', lineHeight: '1.5' },
    contactInfo: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.4' },
    skillTag: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.3' },
  },
  spacing: {
    sectionGap: '20px',
    itemGap: '10px',
    bulletGap: '4px',
    paragraphGap: '10px',
    headerPadding: '16px',
    ratio: 2.0,
  },
  colors: {
    primary: '#111827',
    secondary: '#374151',
    text: '#1f2937',
    heading: '#111827',
    muted: '#6b7280',
    background: '#ffffff',
    accent: '#059669',
  },
  layout: {
    sectionTitleDecoration: 'minimal',
    contactDisplay: 'stacked',
    showContactIcons: false,
    dateFormat: 'MMM_YYYY',
    twoThirdsRule: false,
    verticalRhythm: true,
  },
  bullets: {
    character: '▸',
    indent: '14px',
    orphanPrevention: true,
  },
};

export const CREATIVE_BOLD_PRESET: StylePreset = {
  id: 'creative-bold',
  name: 'Creative Bold',
  typography: {
    sectionHeading: { fontSize: '14pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px', lineHeight: '1.3' },
    jobTitle: { fontSize: '11pt', fontWeight: 'bold', lineHeight: '1.4' },
    companyDate: { fontSize: '10pt', fontWeight: 'medium', lineHeight: '1.3' },
    bodyText: { fontSize: '10pt', fontWeight: 'normal', lineHeight: '1.5' },
    contactInfo: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.4' },
    skillTag: { fontSize: '9pt', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.3' },
  },
  spacing: {
    sectionGap: '24px',
    itemGap: '12px',
    bulletGap: '6px',
    paragraphGap: '12px',
    headerPadding: '20px',
    ratio: 2.0,
  },
  colors: {
    primary: '#dc2626',
    secondary: '#7c3aed',
    text: '#1f2937',
    heading: '#dc2626',
    muted: '#9ca3af',
    background: '#ffffff',
    accent: '#dc2626',
  },
  layout: {
    sectionTitleDecoration: 'accent-bar',
    contactDisplay: 'inline-bar',
    showContactIcons: true,
    dateFormat: 'FULL_MONTH',
    twoThirdsRule: true,
    verticalRhythm: true,
  },
  bullets: {
    character: '→',
    indent: '18px',
    maxWidth: '80%',
    orphanPrevention: true,
  },
};

export const ACADEMIC_FORMAL_PRESET: StylePreset = {
  id: 'academic-formal',
  name: 'Academic Formal',
  typography: {
    sectionHeading: { fontSize: '12pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.4' },
    jobTitle: { fontSize: '10pt', fontWeight: 'bold', lineHeight: '1.4' },
    companyDate: { fontSize: '10pt', fontWeight: 'normal', fontStyle: 'italic', lineHeight: '1.3' },
    bodyText: { fontSize: '10pt', fontWeight: 'normal', lineHeight: '1.6' },
    contactInfo: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.4' },
    skillTag: { fontSize: '9pt', fontWeight: 'normal', lineHeight: '1.3' },
  },
  spacing: {
    sectionGap: '14px',
    itemGap: '6px',
    bulletGap: '3px',
    paragraphGap: '6px',
    headerPadding: '10px',
    ratio: 2.3,
  },
  colors: {
    primary: '#1e293b',
    secondary: '#334155',
    text: '#334155',
    heading: '#0f172a',
    muted: '#64748b',
    background: '#ffffff',
    accent: '#0369a1',
  },
  layout: {
    sectionTitleDecoration: 'bordered',
    contactDisplay: 'stacked',
    showContactIcons: false,
    dateFormat: 'MMM_YYYY',
    twoThirdsRule: false,
    verticalRhythm: true,
  },
  bullets: {
    character: '•',
    indent: '14px',
    orphanPrevention: true,
  },
};

export const ALL_STYLE_PRESETS: StylePreset[] = [
  PROFESSIONAL_CLASSIC_PRESET,
  MODERN_MINIMAL_PRESET,
  CREATIVE_BOLD_PRESET,
  ACADEMIC_FORMAL_PRESET,
];
