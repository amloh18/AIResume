export interface TemplateConfig {
  id: string;
  name: string;
  fonts: {
    heading: string;
    body: string;
    sizes: {
      name: string;
      sectionTitle: string;
      jobTitle: string;
      bullet: string;
    };
  };
  layout: {
    columns: number;
    widthRatio: number[];
    responsive: boolean;
  };
  sections: {
    [key: string]: {
      position: 'left' | 'right' | 'top' | 'middle' | 'bottom';
      divider?: boolean;
      bulletStyle?: 'dash' | 'dot' | 'arrow';
      format?: 'chip' | 'bar' | 'dot' | 'categorized' | 'inline' | 'compact';
      background?: string;
    };
  };
}

export const TEMPLATE_REGISTRY: Record<string, TemplateConfig> = {
  modernProfessional: {
    id: 'modernProfessional',
    name: 'Modern Professional',
    fonts: {
      heading: 'Playfair Display',
      body: 'Open Sans',
      sizes: {
        name: '28px',
        sectionTitle: '18px',
        jobTitle: '16px',
        bullet: '14px'
      }
    },
    layout: {
      columns: 2,
      widthRatio: [0.65, 0.35],
      responsive: true
    },
    sections: {
      profile: { position: 'left', divider: true },
      experience: { position: 'left', bulletStyle: 'dash' },
      skills: { position: 'right', format: 'chip' },
      languages: { position: 'right', format: 'dot' },
      education: { position: 'left' },
      awards: { position: 'bottom' }
    }
  },
  minimalistATS: {
    id: 'minimalistATS',
    name: 'Minimalist ATS',
    fonts: {
      heading: 'Roboto',
      body: 'Roboto',
      sizes: {
        name: '24px',
        sectionTitle: '16px',
        jobTitle: '14px',
        bullet: '12px'
      }
    },
    layout: {
      columns: 1,
      widthRatio: [1],
      responsive: false
    },
    sections: {
      profile: { position: 'top' },
      experience: { position: 'middle' },
      education: { position: 'middle' },
      skills: { position: 'bottom', format: 'categorized' }
    }
  },
  creativeGraphical: {
    id: 'creativeGraphical',
    name: 'Creative Graphical',
    fonts: {
      heading: 'Lobster',
      body: 'Nunito',
      sizes: {
        name: '36px',
        sectionTitle: '20px',
        jobTitle: '18px',
        bullet: '16px'
      }
    },
    layout: {
      columns: 2,
      widthRatio: [0.6, 0.4],
      responsive: true
    },
    sections: {
      profile: { position: 'top', background: '#eee' },
      experience: { position: 'left' },
      education: { position: 'left' },
      skills: { position: 'right', format: 'bar' },
      contact: { position: 'right', background: '#f0f0f0' }
    }
  },
  compactTextual: {
    id: 'compactTextual',
    name: 'Compact Textual',
    fonts: {
      heading: 'Georgia',
      body: 'Arial',
      sizes: {
        name: '20px',
        sectionTitle: '14px',
        jobTitle: '13px',
        bullet: '12px'
      }
    },
    layout: {
      columns: 1,
      widthRatio: [1],
      responsive: true
    },
    sections: {
      profile: { position: 'top' },
      experience: { position: 'middle' },
      skills: { position: 'bottom', format: 'inline' },
      languages: { position: 'bottom', format: 'compact' }
    }
  },
  twoColumnClassic: {
    id: 'twoColumnClassic',
    name: 'Two Column Classic',
    fonts: {
      heading: 'Times New Roman',
      body: 'Times New Roman',
      sizes: {
        name: '26px',
        sectionTitle: '16px',
        jobTitle: '14px',
        bullet: '12px'
      }
    },
    layout: {
      columns: 2,
      widthRatio: [0.7, 0.3],
      responsive: true
    },
    sections: {
      profile: { position: 'left', divider: true },
      experience: { position: 'left' },
      education: { position: 'left' },
      skills: { position: 'right', format: 'categorized' },
      languages: { position: 'right', format: 'dot' },
      certifications: { position: 'right' }
    }
  },
  modernMinimal: {
    id: 'modernMinimal',
    name: 'Modern Minimal',
    fonts: {
      heading: 'Inter',
      body: 'Inter',
      sizes: {
        name: '32px',
        sectionTitle: '18px',
        jobTitle: '16px',
        bullet: '14px'
      }
    },
    layout: {
      columns: 1,
      widthRatio: [1],
      responsive: true
    },
    sections: {
      profile: { position: 'top' },
      experience: { position: 'middle', bulletStyle: 'arrow' },
      education: { position: 'middle' },
      skills: { position: 'bottom', format: 'chip' },
      projects: { position: 'bottom' }
    }
  }
};

export function getTemplate(templateId: string): TemplateConfig | null {
  return TEMPLATE_REGISTRY[templateId] || null;
}

export function getAllTemplates(): TemplateConfig[] {
  return Object.values(TEMPLATE_REGISTRY);
}

export function getTemplatesByCategory(category: string): TemplateConfig[] {
  // This can be extended to filter by category when categories are added to templates
  return getAllTemplates();
} 