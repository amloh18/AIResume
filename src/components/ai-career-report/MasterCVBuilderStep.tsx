'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { useSession } from 'next-auth/react';
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
import PersonalInfoForm from '@/components/studio/forms/PersonalInfoForm';
import WorkExperienceSection from '@/components/studio/forms/WorkExperienceSection';
import EducationSection from '@/components/studio/forms/EducationSection';
import SkillsSection from '@/components/studio/forms/SkillsSection';
import ProjectsSection from '@/components/studio/forms/ProjectsSection';
import CertificatesSection from '@/components/studio/forms/CertificatesSection';
import VolunteerSection from '@/components/studio/forms/VolunteerSection';
import AwardsSection from '@/components/studio/forms/AwardsSection';
import PublicationsSection from '@/components/studio/forms/PublicationsSection';
import LanguagesSection from '@/components/studio/forms/LanguagesSection';
import InterestsSection from '@/components/studio/forms/InterestsSection';
import ReferencesSection from '@/components/studio/forms/ReferencesSection';
// Import selectors and migration utilities
import { getVisibleCVSections, getAddableCVSections } from '@/lib/selectors/cv-section-selectors';
import { migrateLegacyCV, hasStructure } from '@/lib/migrations/cv-structure-migration';

interface MasterCVBuilderStepProps {
  onNext: () => void;
  onBack: () => void;
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
  'awards': 'awards',
  'publications': 'publications',
  'interests': 'interests',
  'references': 'references'
};

// Simple toolbar wrapper - toolbar operates on currently focused editor
function ToolbarWrapper({ showAIButton, fieldType, onAIGenerate, isGenerating }: {
  showAIButton?: boolean;
  fieldType?: 'summary' | 'experience' | 'other';
  onAIGenerate?: () => void;
  isGenerating?: boolean;
}) {
  return (
    <WYSIWYGToolbar
      showAIButton={showAIButton}
      fieldType={fieldType}
      onAIGenerate={onAIGenerate}
      isGenerating={isGenerating}
    />
  );
}

export default function MasterCVBuilderStep({ onNext, onBack }: MasterCVBuilderStepProps) {
  const context = useAICareerReport();
  const { data: session } = useSession();
  
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

  const addNewSection = (sectionType: string) => {
    console.log('Adding new section:', sectionType);
    
    // Initialize CV data for the new section
    switch (sectionType) {
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
          fluency: 'Native'
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
      case 'awards':
        updateCVData('awards', [...(state.cvData.awards || []), {
          title: '',
          date: '',
          awarder: '',
          summary: ''
        }]);
        break;
      case 'certificates':
        addCertification();
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
      case 'skills':
        updateCVData('skills', [...(state.cvData.skills || []), { category: '', skills: [] }]);
        break;
      case 'education':
        addEducation();
        break;
      case 'work_experience':
        addWorkExperience();
        break;
    }
    
    // Update structure to make section visible
    if (state.cvData && state.cvData.structure) {
      const updatedStructure = { ...state.cvData.structure };
      const sectionIndex = updatedStructure.sections.findIndex(s => s.type === sectionType);
      if (sectionIndex >= 0) {
        updatedStructure.sections[sectionIndex] = {
          ...updatedStructure.sections[sectionIndex],
          visible: true
        };
        updateCVData('structure', updatedStructure);
      }
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
    <div className="flex h-[calc(100vh-5rem)] bg-[#1A201A]">
      {/* Sticky Sidebar */}
      <div className="w-20 md:w-80 flex-shrink-0 p-2 md:p-4">
        <div className="bg-[#222B22] rounded-2xl border border-white/10 h-full flex flex-col shadow-xl">
          {/* Sidebar Header with Step Info */}
          <div className="p-3 md:p-6 border-b border-white/10">
            <div className="text-center mb-4">
              <div className="text-[#80FF00] font-bold text-sm md:text-lg mb-1">Step 2 of 3</div>
              <div className="text-lg md:text-xl font-bold text-white mb-2 hidden md:block">Details Sections</div>
              <div className="text-white/70 text-xs md:text-sm leading-relaxed hidden md:block">
                Review and edit your CV sections.<br />
                Click on a section title to navigate.
              </div>
            </div>
          </div>
          
          {/* Section Navigation - Using visible sections from selector */}
          <div className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
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
                  className={`w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black shadow-lg'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title={section.title}
                >
                  {React.createElement(IconComponent, { size: 18 })}
                  <span className="font-medium text-xs md:text-sm hidden md:block">{section.title}</span>
                </motion.button>
              );
            })}
          </div>
          
          {/* Sidebar Footer */}
          <div className="p-2 md:p-4 border-t border-white/10">
            <button 
              onClick={() => setShowAddSectionModal(true)}
              className="w-full flex items-center justify-center md:justify-start gap-2 md:gap-3 px-2 md:px-4 py-3 text-[#80FF00] hover:text-[#70e600] transition-colors rounded-xl hover:bg-white/5"
              title="Add New Section"
            >
              <Plus size={18} />
              <span className="font-medium text-xs md:text-sm hidden md:block">Add New Section</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-full">
        <div className="p-6">
          {/* Dynamic Sections - Using visible sections from selector */}
          {sidebarSections.map((section, index) => renderSection(section, index))}

          {/* Bottom Navigation */}
          <div className="flex items-center justify-between mt-12 pt-8 border-t border-white/10">
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 text-white/70 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft size={20} />
              Previous: Enter Details
            </motion.button>
            
            <motion.button
              onClick={onNext}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#80FF00] to-[#70e600] text-black rounded-lg font-semibold hover:from-[#70e600] hover:to-[#60d600] transition-all duration-200"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Finish & Save CV
              <ArrowRight size={20} />
            </motion.button>
          </div>
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
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {addableSections.map((section) => {
                const IconComponent = section.icon;
                const isAlreadyAdded = sidebarSections.some(s => s.type === section.id);
                
                return (
                  <motion.button
                    key={section.id}
                    onClick={() => !isAlreadyAdded && addNewSection(section.id)}
                    className={`w-full aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-xl transition-all duration-200 ${
                      isAlreadyAdded
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
