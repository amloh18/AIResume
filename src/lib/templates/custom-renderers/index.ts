// Custom Template Renderers
// These are hardcoded templates with 100% accurate mapping to specific CV designs

export { DataDrivenProTemplate } from './DataDrivenProTemplate';
export { DesignerModernTemplate } from './DesignerModernTemplate';
export { TechProBlueTemplate } from './TechProBlueTemplate';
export { ExecutiveProfessionalLayoutTemplate } from './ExecutiveProfessionalLayoutTemplate';
export { ExecutiveStandardTemplate } from './ExecutiveStandardTemplate';
export { ElegantTimelineTemplate } from './ElegantTimelineTemplate';
export { TheModernCVTemplate } from './TheModernCVTemplate';

// Template mapping for easy reference
export const CUSTOM_TEMPLATES = {
  'data-driven-pro': 'DataDrivenProTemplate',
  'designer-modern': 'DesignerModernTemplate',
  'tech-pro-blue': 'TechProBlueTemplate',
  'executive-professional-layout': 'ExecutiveProfessionalLayoutTemplate',
  'executive-standard': 'ExecutiveStandardTemplate',
  'elegant-timeline': 'ElegantTimelineTemplate',
  'the-modern-cv': 'TheModernCVTemplate'
} as const;

export type CustomTemplateKey = keyof typeof CUSTOM_TEMPLATES;
