/**
 * Slot-Based Template Definitions (TemplateV2)
 *
 * Converts existing templates into slot-based architecture.
 * Each template defines WHERE content goes, not the content itself.
 */

import type { TemplateV2, SlotDefinition, StylePreset } from '@/types/template-v2';
import { PROFESSIONAL_CLASSIC_PRESET, MODERN_MINIMAL_PRESET, CREATIVE_BOLD_PRESET, ACADEMIC_FORMAL_PRESET } from './style-presets';

// ─── COMMON SLOT TEMPLATES ───────────────────────────────

function headerSlot(order: number = 0): SlotDefinition {
  return {
    id: 'header',
    type: 'header',
    label: 'Personal Information',
    required: true,
    repeatable: false,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['header'] },
  };
}

function summarySlot(order: number = 1): SlotDefinition {
  return {
    id: 'summary',
    type: 'summary',
    label: 'Professional Summary',
    required: false,
    repeatable: false,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['summary'], preferredFormat: 'paragraph' },
  };
}

function experienceSlot(order: number = 2): SlotDefinition {
  return {
    id: 'experience',
    type: 'experience',
    label: 'Work Experience',
    required: false,
    repeatable: true,
    maxInstances: 10,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['experience'], preferredFormat: 'bullets' },
  };
}

function educationSlot(order: number = 3): SlotDefinition {
  return {
    id: 'education',
    type: 'education',
    label: 'Education',
    required: false,
    repeatable: true,
    maxInstances: 5,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['education'] },
  };
}

function skillsSlot(order: number = 4): SlotDefinition {
  return {
    id: 'skills',
    type: 'skills',
    label: 'Skills',
    required: false,
    repeatable: true,
    maxInstances: 8,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['skills'], preferredFormat: 'tags' },
  };
}

function projectsSlot(order: number = 5): SlotDefinition {
  return {
    id: 'projects',
    type: 'projects',
    label: 'Projects',
    required: false,
    repeatable: true,
    maxInstances: 5,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['project'], preferredFormat: 'bullets' },
  };
}

function certificationsSlot(order: number = 6): SlotDefinition {
  return {
    id: 'certifications',
    type: 'certifications',
    label: 'Certifications',
    required: false,
    repeatable: true,
    maxInstances: 10,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['certification'] },
  };
}

function publicationsSlot(order: number = 7): SlotDefinition {
  return {
    id: 'publications',
    type: 'publications',
    label: 'Publications',
    required: false,
    repeatable: true,
    maxInstances: 10,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['publication'] },
  };
}

function languagesSlot(order: number = 8): SlotDefinition {
  return {
    id: 'languages',
    type: 'languages',
    label: 'Languages',
    required: false,
    repeatable: true,
    maxInstances: 10,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['language'] },
  };
}

function awardsSlot(order: number = 9): SlotDefinition {
  return {
    id: 'awards',
    type: 'awards',
    label: 'Awards',
    required: false,
    repeatable: true,
    maxInstances: 10,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['award'] },
  };
}

function volunteerSlot(order: number = 10): SlotDefinition {
  return {
    id: 'volunteer',
    type: 'volunteer',
    label: 'Volunteer Experience',
    required: false,
    repeatable: true,
    maxInstances: 5,
    column: 'main',
    order,
    constraints: { allowedSnippetTypes: ['volunteer'], preferredFormat: 'bullets' },
  };
}

// ─── TEMPLATE DEFINITIONS ────────────────────────────────

export const PROFESSIONAL_EXTENDED_V2: TemplateV2 = {
  id: 'professional-extended-v2',
  name: 'Professional Extended',
  description: 'Clean, professional layout with comprehensive sections',
  thumbnail: '/templates/professional-extended.png',
  category: 'professional',
  tier: 'free',
  slots: [
    headerSlot(0),
    summarySlot(1),
    experienceSlot(2),
    educationSlot(3),
    skillsSlot(4),
    projectsSlot(5),
    certificationsSlot(6),
    languagesSlot(7),
  ],
  layout: {
    type: 'single-column',
    columns: [{ id: 'main', width: '100%', slots: ['header', 'summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'] }],
  },
  stylePreset: PROFESSIONAL_CLASSIC_PRESET,
  pageSettings: { format: 'A4', orientation: 'portrait', margins: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' } },
  version: 2,
  compatibleSnippetTypes: ['header', 'summary', 'experience', 'education', 'skills', 'project', 'certification', 'language'],
};

export const MODERN_MINIMAL_V2: TemplateV2 = {
  id: 'modern-minimal-v2',
  name: 'Modern Minimal',
  description: 'Minimalist design with focus on content',
  thumbnail: '/templates/modern-minimal.png',
  category: 'minimal',
  tier: 'free',
  slots: [
    headerSlot(0),
    summarySlot(1),
    experienceSlot(2),
    educationSlot(3),
    skillsSlot(4),
  ],
  layout: {
    type: 'single-column',
    columns: [{ id: 'main', width: '100%', slots: ['header', 'summary', 'experience', 'education', 'skills'] }],
  },
  stylePreset: MODERN_MINIMAL_PRESET,
  pageSettings: { format: 'A4', orientation: 'portrait', margins: { top: '15mm', right: '20mm', bottom: '15mm', left: '20mm' } },
  version: 2,
  compatibleSnippetTypes: ['header', 'summary', 'experience', 'education', 'skills'],
};

export const TWO_COLUMN_SIDEBAR_V2: TemplateV2 = {
  id: 'two-column-sidebar-v2',
  name: 'Two Column Sidebar',
  description: 'Sidebar layout with contact and skills in sidebar',
  thumbnail: '/templates/two-column-sidebar.png',
  category: 'professional',
  tier: 'free',
  slots: [
    { ...headerSlot(0), column: 'sidebar' },
    { ...skillsSlot(1), column: 'sidebar' },
    { ...languagesSlot(2), column: 'sidebar' },
    { ...certificationsSlot(3), column: 'sidebar' },
    summarySlot(4),
    experienceSlot(5),
    educationSlot(6),
    projectsSlot(7),
  ],
  layout: {
    type: 'sidebar-left',
    columns: [
      { id: 'sidebar', width: '30%', slots: ['header', 'skills', 'languages', 'certifications'] },
      { id: 'main', width: '70%', slots: ['summary', 'experience', 'education', 'projects'] },
    ],
  },
  stylePreset: { ...PROFESSIONAL_CLASSIC_PRESET, id: 'two-column-classic', name: 'Two Column Classic' },
  pageSettings: { format: 'A4', orientation: 'portrait', margins: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' } },
  version: 2,
  compatibleSnippetTypes: ['header', 'summary', 'experience', 'education', 'skills', 'project', 'certification', 'language'],
};

export const CREATIVE_BOLD_V2: TemplateV2 = {
  id: 'creative-bold-v2',
  name: 'Creative Bold',
  description: 'Bold design for creative roles',
  thumbnail: '/templates/creative-bold.png',
  category: 'creative',
  tier: 'premium',
  slots: [
    headerSlot(0),
    summarySlot(1),
    experienceSlot(2),
    projectsSlot(3),
    skillsSlot(4),
    educationSlot(5),
  ],
  layout: {
    type: 'single-column',
    columns: [{ id: 'main', width: '100%', slots: ['header', 'summary', 'experience', 'projects', 'skills', 'education'] }],
  },
  stylePreset: CREATIVE_BOLD_PRESET,
  pageSettings: { format: 'A4', orientation: 'portrait', margins: { top: '20mm', right: '25mm', bottom: '20mm', left: '25mm' } },
  version: 2,
  compatibleSnippetTypes: ['header', 'summary', 'experience', 'education', 'skills', 'project'],
};

export const ACADEMIC_CV_V2: TemplateV2 = {
  id: 'academic-cv-v2',
  name: 'Academic CV',
  description: 'Structured for academic and research positions',
  thumbnail: '/templates/academic-cv.png',
  category: 'academic',
  tier: 'free',
  slots: [
    headerSlot(0),
    summarySlot(1),
    educationSlot(2),
    experienceSlot(3),
    publicationsSlot(4),
    certificationsSlot(5),
    awardsSlot(6),
    skillsSlot(7),
    volunteerSlot(8),
  ],
  layout: {
    type: 'single-column',
    columns: [{ id: 'main', width: '100%', slots: ['header', 'summary', 'education', 'experience', 'publications', 'certifications', 'awards', 'skills', 'volunteer'] }],
  },
  stylePreset: ACADEMIC_FORMAL_PRESET,
  pageSettings: { format: 'A4', orientation: 'portrait', margins: { top: '20mm', right: '25mm', bottom: '20mm', left: '25mm' } },
  version: 2,
  compatibleSnippetTypes: ['header', 'summary', 'experience', 'education', 'skills', 'certification', 'publication', 'award', 'volunteer'],
};

// ─── ALL TEMPLATES ───────────────────────────────────────

export const ALL_TEMPLATE_V2: TemplateV2[] = [
  PROFESSIONAL_EXTENDED_V2,
  MODERN_MINIMAL_V2,
  TWO_COLUMN_SIDEBAR_V2,
  CREATIVE_BOLD_V2,
  ACADEMIC_CV_V2,
];
