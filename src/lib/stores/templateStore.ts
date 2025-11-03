import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ITemplate } from '@/types/template';

interface TemplateStore {
  templates: ITemplate[];
  selectedTemplate: ITemplate | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTemplates: (templates: ITemplate[]) => void;
  setSelectedTemplate: (template: ITemplate | null) => void;
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