import { ITemplate, ISectionBlueprint } from '@/types/template';

export type TemplateCategory = 'professional' | 'creative' | 'minimal' | 'academic';
export type TemplateTier = 'free' | 'premium';
export type LayoutType = 'single-column' | 'two-column' | 'sidebar-left' | 'sidebar-right';

export interface ThemeConfig {
  fonts: {
    heading: string;
    body: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    textMuted: string;
  };
  spacing: {
    section: string;
    item: string;
    base: string;
  };
}

export interface LayoutSection {
  id: string;
  column: 'main' | 'sidebar';
  order: number;
}

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: TemplateCategory;
  tier: TemplateTier;
  
  theme: ThemeConfig;
  
  layout: {
    type: LayoutType;
    sections: LayoutSection[];
  };
  
  pageSettings: {
    format: 'A4' | 'Letter' | 'Legal' | 'custom';
    orientation: 'portrait' | 'landscape';
    margins: {
      top: string;
      bottom: string;
      left: string;
      right: string;
    };
  };
  
  customRenderer?: string;
  
  compatibility: {
    legacyTemplateId?: string;
    convertFromLegacy: (data: any) => any;
  };
}

export interface TemplateRegistry {
  templates: Map<string, TemplateDefinition>;
  register(template: TemplateDefinition): void;
  get(id: string): TemplateDefinition | undefined;
  getAll(): TemplateDefinition[];
  getByCategory(category: TemplateCategory): TemplateDefinition[];
  getByTier(tier: TemplateTier): TemplateDefinition[];
}

export const createTemplateRegistry = (): TemplateRegistry => {
  const templates = new Map<string, TemplateDefinition>();

  return {
    templates,

    register(template: TemplateDefinition) {
      this.templates.set(template.id, template);
    },

    get(id: string) {
      return this.templates.get(id);
    },

    getAll() {
      return Array.from(this.templates.values());
    },

    getByCategory(category: TemplateCategory) {
      return this.getAll().filter(t => t.category === category);
    },

    getByTier(tier: TemplateTier) {
      return this.getAll().filter(t => t.tier === tier);
    },
  };
};

export const DEFAULT_THEME: ThemeConfig = {
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  colors: {
    primary: '#84cc16',
    secondary: '#6b7280',
    accent: '#84cc16',
    background: '#ffffff',
    text: '#1f2937',
    textMuted: '#6b7280',
  },
  spacing: {
    section: '24px',
    item: '12px',
    base: '8px',
  },
};

export const convertLegacyTemplate = (
  legacyTemplate: ITemplate,
  templateDefinition: TemplateDefinition
): TemplateDefinition => {
  return {
    ...templateDefinition,
    id: legacyTemplate.id || legacyTemplate._id?.toString() || templateDefinition.id,
    name: legacyTemplate.name,
    description: legacyTemplate.description || templateDefinition.description,
    thumbnail: templateDefinition.thumbnail,
    category: templateDefinition.category,
    tier: legacyTemplate.tier || templateDefinition.tier,
    theme: {
      fonts: {
        heading: legacyTemplate.globalStyles?.fontFamily || DEFAULT_THEME.fonts.heading,
        body: legacyTemplate.globalStyles?.fontFamily || DEFAULT_THEME.fonts.body,
      },
      colors: {
        primary: legacyTemplate.globalStyles?.primaryColor || DEFAULT_THEME.colors.primary,
        secondary: legacyTemplate.globalStyles?.secondaryColor || DEFAULT_THEME.colors.secondary,
        accent: legacyTemplate.globalStyles?.primaryColor || DEFAULT_THEME.colors.accent,
        background: legacyTemplate.globalStyles?.backgroundColor || DEFAULT_THEME.colors.background,
        text: DEFAULT_THEME.colors.text,
        textMuted: DEFAULT_THEME.colors.textMuted,
      },
      spacing: {
        section: legacyTemplate.globalStyles?.spacing || DEFAULT_THEME.spacing.section,
        item: DEFAULT_THEME.spacing.item,
        base: DEFAULT_THEME.spacing.base,
      },
    },
    layout: {
      type: mapLayoutType(legacyTemplate.layoutType),
      sections: extractSectionsFromLayout(legacyTemplate),
    },
    pageSettings: {
      format: legacyTemplate.pageSettings?.format || 'A4',
      orientation: legacyTemplate.pageSettings?.orientation || 'portrait',
      margins: legacyTemplate.pageSettings?.margins || {
        top: '20mm',
        bottom: '20mm',
        left: '15mm',
        right: '15mm',
      },
    },
    customRenderer: legacyTemplate.customRenderer,
  };
};

function mapLayoutType(layoutType?: string): LayoutType {
  switch (layoutType) {
    case 'one-column':
      return 'single-column';
    case 'two-column':
      return 'two-column';
    case 'three-column':
      return 'sidebar-left';
    default:
      return 'single-column';
  }
}

function extractSectionsFromLayout(template: ITemplate): LayoutSection[] {
  const sections: LayoutSection[] = [];
  let order = 0;

  if (template.columnLayout?.main?.sections) {
    template.columnLayout.main.sections.forEach(sectionKey => {
      sections.push({
        id: sectionKey,
        column: 'main',
        order: order++,
      });
    });
  }

  if (template.columnLayout?.leftColumn?.sections) {
    template.columnLayout.leftColumn.sections.forEach(sectionKey => {
      sections.push({
        id: sectionKey,
        column: 'sidebar',
        order: order++,
      });
    });
  }

  return sections;
}

export function generateThemeCSS(theme: ThemeConfig): string {
  return `
    --template-font-heading: ${theme.fonts.heading};
    --template-font-body: ${theme.fonts.body};
    --template-color-primary: ${theme.colors.primary};
    --template-color-secondary: ${theme.colors.secondary};
    --template-color-accent: ${theme.colors.accent};
    --template-color-background: ${theme.colors.background};
    --template-color-text: ${theme.colors.text};
    --template-color-text-muted: ${theme.colors.textMuted};
    --template-spacing-section: ${theme.spacing.section};
    --template-spacing-item: ${theme.spacing.item};
    --template-spacing-base: ${theme.spacing.base};
  `.trim();
}