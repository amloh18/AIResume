import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface ATSAnalysis {
  score: number;
  missingKeywords: string[];
  weakKeywords: string[];
  strengths: string[];
  suggestions: string[];
  updatedAt?: string;
}

export interface AISuggestion {
  id: string;
  title: string;
  content: string;
  type: 'improvement' | 'addition' | 'replacement';
  section: string;
  field?: string;
  generatedAt: string;
  isOutOfDate: boolean;
}

export interface AISectionState {
  isLoading: boolean;
  suggestions: AISuggestion[];
  lastGeneratedAt?: string;
  error?: string;
}

export interface AIStore {
  // ATS Score state
  ats: {
    score?: number;
    updating: boolean;
    updatedAt?: string;
    analysis?: ATSAnalysis;
    baseline: boolean; // Whether this is baseline ATS (no job context)
  };
  
  // AI sections state
  sections: Record<string, AISectionState>;
  
  // Global AI state
  generatingInitial: boolean;
  lastGeneratedAt?: string;
  outOfDate: Record<string, boolean>;
  
  // Mock/Real data tracking
  hasRealDataBySection: Record<string, boolean>;
  loadingBySection: Record<string, boolean>;
  
  // Actions
  setATSUpdating: (updating: boolean) => void;
  setATSScore: (score: number, analysis?: ATSAnalysis, baseline?: boolean) => void;
  setSectionLoading: (sectionId: string, loading: boolean) => void;
  setSectionSuggestions: (sectionId: string, suggestions: AISuggestion[]) => void;
  setSectionError: (sectionId: string, error?: string) => void;
  setGeneratingInitial: (generating: boolean) => void;
  markSectionOutOfDate: (sectionId: string, outOfDate: boolean) => void;
  markAllJobBasedSectionsOutOfDate: () => void;
  setHasRealData: (sectionId: string, hasData: boolean) => void;
  setLoadingBySection: (sectionId: string, loading: boolean) => void;
  resetAIState: () => void;
}

const jobDependentSections = [
  'content-optimizer',
  'quantification',
  'skills-mapper',
  'gap-analyzer',
  'achievement-generator',
  'summary-builder',
  'cover-letter-draft'
];

const defaultSectionState: AISectionState = {
  isLoading: false,
  suggestions: [],
  lastGeneratedAt: undefined,
  error: undefined
};

export const useAIStore = create<AIStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      ats: {
        score: undefined,
        updating: false,
        updatedAt: undefined,
        analysis: undefined,
        baseline: true
      },
      
      sections: {
        'content-optimizer': { ...defaultSectionState },
        'quantification': { ...defaultSectionState },
        'skills-mapper': { ...defaultSectionState },
        'gap-analyzer': { ...defaultSectionState },
        'achievement-generator': { ...defaultSectionState },
        'consistency-checker': { ...defaultSectionState },
        'summary-builder': { ...defaultSectionState },
        'cover-letter-draft': { ...defaultSectionState }
      },
      
      generatingInitial: false,
      lastGeneratedAt: undefined,
      outOfDate: {},
      
      // Mock/Real data tracking
      hasRealDataBySection: {},
      loadingBySection: {},
      
      // Actions
      setATSUpdating: (updating) => set((state) => ({
        ats: { ...state.ats, updating }
      })),
      
      setATSScore: (score, analysis, baseline = false) => {
        console.log('🎯 AIStore - Setting ATS score:', { score, baseline, hasAnalysis: !!analysis });
        return set((state) => ({
          ats: {
            ...state.ats,
            score,
            analysis,
            baseline,
            updating: false,
            updatedAt: new Date().toISOString()
          }
        }));
      },
      
      setSectionLoading: (sectionId, loading) => set((state) => ({
        sections: {
          ...state.sections,
          [sectionId]: {
            ...state.sections[sectionId],
            isLoading: loading
          }
        }
      })),
      
      setSectionSuggestions: (sectionId, suggestions) => set((state) => ({
        sections: {
          ...state.sections,
          [sectionId]: {
            ...state.sections[sectionId],
            suggestions,
            isLoading: false,
            lastGeneratedAt: new Date().toISOString(),
            error: undefined
          }
        }
      })),
      
      setSectionError: (sectionId, error) => set((state) => ({
        sections: {
          ...state.sections,
          [sectionId]: {
            ...state.sections[sectionId],
            error,
            isLoading: false
          }
        }
      })),
      
      setGeneratingInitial: (generating) => set({ generatingInitial: generating }),
      
      markSectionOutOfDate: (sectionId, outOfDate) => set((state) => ({
        outOfDate: {
          ...state.outOfDate,
          [sectionId]: outOfDate
        }
      })),
      
      markAllJobBasedSectionsOutOfDate: () => set((state) => {
        const newOutOfDate = { ...state.outOfDate };
        jobDependentSections.forEach(sectionId => {
          newOutOfDate[sectionId] = true;
        });
        return { outOfDate: newOutOfDate };
      }),
      
      setHasRealData: (sectionId, hasData) => set((state) => ({
        hasRealDataBySection: {
          ...state.hasRealDataBySection,
          [sectionId]: hasData
        }
      })),
      
      setLoadingBySection: (sectionId, loading) => set((state) => ({
        loadingBySection: {
          ...state.loadingBySection,
          [sectionId]: loading
        }
      })),
      
      resetAIState: () => set({
        ats: {
          score: undefined,
          updating: false,
          updatedAt: undefined,
          analysis: undefined,
          baseline: true
        },
        sections: {
          'content-optimizer': { ...defaultSectionState },
          'quantification': { ...defaultSectionState },
          'skills-mapper': { ...defaultSectionState },
          'gap-analyzer': { ...defaultSectionState },
          'achievement-generator': { ...defaultSectionState },
          'consistency-checker': { ...defaultSectionState },
          'summary-builder': { ...defaultSectionState },
          'cover-letter-draft': { ...defaultSectionState }
        },
        generatingInitial: false,
        lastGeneratedAt: undefined,
        outOfDate: {},
        hasRealDataBySection: {},
        loadingBySection: {}
      })
    }),
    {
      name: 'ai-store'
    }
  )
);
