import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  summary: string;
}

export interface Experience {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  field: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  gpa: string;
  description: string;
}

export interface Skill {
  id: string;
  category: string;
  skills: string[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url: string;
  github: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  expiryDate: string;
  url: string;
}

export interface Language {
  id: string;
  language: string;
  proficiency: 'basic' | 'intermediate' | 'advanced' | 'native';
}

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface CVData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: Certification[];
  languages: Language[];
  customSections: CustomSection[];
}

interface CVStore {
  cvData: CVData;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCVData: (data: CVData) => void;
  updateCVField: (path: string, value: any) => void;
  addSection: (sectionType: keyof CVData, item?: any) => void;
  removeSection: (sectionType: keyof CVData, id: string) => void;
  updateSectionItem: (sectionType: keyof CVData, id: string, updates: any) => void;
  resetCV: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const defaultCVData: CVData = {
  personalInfo: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    linkedin: '',
    github: '',
    summary: ''
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  languages: [],
  customSections: []
};

const generateId = () => Math.random().toString(36).substr(2, 9);

export const useCVStore = create<CVStore>()(
  devtools(
    (set, get) => ({
      cvData: defaultCVData,
      isLoading: false,
      error: null,

      setCVData: (data) => set({ cvData: data }),

      updateCVField: (path, value) => {
        set((state) => {
          const newCVData = { ...state.cvData };
          const pathParts = path.split('.');
          let current: any = newCVData;
          
          for (let i = 0; i < pathParts.length - 1; i++) {
            current = current[pathParts[i]];
          }
          
          current[pathParts[pathParts.length - 1]] = value;
          
          return { cvData: newCVData };
        });
      },

      addSection: (sectionType, item) => {
        set((state) => {
          const newCVData = { ...state.cvData };
          
          switch (sectionType) {
            case 'experience':
              newCVData.experience.push({
                id: generateId(),
                jobTitle: '',
                company: '',
                location: '',
                startDate: '',
                endDate: '',
                current: false,
                description: '',
                achievements: [],
                ...item
              });
              break;
              
            case 'education':
              newCVData.education.push({
                id: generateId(),
                degree: '',
                institution: '',
                field: '',
                location: '',
                startDate: '',
                endDate: '',
                current: false,
                gpa: '',
                description: '',
                ...item
              });
              break;
              
            case 'skills':
              newCVData.skills.push({
                id: generateId(),
                category: '',
                skills: [],
                ...item
              });
              break;
              
            case 'projects':
              newCVData.projects.push({
                id: generateId(),
                title: '',
                description: '',
                technologies: [],
                url: '',
                github: '',
                startDate: '',
                endDate: '',
                current: false,
                ...item
              });
              break;
              
            case 'certifications':
              newCVData.certifications.push({
                id: generateId(),
                name: '',
                issuer: '',
                date: '',
                expiryDate: '',
                url: '',
                ...item
              });
              break;
              
            case 'languages':
              newCVData.languages.push({
                id: generateId(),
                language: '',
                proficiency: 'intermediate',
                ...item
              });
              break;
              
            case 'customSections':
              newCVData.customSections.push({
                id: generateId(),
                title: '',
                content: '',
                order: newCVData.customSections.length,
                ...item
              });
              break;
          }
          
          return { cvData: newCVData };
        });
      },

      removeSection: (sectionType, id) => {
        set((state) => {
          const newCVData = { ...state.cvData };
          
          switch (sectionType) {
            case 'experience':
              newCVData.experience = newCVData.experience.filter(item => item.id !== id);
              break;
            case 'education':
              newCVData.education = newCVData.education.filter(item => item.id !== id);
              break;
            case 'skills':
              newCVData.skills = newCVData.skills.filter(item => item.id !== id);
              break;
            case 'projects':
              newCVData.projects = newCVData.projects.filter(item => item.id !== id);
              break;
            case 'certifications':
              newCVData.certifications = newCVData.certifications.filter(item => item.id !== id);
              break;
            case 'languages':
              newCVData.languages = newCVData.languages.filter(item => item.id !== id);
              break;
            case 'customSections':
              newCVData.customSections = newCVData.customSections.filter(item => item.id !== id);
              break;
          }
          
          return { cvData: newCVData };
        });
      },

      updateSectionItem: (sectionType, id, updates) => {
        set((state) => {
          const newCVData = { ...state.cvData };
          
          switch (sectionType) {
            case 'experience':
              const expIndex = newCVData.experience.findIndex(item => item.id === id);
              if (expIndex !== -1) {
                newCVData.experience[expIndex] = { ...newCVData.experience[expIndex], ...updates };
              }
              break;
            case 'education':
              const eduIndex = newCVData.education.findIndex(item => item.id === id);
              if (eduIndex !== -1) {
                newCVData.education[eduIndex] = { ...newCVData.education[eduIndex], ...updates };
              }
              break;
            case 'skills':
              const skillIndex = newCVData.skills.findIndex(item => item.id === id);
              if (skillIndex !== -1) {
                newCVData.skills[skillIndex] = { ...newCVData.skills[skillIndex], ...updates };
              }
              break;
            case 'projects':
              const projIndex = newCVData.projects.findIndex(item => item.id === id);
              if (projIndex !== -1) {
                newCVData.projects[projIndex] = { ...newCVData.projects[projIndex], ...updates };
              }
              break;
            case 'certifications':
              const certIndex = newCVData.certifications.findIndex(item => item.id === id);
              if (certIndex !== -1) {
                newCVData.certifications[certIndex] = { ...newCVData.certifications[certIndex], ...updates };
              }
              break;
            case 'languages':
              const langIndex = newCVData.languages.findIndex(item => item.id === id);
              if (langIndex !== -1) {
                newCVData.languages[langIndex] = { ...newCVData.languages[langIndex], ...updates };
              }
              break;
            case 'customSections':
              const customIndex = newCVData.customSections.findIndex(item => item.id === id);
              if (customIndex !== -1) {
                newCVData.customSections[customIndex] = { ...newCVData.customSections[customIndex], ...updates };
              }
              break;
          }
          
          return { cvData: newCVData };
        });
      },

      resetCV: () => set({ cvData: defaultCVData }),
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error })
    }),
    {
      name: 'cv-store'
    }
  )
); 