export interface SnippetConfig {
  id: string;
  section: string;
  renderConfig: {
    bulletStyle?: 'dash' | 'dot' | 'arrow' | 'none';
    indent?: string;
    spacing?: string;
    format?: 'chip' | 'bar' | 'dot' | 'categorized' | 'inline' | 'compact';
    chipColor?: string;
    barHeight?: string;
    showLabel?: boolean;
    dotSize?: string;
    columns?: number;
    background?: string;
    border?: string;
    padding?: string;
  };
  compatibleTemplates: string[];
  title?: string;
  description?: string;
  usageCount?: number;
}

export const SNIPPET_REGISTRY: Record<string, SnippetConfig> = {
  experienceBulletDash: {
    id: 'experienceBulletDash',
    section: 'experience',
    title: 'Experience with Dash Bullets',
    description: 'Professional experience section with dash-style bullet points',
    renderConfig: {
      bulletStyle: 'dash',
      indent: '16px',
      spacing: '8px'
    },
    compatibleTemplates: ['modernProfessional', 'compactTextual', 'twoColumnClassic'],
    usageCount: 1250
  },
  experienceBulletDot: {
    id: 'experienceBulletDot',
    section: 'experience',
    title: 'Experience with Dot Bullets',
    description: 'Clean experience section with dot-style bullet points',
    renderConfig: {
      bulletStyle: 'dot',
      indent: '12px',
      spacing: '6px'
    },
    compatibleTemplates: ['minimalistATS', 'modernMinimal'],
    usageCount: 890
  },
  experienceBulletArrow: {
    id: 'experienceBulletArrow',
    section: 'experience',
    title: 'Experience with Arrow Bullets',
    description: 'Modern experience section with arrow-style bullet points',
    renderConfig: {
      bulletStyle: 'arrow',
      indent: '14px',
      spacing: '7px'
    },
    compatibleTemplates: ['modernMinimal', 'creativeGraphical'],
    usageCount: 650
  },
  skillsChip: {
    id: 'skillsChip',
    section: 'skills',
    title: 'Skills as Chips',
    description: 'Skills displayed as colored chips',
    renderConfig: {
      format: 'chip',
      chipColor: '#e5e7eb',
      spacing: '6px',
      padding: '4px 8px',
      border: '1px solid #d1d5db'
    },
    compatibleTemplates: ['modernProfessional', 'creativeGraphical', 'modernMinimal'],
    usageCount: 1100
  },
  skillsBar: {
    id: 'skillsBar',
    section: 'skills',
    title: 'Skills as Progress Bars',
    description: 'Skills displayed as progress bars with percentages',
    renderConfig: {
      format: 'bar',
      barHeight: '10px',
      showLabel: true,
      spacing: '8px'
    },
    compatibleTemplates: ['creativeGraphical'],
    usageCount: 450
  },
  skillsCategorized: {
    id: 'skillsCategorized',
    section: 'skills',
    title: 'Categorized Skills',
    description: 'Skills organized by categories',
    renderConfig: {
      format: 'categorized',
      spacing: '12px',
      indent: '16px'
    },
    compatibleTemplates: ['minimalistATS', 'twoColumnClassic'],
    usageCount: 750
  },
  skillsInline: {
    id: 'skillsInline',
    section: 'skills',
    title: 'Inline Skills',
    description: 'Skills displayed inline with commas',
    renderConfig: {
      format: 'inline',
      spacing: '4px'
    },
    compatibleTemplates: ['compactTextual'],
    usageCount: 320
  },
  languagesDot: {
    id: 'languagesDot',
    section: 'languages',
    title: 'Languages with Dots',
    description: 'Languages displayed with colored dots',
    renderConfig: {
      format: 'dot',
      dotSize: '8px',
      spacing: '4px'
    },
    compatibleTemplates: ['modernProfessional', 'compactTextual', 'twoColumnClassic'],
    usageCount: 680
  },
  languagesCompact: {
    id: 'languagesCompact',
    section: 'languages',
    title: 'Compact Languages',
    description: 'Languages displayed in compact format',
    renderConfig: {
      format: 'compact',
      spacing: '2px'
    },
    compatibleTemplates: ['compactTextual'],
    usageCount: 420
  },
  educationSimple: {
    id: 'educationSimple',
    section: 'education',
    title: 'Simple Education',
    description: 'Clean education section with simple formatting',
    renderConfig: {
      bulletStyle: 'none',
      spacing: '10px',
      indent: '0px'
    },
    compatibleTemplates: ['minimalistATS', 'modernMinimal', 'compactTextual'],
    usageCount: 920
  },
  educationDetailed: {
    id: 'educationDetailed',
    section: 'education',
    title: 'Detailed Education',
    description: 'Education section with detailed bullet points',
    renderConfig: {
      bulletStyle: 'dash',
      spacing: '8px',
      indent: '16px'
    },
    compatibleTemplates: ['modernProfessional', 'twoColumnClassic'],
    usageCount: 580
  },
  profileCentered: {
    id: 'profileCentered',
    section: 'profile',
    title: 'Centered Profile',
    description: 'Profile section with centered alignment',
    renderConfig: {
      background: 'transparent',
      padding: '16px',
      border: 'none'
    },
    compatibleTemplates: ['modernProfessional', 'modernMinimal', 'creativeGraphical'],
    usageCount: 1100
  },
  profileLeftAligned: {
    id: 'profileLeftAligned',
    section: 'profile',
    title: 'Left-Aligned Profile',
    description: 'Profile section with left alignment',
    renderConfig: {
      background: 'transparent',
      padding: '12px',
      border: 'none'
    },
    compatibleTemplates: ['minimalistATS', 'compactTextual', 'twoColumnClassic'],
    usageCount: 850
  },
  projectsGrid: {
    id: 'projectsGrid',
    section: 'projects',
    title: 'Projects Grid',
    description: 'Projects displayed in a grid layout',
    renderConfig: {
      format: 'categorized',
      columns: 2,
      spacing: '12px'
    },
    compatibleTemplates: ['modernMinimal', 'creativeGraphical'],
    usageCount: 380
  },
  projectsList: {
    id: 'projectsList',
    section: 'projects',
    title: 'Projects List',
    description: 'Projects displayed as a simple list',
    renderConfig: {
      bulletStyle: 'dash',
      spacing: '8px',
      indent: '16px'
    },
    compatibleTemplates: ['modernProfessional', 'minimalistATS', 'compactTextual'],
    usageCount: 520
  }
};

export function getSnippet(snippetId: string): SnippetConfig | null {
  return SNIPPET_REGISTRY[snippetId] || null;
}

export function getSnippetsBySection(section: string): SnippetConfig[] {
  return Object.values(SNIPPET_REGISTRY).filter(snippet => snippet.section === section);
}

export function getSnippetsByTemplate(templateId: string): SnippetConfig[] {
  return Object.values(SNIPPET_REGISTRY).filter(snippet => 
    snippet.compatibleTemplates.includes(templateId)
  );
}

export function getAllSnippets(): SnippetConfig[] {
  return Object.values(SNIPPET_REGISTRY);
}

export function getPopularSnippets(limit: number = 10): SnippetConfig[] {
  return getAllSnippets()
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, limit);
} 