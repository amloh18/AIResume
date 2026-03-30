'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ITemplate } from '@/types/template';
import { TemplateDefinition, ThemeConfig } from '@/lib/templates/template-definition';
import { PreviewMode } from '@/components/preview/LivePreview';

interface UseLivePreviewOptions {
  initialCVData?: UnifiedCVDataStructure | null;
  initialTemplate?: ITemplate | null;
  initialTemplateDefinition?: TemplateDefinition | null;
  initialTheme?: ThemeConfig;
  initialMode?: PreviewMode;
  onDataChange?: (data: UnifiedCVDataStructure) => void;
}

interface UseLivePreviewReturn {
  cvData: UnifiedCVDataStructure | null;
  setCVData: (data: UnifiedCVDataStructure) => void;
  updateCVData: (updates: Partial<UnifiedCVDataStructure>) => void;
  template: ITemplate | null;
  setTemplate: (template: ITemplate) => void;
  templateDefinition: TemplateDefinition | null;
  setTemplateDefinition: (def: TemplateDefinition) => void;
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  mode: PreviewMode;
  setMode: (mode: PreviewMode) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  isReady: boolean;
  refreshPreview: () => void;
}

export const useLivePreview = (options?: UseLivePreviewOptions): UseLivePreviewReturn => {
  const [cvData, setCVDataState] = useState<UnifiedCVDataStructure | null>(
    options?.initialCVData || null
  );
  const [template, setTemplateState] = useState<ITemplate | null>(
    options?.initialTemplate || null
  );
  const [templateDefinition, setTemplateDefinitionState] = useState<TemplateDefinition | null>(
    options?.initialTemplateDefinition || null
  );
  const [theme, setThemeState] = useState<ThemeConfig>(
    options?.initialTheme || {
      fonts: { heading: 'Inter, system-ui, sans-serif', body: 'Inter, system-ui, sans-serif' },
      colors: { primary: '#1f2937', secondary: '#6b7280', accent: '#84cc16', background: '#ffffff', text: '#1f2937', textMuted: '#6b7280' },
      spacing: { section: '24px', item: '12px', base: '8px' },
    }
  );
  const [mode, setMode] = useState<PreviewMode>(options?.initialMode || 'preview');
  const [zoom, setZoomState] = useState(0.75);
  const [currentPage, setCurrentPageState] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const setCVData = useCallback((data: UnifiedCVDataStructure) => {
    setCVDataState(data);
  }, []);

  const updateCVData = useCallback((updates: Partial<UnifiedCVDataStructure>) => {
    setCVDataState(prev => {
      if (!prev) return prev;
      return { ...prev, ...updates } as UnifiedCVDataStructure;
    });

    if (options?.onDataChange) {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        setCVDataState(prev => {
          if (prev && options.onDataChange) {
            options.onDataChange({ ...prev, ...updates } as UnifiedCVDataStructure);
          }
          return prev;
        });
      }, 500);
    }
  }, [options]);

  const setTemplate = useCallback((newTemplate: ITemplate) => {
    setTemplateState(newTemplate);
  }, []);

  const setTemplateDefinition = useCallback((def: TemplateDefinition) => {
    setTemplateDefinitionState(def);
    if (def.theme) {
      setThemeState(def.theme);
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeConfig) => {
    setThemeState(newTheme);
  }, []);

  const setZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(0.5, Math.min(2, newZoom));
    setZoomState(clampedZoom);
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    setCurrentPageState(Math.max(0, page));
  }, []);

  const refreshPreview = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return {
    cvData,
    setCVData,
    updateCVData,
    template,
    setTemplate,
    templateDefinition,
    setTemplateDefinition,
    theme,
    setTheme,
    mode,
    setMode,
    zoom,
    setZoom,
    currentPage,
    setCurrentPage,
    totalPages,
    isReady,
    refreshPreview,
  };
};

export default useLivePreview;