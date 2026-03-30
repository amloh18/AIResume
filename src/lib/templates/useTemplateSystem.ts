'use client';

import { useState, useCallback, useMemo } from 'react';
import { TemplateDefinition, ThemeConfig, DEFAULT_THEME, convertLegacyTemplate } from '@/lib/templates/template-definition';
import { ITemplate } from '@/types/template';

interface UseTemplateSystemOptions {
  initialTemplate?: TemplateDefinition;
  initialTheme?: ThemeConfig;
  initialSectionVisibility?: Record<string, boolean>;
}

interface UseTemplateSystemReturn {
  currentTemplate: TemplateDefinition | null;
  theme: ThemeConfig;
  sectionVisibility: Record<string, boolean>;
  availableSections: Array<{ id: string; name: string; icon?: string }>;
  setCurrentTemplate: (template: TemplateDefinition) => void;
  setTheme: (theme: ThemeConfig) => void;
  setSectionVisibility: (sectionId: string, visible: boolean) => void;
  convertFromLegacy: (legacyTemplate: ITemplate, data?: any) => TemplateDefinition;
  getThemeCSS: () => string;
  toggleSection: (sectionId: string) => void;
}

export const useTemplateSystem = (options?: UseTemplateSystemOptions): UseTemplateSystemReturn => {
  const [currentTemplate, setCurrentTemplateState] = useState<TemplateDefinition | null>(
    options?.initialTemplate || null
  );
  const [theme, setThemeState] = useState<ThemeConfig>(
    options?.initialTheme || DEFAULT_THEME
  );
  const [sectionVisibility, setSectionVisibilityState] = useState<Record<string, boolean>>(
    options?.initialSectionVisibility || {
      personal_header: true,
      summary: true,
      experience: true,
      education: true,
      skills: true,
      projects: true,
      certificates: true,
      languages: true,
      volunteer: false,
      awards: false,
      publications: false,
    }
  );

  const availableSections = useMemo(() => [
    { id: 'personal_header', name: 'Personal Info', icon: '👤' },
    { id: 'summary', name: 'Summary', icon: '📝' },
    { id: 'experience', name: 'Experience', icon: '💼' },
    { id: 'education', name: 'Education', icon: '🎓' },
    { id: 'skills', name: 'Skills', icon: '⚡' },
    { id: 'projects', name: 'Projects', icon: '🚀' },
    { id: 'certificates', name: 'Certificates', icon: '🏆' },
    { id: 'languages', name: 'Languages', icon: '🌍' },
    { id: 'volunteer', name: 'Volunteer', icon: '🤝' },
    { id: 'awards', name: 'Awards', icon: '🎖️' },
    { id: 'publications', name: 'Publications', icon: '📚' },
  ], []);

  const setCurrentTemplate = useCallback((template: TemplateDefinition) => {
    setCurrentTemplateState(template);
    setThemeState(template.theme);
  }, []);

  const setTheme = useCallback((newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  }, []);

  const setSectionVisibility = useCallback((sectionId: string, visible: boolean) => {
    setSectionVisibilityState(prev => ({
      ...prev,
      [sectionId]: visible,
    }));
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setSectionVisibilityState(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  }, []);

  const convertFromLegacy = useCallback((legacyTemplate: ITemplate, data?: any): TemplateDefinition => {
    const templateDefinition: TemplateDefinition = {
      id: legacyTemplate.id || legacyTemplate._id?.toString() || `template_${Date.now()}`,
      name: legacyTemplate.name,
      description: legacyTemplate.description || '',
      thumbnail: legacyTemplate.thumbnail || '/templates/default.jpg',
      category: 'professional',
      tier: legacyTemplate.tier || 'free',
      theme: DEFAULT_THEME,
      layout: {
        type: 'single-column',
        sections: [],
      },
      pageSettings: {
        format: 'A4',
        orientation: 'portrait',
        margins: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm',
        },
      },
      customRenderer: legacyTemplate.customRenderer,
      compatibility: {
        convertFromLegacy: (ld) => ld,
      },
    };

    return convertLegacyTemplate(legacyTemplate, templateDefinition);
  }, []);

  const getThemeCSS = useCallback(() => {
    return `
      :root {
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
      }
    `.trim();
  }, [theme]);

  return {
    currentTemplate,
    theme,
    sectionVisibility,
    availableSections,
    setCurrentTemplate,
    setTheme,
    setSectionVisibility,
    convertFromLegacy,
    getThemeCSS,
    toggleSection,
  };
};

export default useTemplateSystem;