import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'cv' | 'portfolio' | 'cover-letter' | 'resume' | 'custom';
  globalStyles: {
    fontFamily: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    fontSize: string;
    lineHeight: string;
    spacing: string;
    borderRadius: string;
    boxShadow: string;
    customCSS?: string;
  };
  availableSections: Array<{
    key: string;
    displayName: string;
    componentName: string;
    isList: boolean;
    defaultItemContent: any;
    description?: string;
    icon?: string;
    category?: string;
    maxItems?: number;
    minItems?: number;
  }>;
  isActive: boolean;
  isDefault: boolean;
  version: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface TemplateStore {
  templates: Template[];
  selectedTemplate: Template | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTemplates: (templates: Template[]) => void;
  setSelectedTemplate: (template: Template | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useTemplateStore = create<TemplateStore>()(
  devtools(
    (set) => ({
      templates: [],
      selectedTemplate: null,
      isLoading: false,
      error: null,

      setTemplates: (templates) => set({ templates }),
      setSelectedTemplate: (template) => set({ selectedTemplate: template }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'template-store'
    }
  )
); 