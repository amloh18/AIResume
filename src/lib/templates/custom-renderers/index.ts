// Custom Template Renderers
// These are hardcoded templates with 100% accurate mapping to specific CV designs

export { ExecutiveMinimalTemplate } from './ExecutiveMinimalTemplate';
export { DataDrivenProTemplate } from './DataDrivenProTemplate';
export { CorporateClassicTemplate } from './CorporateClassicTemplate';
export { TechProBlueTemplate } from './TechProBlueTemplate';
export { MinimalistCreativeTemplate } from './MinimalistCreativeTemplate';
export { ExecutiveStandardTemplate } from './ExecutiveStandardTemplate';
export { ATSClassicTemplate } from './ATSClassicTemplate';

// Template mapping for easy reference
export const CUSTOM_TEMPLATES = {
  'executive-minimal': 'ExecutiveMinimalTemplate',
  'data-driven-pro': 'DataDrivenProTemplate', 
  'corporate-classic': 'CorporateClassicTemplate',
  'tech-pro-blue': 'TechProBlueTemplate',
  'minimalist-creative': 'MinimalistCreativeTemplate',
  'executive-standard': 'ExecutiveStandardTemplate',
  'ats-classic': 'ATSClassicTemplate'
} as const;

export type CustomTemplateKey = keyof typeof CUSTOM_TEMPLATES;
