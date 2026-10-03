import { TemplateDefinition, DEFAULT_THEME, ThemeConfig, LayoutType } from './template-definition';

const PRO_TEMPLATE: TemplateDefinition = {
  id: 'pro-1',
  name: 'Professional Pro',
  description: 'Clean, ATS-friendly two-column layout ideal for corporate roles',
  thumbnail: '/templates/Professional Pro.JPG',
  category: 'professional',
  tier: 'free',
  theme: {
    ...DEFAULT_THEME,
    fonts: {
      heading: 'Inter, system-ui, sans-serif',
      body: 'Inter, system-ui, sans-serif',
    },
    colors: {
      ...DEFAULT_THEME.colors,
      primary: '#1f2937',
      secondary: '#6b7280',
    },
  },
  layout: {
    type: 'two-column',
    sections: [
      { id: 'personal_header', column: 'main', order: 0 },
      { id: 'summary', column: 'main', order: 1 },
      { id: 'experience', column: 'main', order: 2 },
      { id: 'education', column: 'main', order: 3 },
      { id: 'skills', column: 'sidebar', order: 4 },
      { id: 'projects', column: 'main', order: 5 },
      { id: 'certificates', column: 'sidebar', order: 6 },
    ],
  },
  pageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  },
  compatibility: {
    convertFromLegacy: (data) => data,
  },
};

const CREATIVE_TEMPLATE: TemplateDefinition = {
  id: 'creative-1',
  name: 'Modern Creative',
  description: 'Bold design with accent colors for creative industries',
  thumbnail: '/templates/Designer Modern.JPG',
  category: 'creative',
  tier: 'free',
  theme: {
    ...DEFAULT_THEME,
    fonts: {
      heading: 'Poppins, sans-serif',
      body: 'Open Sans, sans-serif',
    },
    colors: {
      ...DEFAULT_THEME.colors,
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#a78bfa',
    },
  },
  layout: {
    type: 'sidebar-left',
    sections: [
      { id: 'personal_header', column: 'sidebar', order: 0 },
      { id: 'summary', column: 'main', order: 1 },
      { id: 'skills', column: 'sidebar', order: 2 },
      { id: 'experience', column: 'main', order: 3 },
      { id: 'education', column: 'main', order: 4 },
      { id: 'projects', column: 'main', order: 5 },
    ],
  },
  pageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
  },
  compatibility: {
    convertFromLegacy: (data) => data,
  },
};

const MINIMAL_TEMPLATE: TemplateDefinition = {
  id: 'minimal-1',
  name: 'Minimal Clean',
  description: 'Simple, elegant single-column layout with generous whitespace',
  thumbnail: '/templates/Minimal Professional.JPG',
  category: 'minimal',
  tier: 'free',
  theme: {
    ...DEFAULT_THEME,
    fonts: {
      heading: 'Georgia, serif',
      body: 'Georgia, serif',
    },
    colors: {
      ...DEFAULT_THEME.colors,
      primary: '#000000',
      secondary: '#666666',
    },
  },
  layout: {
    type: 'single-column',
    sections: [
      { id: 'personal_header', column: 'main', order: 0 },
      { id: 'summary', column: 'main', order: 1 },
      { id: 'experience', column: 'main', order: 2 },
      { id: 'education', column: 'main', order: 3 },
      { id: 'skills', column: 'main', order: 4 },
      { id: 'projects', column: 'main', order: 5 },
    ],
  },
  pageSettings: {
    format: 'Letter',
    orientation: 'portrait',
    margins: { top: '25mm', bottom: '25mm', left: '25mm', right: '25mm' },
  },
  compatibility: {
    convertFromLegacy: (data) => data,
  },
};

const ACADEMIC_TEMPLATE: TemplateDefinition = {
  id: 'academic-1',
  name: 'Academic Scholar',
  description: 'Traditional format optimized for academic and research positions',
  thumbnail: '/templates/Elegant Timeline.JPG',
  category: 'academic',
  tier: 'free',
  theme: {
    ...DEFAULT_THEME,
    fonts: {
      heading: 'Times New Roman, serif',
      body: 'Times New Roman, serif',
    },
    colors: {
      ...DEFAULT_THEME.colors,
      primary: '#1a1a1a',
      secondary: '#404040',
    },
  },
  layout: {
    type: 'single-column',
    sections: [
      { id: 'personal_header', column: 'main', order: 0 },
      { id: 'summary', column: 'main', order: 1 },
      { id: 'education', column: 'main', order: 2 },
      { id: 'experience', column: 'main', order: 3 },
      { id: 'publications', column: 'main', order: 4 },
      { id: 'awards', column: 'main', order: 5 },
      { id: 'skills', column: 'main', order: 6 },
    ],
  },
  pageSettings: {
    format: 'Letter',
    orientation: 'portrait',
    margins: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
  },
  compatibility: {
    convertFromLegacy: (data) => data,
  },
};

const EXECUTIVE_TEMPLATE: TemplateDefinition = {
  id: 'executive-1',
  name: 'Executive Premium',
  description: 'Sophisticated design for senior leadership and executive roles',
  thumbnail: '/templates/Executive Professional.JPG',
  category: 'professional',
  tier: 'premium',
  theme: {
    ...DEFAULT_THEME,
    fonts: {
      heading: 'Garamond, serif',
      body: 'Garamond, serif',
    },
    colors: {
      ...DEFAULT_THEME.colors,
      primary: '#0f172a',
      secondary: '#475569',
    },
  },
  layout: {
    type: 'sidebar-right',
    sections: [
      { id: 'personal_header', column: 'main', order: 0 },
      { id: 'summary', column: 'main', order: 1 },
      { id: 'experience', column: 'main', order: 2 },
      { id: 'education', column: 'main', order: 3 },
      { id: 'skills', column: 'sidebar', order: 4 },
      { id: 'certificates', column: 'sidebar', order: 5 },
      { id: 'awards', column: 'main', order: 6 },
    ],
  },
  pageSettings: {
    format: 'A4',
    orientation: 'portrait',
    margins: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' },
  },
  compatibility: {
    convertFromLegacy: (data) => data,
  },
};

export const TEMPLATE_REGISTRY: TemplateDefinition[] = [
  PRO_TEMPLATE,
  CREATIVE_TEMPLATE,
  MINIMAL_TEMPLATE,
  ACADEMIC_TEMPLATE,
  EXECUTIVE_TEMPLATE,
];

export const getTemplatesByCategory = (category: string): TemplateDefinition[] => {
  return TEMPLATE_REGISTRY.filter(t => t.category === category);
};

export const getTemplatesByTier = (tier: string): TemplateDefinition[] => {
  return TEMPLATE_REGISTRY.filter(t => t.tier === tier);
};

export const getTemplateById = (id: string): TemplateDefinition | undefined => {
  return TEMPLATE_REGISTRY.find(t => t.id === id);
};

export {
  PRO_TEMPLATE,
  CREATIVE_TEMPLATE,
  MINIMAL_TEMPLATE,
  ACADEMIC_TEMPLATE,
  EXECUTIVE_TEMPLATE,
};