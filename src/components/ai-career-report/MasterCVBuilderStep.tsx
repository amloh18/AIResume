'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Briefcase,
  GraduationCap,
  Settings,
  Code,
  Award,
  Trophy,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Eye,
  Heart,
  BookOpen,
  Globe,
  Star,
  Users,
  FileText,
  X,
  FolderOpen
} from 'lucide-react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
// Import reusable form components
import PersonalInfoForm from '@/components/forms/PersonalInfoForm';
import WorkExperienceSection from '@/components/forms/WorkExperienceSection';
import EducationSection from '@/components/forms/EducationSection';
import SkillsSection from '@/components/forms/SkillsSection';
import ProjectsSection from '@/components/forms/ProjectsSection';
import CertificatesSection from '@/components/forms/CertificatesSection';
import VolunteerSection from '@/components/forms/VolunteerSection';
import AwardsSection from '@/components/forms/AwardsSection';
import PublicationsSection from '@/components/forms/PublicationsSection';
import LanguagesSection from '@/components/forms/LanguagesSection';
import InterestsSection from '@/components/forms/InterestsSection';
import ReferencesSection from '@/components/forms/ReferencesSection';
// Import selectors and migration utilities
import { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
import { migrateLegacyCV, hasStructure } from '@/lib/migrations/cv-structure-migration';

interface MasterCVBuilderStepProps {
  onNext: () => void;
  onBack: () => void;
  isEmbedded?: boolean;
}

// Map section type (from structure) to internal section ID (for renderSectionContent)
const SECTION_TYPE_TO_ID: Record<string, string> = {
  'personal_header': 'personal',
  'work_experience': 'experience',
  'education': 'education',
  'skills': 'skills',
  'projects': 'projects',
  'certificates': 'certifications',
  'languages': 'languages',
  'volunteer': 'volunteer',
  'volunteer_experience': 'volunteer', // Handle potential mismatch
  'awards': 'awards',
  'publications': 'publications',
  'interests': 'interests',
  'references': 'references'
};

// ...
export default function MasterCVBuilderStep({ onNext, onBack, isEmbedded = false }: MasterCVBuilderStepProps) {
  const context = useAICareerReport();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  if (!context) {
    return <div className="min-h-screen bg-[#1A261A] flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  const { state, dispatch } = context;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [generatingAI, setGeneratingAI] = useState<{ [key: string]: boolean }>({});

  // Ensure cvData has structure (migrate if needed)
  useEffect(() => {
    if (state.cvData && !hasStructure(state.cvData)) {
      const migratedData = migrateLegacyCV(state.cvData);
      dispatch({
        type: 'UPDATE_CV_DATA',
        payload: migratedData
      });
    }
  }, [state.cvData, dispatch]);

  // Helper to map icon name to component
  const getSectionIcon = (sectionType: string) => {
    const icons: Record<string, any> = {
      personal_header: User,
      work_experience: Briefcase,
      education: GraduationCap,
      skills: Code,
      projects: FolderOpen,
      certificates: Award,
      languages: Globe,
      volunteer: Heart,
      awards: Star,
      publications: BookOpen,
      interests: Users,
      references: Users
    };
    return icons[sectionType] || User;
  };

  // Get visible sections using centralized selector - computed once
  const visibleSectionsList = useMemo(
    () => getVisibleCVSections(state.cvData, 'cv'),
    [state.cvData]
  );

  // Map visible sections to sidebar format
  const sidebarSections = useMemo(() => {
    return visibleSectionsList.map(section => {
      const sectionId = SECTION_TYPE_TO_ID[section.type] || section.type;
      return {
        id: sectionId,
        type: section.type,
        title: section.label,
        icon: getSectionIcon(section.type),
        color: 'blue' // Default color, can be customized if needed
      };
    });
  }, [visibleSectionsList]);

  // Get addable sections using centralized selector
  const addableSectionsList = useMemo(
    () => getAddableCVSections(state.cvData),
    [state.cvData]
  );

  // Map addable sections to modal format
  const addableSections = useMemo(() => {
    return addableSectionsList.map(section => ({
      id: section.id,
      title: section.label,
      icon: getSectionIcon(section.id),
      category: section.category,
      description: section.description
    }));
  }, [addableSectionsList]);

  const updateCVData = (field: string, value: any) => {
    dispatch({
      type: 'UPDATE_CV_DATA',
      payload: {
        [field]: value
      }
    });
  };

  const updateBasicInfo = (field: string, value: any) => {
    updateCVData('basics', {
      ...state.cvData.basics,
      [field]: value
    });
  };

  // Helper functions for add/remove operations
  const addSection = (sectionType: string) => {
    switch (sectionType) {
      case 'education':
        addEducation();
        break;
      case 'skills':
        updateCVData('skills', [...(state.cvData.skills || []), { category: '', skills: [] }]);
        break;
      case 'projects':
        updateCVData('projects', [...(state.cvData.projects || []), {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          highlights: [],
          keywords: [],
          url: ''
        }]);
        break;
      case 'certificates':
        addCertification();
        break;
      case 'volunteer':
        updateCVData('volunteer', [...(state.cvData.volunteer || []), {
          organization: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        }]);
        break;
      case 'awards':
        updateCVData('awards', [...(state.cvData.awards || []), {
          title: '',
          date: '',
          awarder: '',
          summary: ''
        }]);
        break;
      case 'publications':
        updateCVData('publications', [...(state.cvData.publications || []), {
          name: '',
          publisher: '',
          releaseDate: '',
          url: '',
          summary: ''
        }]);
        break;
      case 'languages':
        updateCVData('languages', [...(state.cvData.languages || []), {
          language: '',
          fluency: ''
        }]);
        break;
      case 'interests':
        updateCVData('interests', [...(state.cvData.interests || []), {
          name: '',
          keywords: []
        }]);
        break;
      case 'references':
        updateCVData('references', [...(state.cvData.references || []), {
          name: '',
          reference: ''
        }]);
        break;
    }
  };

  const removeSection = (sectionType: string, index: number) => {
    switch (sectionType) {
      case 'education':
        removeEducation(index);
        break;
      case 'skills':
        updateCVData('skills', state.cvData.skills?.filter((_, i) => i !== index) || []);
        break;
      case 'projects':
        updateCVData('projects', state.cvData.projects?.filter((_, i) => i !== index) || []);
        break;
      case 'certificates':
        removeCertification(index);
        break;
      case 'volunteer':
        updateCVData('volunteer', state.cvData.volunteer?.filter((_, i) => i !== index) || []);
        break;
      case 'awards':
        updateCVData('awards', state.cvData.awards?.filter((_, i) => i !== index) || []);
        break;
      case 'publications':
        updateCVData('publications', state.cvData.publications?.filter((_, i) => i !== index) || []);
        break;
      case 'languages':
        updateCVData('languages', state.cvData.languages?.filter((_, i) => i !== index) || []);
        break;
      case 'interests':
        updateCVData('interests', state.cvData.interests?.filter((_, i) => i !== index) || []);
        break;
      case 'references':
        updateCVData('references', state.cvData.references?.filter((_, i) => i !== index) || []);
        break;
    }
  };

  const addWorkExperience = () => {
    const newWork = {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    };
    updateCVData('work', [...state.cvData.work, newWork]);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    const updatedWork = [...state.cvData.work];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    updateCVData('work', updatedWork);
  };

  const removeWorkExperience = (index: number) => {
    const updatedWork = state.cvData.work.filter((_, i) => i !== index);
    updateCVData('work', updatedWork);
  };

  const addEducation = () => {
    const newEducation = {
      institution: '',
      url: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      description: ''
      // courses is optional - only include if user adds courses
    };
    updateCVData('education', [...state.cvData.education, newEducation]);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updatedEducation = [...state.cvData.education];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    updateCVData('education', updatedEducation);
  };

  const removeEducation = (index: number) => {
    const updatedEducation = state.cvData.education.filter((_, i) => i !== index);
    updateCVData('education', updatedEducation);
  };

  const addCertification = () => {
    const newCert = {
      name: '',
      issuer: '',
      date: '',
      url: '',
      description: ''
    };
    updateCVData('certificates', [...(state.cvData.certificates || []), newCert]);
  };

  const updateCertification = (index: number, field: string, value: any) => {
    const updatedCerts = [...state.cvData.certificates];
    updatedCerts[index] = { ...updatedCerts[index], [field]: value };
    updateCVData('certificates', updatedCerts);
  };

  const removeCertification = (index: number) => {
    const updatedCerts = state.cvData.certificates.filter((_, i) => i !== index);
    updateCVData('certificates', updatedCerts);
  };

  // AI generation handlers
  const handleAIGenerate = async (type: 'summary' | 'experience', fieldId: string, currentContent: string, workIndex?: number) => {
    setGeneratingAI(prev => ({ ...prev, [fieldId]: true }));

    try {
      const response = await fetch('/api/ai/fix-and-improve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: currentContent,
          type,
          cvData: state.cvData,
          jobData: state.jobData || null
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI content');
      }

      const result = await response.json();

      if (result.success && result.content) {
        if (type === 'summary') {
          updateBasicInfo('summary', result.content);
        } else if (type === 'experience' && workIndex !== undefined) {
          updateWorkExperience(workIndex, 'summary', result.content);
        }
      }
    } catch (error) {
      console.error('AI generation error:', error);
    } finally {
      setGeneratingAI(prev => ({ ...prev, [fieldId]: false }));
    }
  };

  // Flow Detection: Check if this is Flow 3 (Master CV Edit)
  const editMaster = searchParams?.get('editMaster') === 'true';
  const masterCVId = searchParams?.get('masterCVId') || (typeof window !== 'undefined' ? sessionStorage.getItem('masterCVId') : null);
  const isEditingMasterCV = editMaster && masterCVId;
  const authStatus = sessionStatus;
  const currentSession = session;

  // Handle Save Master CV
  const handleSaveMasterCV = useCallback(async () => {
    // CRITICAL SECURITY: Check if user is authenticated before saving
    if (authStatus === 'loading') {
      alert('Please wait while we verify your authentication...');
      return;
    }

    if (authStatus !== 'authenticated' || !currentSession?.user?.id) {
      // User is not authenticated - save to localStorage and redirect to signup
      console.log('👤 User not authenticated, saving to localStorage and redirecting to signup...');

      try {
        const dataToSave = {
          cvData: state.cvData,
          aiAnalysis: state.aiAnalysis,
          currentStep: 3, // Force step 3 on return
          jobId: state.jobId,
          jobData: state.jobData,
          completedSteps: state.completedSteps,
          activeSection: state.activeSection,
          availableSections: state.availableSections,
          timestamp: Date.now()
        };

        localStorage.setItem('ai-career-report-data', JSON.stringify(dataToSave));
        console.log('✅ Data saved to localStorage');

        // Redirect to signup with callback to this step
        const callbackUrl = encodeURIComponent('/ai-career-report?step=3');
        router.push(`/signup?callbackUrl=${callbackUrl}`);
        return;
      } catch (e) {
        console.error('❌ Failed to save data to localStorage:', e);
        alert('Failed to save your progress. Please try again.');
        return;
      }
    }

    try {
      console.log('🚀 Starting Master CV creation from database draft...');

      // First, ensure latest data is saved to database
      const saveResponse = await fetch('/api/cv-draft/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: state.cvData,
          aiAnalysis: state.aiAnalysis,
          currentStep: state.currentStep,
          jobId: state.jobId,
          jobData: state.jobData,
          completedSteps: state.completedSteps,
          activeSection: state.activeSection,
          availableSections: state.availableSections
        })
      });

      if (!saveResponse.ok) {
        console.warn('⚠️ Failed to save draft before creating Master CV, continuing anyway...');
      }

      // Convert draft to Master CV
      const requestBody: any = {};
      if (isEditingMasterCV && masterCVId) {
        requestBody.masterCVId = masterCVId;
        console.log('🔄 Flow 3: Passing explicit masterCVId for update:', masterCVId);
      }
      // Include selected template ID if available
      if (state.selectedTemplate) {
        const templateId = state.selectedTemplate.id || state.selectedTemplate._id;
        if (templateId) {
          requestBody.templateId = templateId;
          console.log('✅ Passing selected templateId:', templateId);
        }
      }

      const response = await fetch('/api/cv-draft/convert-to-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Master CV creation response status:', response.status);

      if (!response.ok) {
        let errorMessage = `Master CV creation failed: ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          console.error('❌ Master CV creation failed with details:', errorData);

          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Master CV creation failed (text response):', errorText);
          errorMessage = errorText || errorMessage;
        }

        alert(errorMessage);
        return;
      }

      const result = await response.json();
      console.log('📥 Master CV creation result:', result);

      if (result.success) {
        const actionVerb = isEditingMasterCV ? 'updated' : 'created';
        console.log(`✅ Master CV ${actionVerb} successfully:`, result.cv?.id);

        // Mark as created/updated
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('masterCVCreated', 'true');
          sessionStorage.setItem('fromAICareerReport', 'true');

          // Clear masterCVId from sessionStorage after successful update
          if (isEditingMasterCV) {
            sessionStorage.removeItem('masterCVId');
          }

          // Clear localStorage since data is now in database
          try {
            localStorage.removeItem('ai-career-report-data');
            sessionStorage.removeItem('ai-career-report-backup');
            console.log('✅ Cleared localStorage after saving Master CV');
          } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
          }

          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('masterCVCreated'));
        }

        // CRITICAL SECURITY: Only trigger completion if user is still authenticated
        if (authStatus === 'authenticated' && currentSession?.user?.id) {
          console.log('✅ Master CV saved, user authenticated, redirecting to dashboard');
          router.push('/dashboard');
        } else {
          console.warn('🚫 Security: User not authenticated after save, preventing dashboard redirect');
          alert('Please sign in to complete the process');
        }
      } else {
        throw new Error(result.error || result.message || 'Failed to save Master CV');
      }

    } catch (error: any) {
      console.error('❌ Save Master CV error:', error);

      if (error.message) {
        alert(error.message);
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        alert('Network error: Unable to connect to server. Please check your internet connection and try again.');
      } else {
        alert('Failed to save Master CV. Please try again.');
      }
    }
  }, [currentSession, authStatus, state, isEditingMasterCV, masterCVId, router]);

  const addNewSection = (sectionType: string) => {
    console.log('Adding new section:', sectionType);

    // Initialize CV data for the new section
    let newSectionData: any = null;
    let fieldName: string = sectionType;

    switch (sectionType) {
      case 'volunteer':
        newSectionData = [...(state.cvData.volunteer || []), {
          organization: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        }];
        fieldName = 'volunteer';
        break;
      case 'publications':
        newSectionData = [...(state.cvData.publications || []), {
          name: '',
          publisher: '',
          releaseDate: '',
          url: '',
          summary: ''
        }];
        fieldName = 'publications';
        break;
      case 'languages':
        newSectionData = [...(state.cvData.languages || []), {
          language: '',
          fluency: 'Native'
        }];
        fieldName = 'languages';
        break;
      case 'interests':
        newSectionData = [...(state.cvData.interests || []), {
          name: '',
          keywords: []
        }];
        fieldName = 'interests';
        break;
      case 'references':
        newSectionData = [...(state.cvData.references || []), {
          name: '',
          reference: ''
        }];
        fieldName = 'references';
        break;
      case 'awards':
        newSectionData = [...(state.cvData.awards || []), {
          title: '',
          date: '',
          awarder: '',
          summary: ''
        }];
        fieldName = 'awards';
        break;
      case 'certificates':
        newSectionData = [...(state.cvData.certificates || []), {
          name: '',
          issuer: '',
          date: '',
          url: '',
          description: ''
        }];
        fieldName = 'certificates';
        break;
      case 'projects':
        newSectionData = [...(state.cvData.projects || []), {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          highlights: [],
          keywords: [],
          url: ''
        }];
        fieldName = 'projects';
        break;
      case 'skills':
        newSectionData = [...(state.cvData.skills || []), { category: '', skills: [] }];
        fieldName = 'skills';
        break;
      case 'education':
        newSectionData = [...(state.cvData.education || []), {
          institution: '',
          url: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
          description: ''
        }];
        fieldName = 'education';
        break;
      case 'work_experience':
        newSectionData = [...(state.cvData.work || []), {
          name: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        }];
        fieldName = 'work';
        break;
    }

    // Update both CV data and structure in a single dispatch
    if (newSectionData !== null && fieldName) {
      // Prepare structure update
      let updatedStructure = state.cvData.structure || { sections: [] };

      // Ensure structure has sections array
      if (!updatedStructure.sections) {
        updatedStructure = { ...updatedStructure, sections: [] };
      }

      // Clone sections array to avoid mutations
      const sections = [...updatedStructure.sections];
      const sectionIndex = sections.findIndex(s => s.type === sectionType);

      if (sectionIndex >= 0) {
        // Section exists in structure - mark as visible
        sections[sectionIndex] = {
          ...sections[sectionIndex],
          visible: true
        };
      } else {
        // Section doesn't exist in structure - add it
        const sectionId = `section-${sectionType}-${Date.now()}`;
        sections.push({
          id: sectionId,
          type: sectionType,
          visible: true
        });
      }

      // Update both CV data field and structure in a single dispatch
      dispatch({
        type: 'UPDATE_CV_DATA',
        payload: {
          [fieldName]: newSectionData,
          structure: { ...updatedStructure, sections }
        }
      });
    }

    console.log('CV data after adding section:', state.cvData);
    setShowAddSectionModal(false);
  };

  const toggleSectionCollapse = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Dynamic section renderer
  const renderSection = (section: any, index: number) => {
    const Icon = section.icon;
    const isCollapsed = collapsedSections.has(section.id);

    const getColorClasses = (color: string) => {
      const colorMap: { [key: string]: string } = {
        blue: 'from-blue-500 to-blue-600',
        green: 'from-green-500 to-green-600',
        purple: 'from-purple-500 to-purple-600',
        orange: 'from-orange-500 to-orange-600',
        pink: 'from-pink-500 to-pink-600',
        yellow: 'from-yellow-500 to-yellow-600',
        cyan: 'from-cyan-500 to-cyan-600',
        red: 'from-red-500 to-red-600',
        indigo: 'from-indigo-500 to-indigo-600',
        teal: 'from-teal-500 to-teal-600',
        amber: 'from-amber-500 to-amber-600',
        violet: 'from-violet-500 to-violet-600',
        emerald: 'from-emerald-500 to-emerald-600'
      };
      return colorMap[color] || 'from-gray-500 to-gray-600';
    };

    return (
      <motion.div
        key={section.id}
        id={section.id}
        className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 bg-gradient-to-r ${getColorClasses(section.color || 'blue')} rounded-lg flex items-center justify-center`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-white">{section.title}</h3>
          </div>
          <button
            onClick={() => toggleSectionCollapse(section.id)}
            className="text-white/60 hover:text-white transition-colors"
          >
            {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="space-y-6">
            {renderSectionContent(section.id)}
          </div>
        )}
      </motion.div>
    );
  };

  // Render content for each section type using reusable form components
  const renderSectionContent = (sectionId: string) => {
    switch (sectionId) {
      case 'personal':
        return (
          <PersonalInfoForm
            data={state.cvData.basics || {
              name: '',
              label: '',
              image: '',
              email: '',
              phone: '',
              url: '',
              summary: '',
              location: {
                address: '',
                postalCode: '',
                city: '',
                countryCode: '',
                region: ''
              },
              profiles: []
            }}
            onUpdate={updateBasicInfo}
            cvData={state.cvData}
            jobData={state.jobData}
            userId={session?.user?.id || ''}
          />
        );

      case 'experience':
        return (
          <WorkExperienceSection
            data={state.cvData.work || []}
            onUpdate={(data: any[]) => updateCVData('work', data)}
            jobData={state.jobData}
            userId={session?.user?.id || ''}
          />
        );

      case 'education':
        return (
          <EducationSection
            data={state.cvData.education || []}
            onUpdate={(data: any[]) => updateCVData('education', data)}
            onAdd={() => addSection('education')}
            onRemove={(index) => removeSection('education', index)}
            jobData={state.jobData}
            userId={session?.user?.id || ''}
          />
        );

      case 'skills':
        return (
          <SkillsSection
            data={state.cvData.skills || []}
            onUpdate={(data: any[]) => updateCVData('skills', data)}
            onAdd={() => addSection('skills')}
            onRemove={(index) => removeSection('skills', index)}
          />
        );

      case 'projects':
        return (
          <ProjectsSection
            data={state.cvData.projects || []}
            onUpdate={(data: any[]) => updateCVData('projects', data)}
            onAdd={() => addSection('projects')}
            onRemove={(index) => removeSection('projects', index)}
            jobData={state.jobData}
            userId={session?.user?.id || ''}
          />
        );

      case 'awards':
        return (
          <AwardsSection
            data={state.cvData.awards || []}
            onUpdate={(data: any[]) => updateCVData('awards', data)}
            onAdd={() => addSection('awards')}
            onRemove={(index) => removeSection('awards', index)}
          />
        );

      case 'certifications':
        return (
          <CertificatesSection
            data={state.cvData.certificates || []}
            onUpdate={(data: any[]) => updateCVData('certificates', data)}
            onAdd={() => addSection('certificates')}
            onRemove={(index) => removeSection('certificates', index)}
            jobData={state.jobData}
            userId={session?.user?.id || ''}
          />
        );

      // Additional sections
      case 'volunteer':
      case 'volunteer_experience': // Handle potential mismatch in structure
        return (
          <VolunteerSection
            data={state.cvData.volunteer || []}
            onUpdate={(data: any[]) => updateCVData('volunteer', data)}
            onAdd={() => addSection('volunteer')}
            onRemove={(index) => removeSection('volunteer', index)}
          />
        );

      case 'languages':
        return (
          <LanguagesSection
            data={state.cvData.languages || []}
            onUpdate={(data: any[]) => updateCVData('languages', data)}
            onAdd={() => addSection('languages')}
            onRemove={(index) => removeSection('languages', index)}
          />
        );

      case 'interests':
        return (
          <InterestsSection
            data={state.cvData.interests || []}
            onUpdate={(data: any[]) => updateCVData('interests', data)}
            onAdd={() => addSection('interests')}
            onRemove={(index) => removeSection('interests', index)}
          />
        );

      case 'references':
        return (
          <ReferencesSection
            data={state.cvData.references || []}
            onUpdate={(data: any[]) => updateCVData('references', data)}
            onAdd={() => addSection('references')}
            onRemove={(index) => removeSection('references', index)}
          />
        );

      case 'publications':
        return (
          <PublicationsSection
            data={state.cvData.publications || []}
            onUpdate={(data: any[]) => updateCVData('publications', data)}
            onAdd={() => addSection('publications')}
            onRemove={(index) => removeSection('publications', index)}
          />
        );

      default:
        return (
          <div className="text-center py-8">
            <p className="text-white/60">This section is not yet implemented.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-[#1A201A]">
      <div className="flex flex-1 overflow-hidden">
        {/* Fixed Sidebar - Always visible with proper width */}
        <div className="w-64 flex-shrink-0 p-4 transition-all duration-300 ease-in-out">
          <div className="bg-[#222B22] rounded-2xl border border-white/10 h-full flex flex-col shadow-xl">
            {/* Sidebar Header with Step Info */}
            <div className="p-6 border-b border-white/10">
              <div className="text-center mb-4">
                <div className="text-[#80FF00] font-bold text-lg mb-1">Step 2 of 3</div>
                <div className="text-xl font-bold text-white mb-2">Details Sections</div>
                <div className="text-white/70 text-sm leading-relaxed">
                  Review and edit your CV sections.<br />
                  Click on a section title to navigate.
                </div>
              </div>
            </div>

            {/* Section Navigation - Using visible sections from selector */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {sidebarSections.map((section) => {
                const IconComponent = section.icon;
                const isActive = state.activeSection === section.id;

                return (
                  <motion.button
                    key={section.id}
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_SECTION', payload: section.id });
                      scrollToSection(section.id);
                    }}
                    className={`w-full flex items-center justify-start gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                      }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    title={section.title}
                  >
                    {React.createElement(IconComponent, { size: 18 })}
                    <span className="font-medium text-sm">{section.title}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-white/10">
              <button
                onClick={() => setShowAddSectionModal(true)}
                className="w-full flex items-center justify-start gap-3 px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5"
                title="Add New Section"
              >
                <Plus size={18} />
                <span className="font-medium text-sm">Add New Section</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Constrained width to allow more space for CV Surgeon */}
        <div className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto">
            {/* Dynamic Sections - Using visible sections from selector */}
            {sidebarSections.map((section, index) => renderSection(section, index))}

            {/* Bottom Navigation */}
            <div className="flex items-center justify-start mt-12 pt-8 border-t border-white/10">
              <motion.button
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft size={20} />
                Previous: Enter Details
              </motion.button>
            </div>
          </div>

          {/* Finish & Save CV Button - Sticky button centered to form for unauth route OR auth route with no master CV (creating new) */}
          {(!authStatus || authStatus !== 'authenticated' || !isEditingMasterCV) && (
            <div className="sticky bottom-4 flex justify-center p-6 pointer-events-none">
              <button
                onClick={handleSaveMasterCV}
                className="bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black px-6 py-2.5 rounded-lg font-semibold text-sm hover:from-[#70e600] hover:to-[#60d600] transition-colors flex items-center justify-center gap-2 shadow-lg pointer-events-auto"
              >
                Finish & Save CV
                <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Update Master CV Button - Sticky button centered to form for auth route with master CV edit/update */}
          {authStatus === 'authenticated' && isEditingMasterCV && (
            <div className="sticky bottom-4 flex justify-center p-6 pointer-events-none">
              <button
                onClick={handleSaveMasterCV}
                className="bg-[#80FF00] text-black px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#70e600] transition-colors flex items-center justify-center gap-2 shadow-lg pointer-events-auto"
              >
                Update Master CV
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-[#222B22] rounded-2xl p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Add New Section</h2>
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="grid grid-cols-2 tablet:grid-cols-3 gap-4">
              {addableSections.map((section) => {
                const IconComponent = section.icon;
                const isAlreadyAdded = sidebarSections.some(s => s.type === section.id);

                return (
                  <motion.button
                    key={section.id}
                    onClick={() => !isAlreadyAdded && addNewSection(section.id)}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 ${isAlreadyAdded
                      ? 'bg-white/5 text-white/30 cursor-not-allowed'
                      : 'bg-white/10 hover:bg-white/20 text-white hover:scale-105'
                      }`}
                    whileHover={!isAlreadyAdded ? { scale: 1.05 } : {}}
                    whileTap={!isAlreadyAdded ? { scale: 0.95 } : {}}
                    disabled={isAlreadyAdded}
                  >
                    {React.createElement(IconComponent, { size: 32 })}
                    <span className="font-medium text-sm text-center">{section.title}</span>
                    {isAlreadyAdded && (
                      <span className="text-xs text-white/50">Already Added</span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
