// Custom Template Renderers
// These are hardcoded templates with 100% accurate mapping to specific CV designs

export { DataDrivenProTemplate } from './DataDrivenProTemplate';
export { DesignerModernTemplate } from './DesignerModernTemplate';
export { TechProBlueTemplate } from './TechProBlueTemplate';
export { ExecutiveProfessionalLayoutTemplate } from './ExecutiveProfessionalLayoutTemplate';
export { ExecutiveStandardTemplate } from './ExecutiveStandardTemplate';
export { ElegantTimelineTemplate } from './ElegantTimelineTemplate';
export { TheModernCVTemplate } from './TheModernCVTemplate';
export { HeaderProfessionalTemplate } from './HeaderProfessionalTemplate';
export { OnePagerProfessionalTemplate } from './OnePagerProfessionalTemplate';
export { MinimalProfessionalTemplate } from './MinimalProfessionalTemplate';
export { ProfessionalMinimalTemplate } from './ProfessionalMinimalTemplate';
export { ExecutiveMinimalTemplate } from './ExecutiveMinimalTemplate'; // Added export for ExecutiveMinimalTemplate
export { ProfessionalExtendedTemplate } from './ProfessionalExtendedTemplate'; // Added export for ProfessionalExtendedTemplate

// Template mapping for easy reference
export const CUSTOM_TEMPLATES = {
  'data-driven-pro': 'DataDrivenProTemplate',
  'designer-modern': 'DesignerModernTemplate',
  'tech-pro-blue': 'TechProBlueTemplate',
  'executive-professional-layout': 'ExecutiveProfessionalLayoutTemplate',
  'executive-professional': 'ExecutiveProfessionalLayoutTemplate', // Alias for template name matching
  'executive-standard': 'ExecutiveStandardTemplate',
  'elegant-timeline': 'ElegantTimelineTemplate',
  'the-modern-cv': 'TheModernCVTemplate',
  'header-professional': 'HeaderProfessionalTemplate',
  'one-pager-professional': 'OnePagerProfessionalTemplate',
  'minimal-professional': 'MinimalProfessionalTemplate',
  'professional-minimal': 'ProfessionalMinimalTemplate',
  'executive-minimal': 'ExecutiveMinimalTemplate', // Added to CUSTOM_TEMPLATES
  'professional-extended': 'ProfessionalExtendedTemplate' // Added to CUSTOM_TEMPLATES
} as const;

export type CustomTemplateKey = keyof typeof CUSTOM_TEMPLATES;
