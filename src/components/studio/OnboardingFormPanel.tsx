'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Zap, 
  Rocket, 
  Award, 
  Globe, 
  Plus,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import PersonalInfoStep from '@/components/onboarding/PersonalInfoStep';
import ExperienceStep from '@/components/onboarding/ExperienceStep';
import EducationStep from '@/components/onboarding/EducationStep';

interface OnboardingFormPanelProps {
  cvData: CVDataStructure | null;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  isCollapsed: boolean;
  onTogglePanel: () => void;
}

const OnboardingFormPanel: React.FC<OnboardingFormPanelProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  isCollapsed,
  onTogglePanel
}) => {
  const [activeSection, setActiveSection] = useState<'basics' | 'experience' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages'>('basics');

  // Debug logging
  console.log('🔍 OnboardingFormPanel received cvData:', cvData);
  console.log('🔍 cvData type:', typeof cvData);
  console.log('🔍 cvData.basics:', cvData?.basics);
  console.log('🔍 cvData.work:', cvData?.work);
  console.log('🔍 Active section:', activeSection);

  const sections = [
    { id: 'basics', label: 'Personal Info', icon: User },
    { id: 'experience', label: 'Experience', icon: Briefcase },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Zap },
    { id: 'projects', label: 'Projects', icon: Rocket },
    { id: 'certificates', label: 'Certifications', icon: Award },
    { id: 'languages', label: 'Languages', icon: Globe },
  ];

  // Create a mock onboarding context that works with the Studio's data
  const createMockOnboardingContext = () => ({
    state: {
      cvData: cvData || {
        basics: {
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
        },
        work: [],
        volunteer: [],
        education: [],
        awards: [],
        certificates: [],
        publications: [],
        skills: [],
        languages: [],
        interests: [],
        references: [],
        projects: []
      }
    },
    dispatch: (action: any) => {
      if (action.type === 'UPDATE_CV_DATA') {
        // Convert the onboarding context update to Studio's updateField format
        Object.entries(action.payload).forEach(([section, value]) => {
          if (section === 'basics') {
            Object.entries(value as any).forEach(([field, fieldValue]) => {
              if (field === 'location') {
                Object.entries(fieldValue as any).forEach(([locField, locValue]) => {
                  onUpdateField(`basics.location.${locField}`, locValue);
                });
              } else {
                onUpdateField(`basics.${field}`, fieldValue);
              }
            });
          } else {
            onUpdateField(section, value);
          }
        });
      }
    }
  });

  const mockContext = createMockOnboardingContext();

  const renderSection = () => {
    if (!cvData) {
      console.log('❌ No cvData available, showing loading state');
      return (
        <div className="p-4 text-gray-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-sm">Loading CV data...</p>
          </div>
        </div>
      );
    }

    // Validate that cvData has the expected structure
    if (!cvData.basics || typeof cvData.basics !== 'object') {
      console.error('❌ Invalid cvData structure:', cvData);
      return (
        <div className="p-4 text-red-400">
          <p className="text-sm">Error: Invalid CV data structure</p>
          <p className="text-xs mt-2">Please refresh the page or try again.</p>
          <pre className="text-xs mt-2 bg-gray-800 p-2 rounded overflow-auto">
            {JSON.stringify(cvData, null, 2)}
          </pre>
        </div>
      );
    }

    console.log(`✅ Rendering section: ${activeSection}`, cvData[activeSection as keyof CVDataStructure]);

    switch (activeSection) {
      case 'basics':
        return (
          <div className="p-4">
            <PersonalInfoStepContent 
              cvData={cvData}
              onUpdateField={onUpdateField}
              mockContext={mockContext}
            />
          </div>
        );
      case 'experience':
        return (
          <div className="p-4">
            <ExperienceStepContent 
              cvData={cvData}
              onUpdateField={onUpdateField}
              onAddSection={onAddSection}
              onRemoveSection={onRemoveSection}
              mockContext={mockContext}
            />
          </div>
        );
      case 'education':
        return (
          <div className="p-4">
            <EducationStepContent 
              cvData={cvData}
              onUpdateField={onUpdateField}
              onAddSection={onAddSection}
              onRemoveSection={onRemoveSection}
              mockContext={mockContext}
            />
          </div>
        );
      case 'skills':
        return (
          <div className="p-4">
            <SkillsStepContent 
              cvData={cvData}
              onUpdateField={onUpdateField}
              onAddSection={onAddSection}
              onRemoveSection={onRemoveSection}
              mockContext={mockContext}
            />
          </div>
        );
      case 'projects':
        return (
          <div className="p-4">
            <ProjectsStepContent 
              cvData={cvData}
              onUpdateField={onUpdateField}
              onAddSection={onAddSection}
              onRemoveSection={onRemoveSection}
              mockContext={mockContext}
            />
          </div>
        );
      default:
        return (
          <div className="p-4 text-gray-400">
            <p>Section {activeSection} coming soon...</p>
          </div>
        );
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4">
        <button
          onClick={onTogglePanel}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-96 bg-gray-900 border-r border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">CV Builder</h2>
          <button
            onClick={onTogglePanel}
            className="p-1 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Section Icons */}
        <div className="w-16 bg-gray-800 border-r border-gray-700 flex flex-col items-center py-4">
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id as any)}
                  className={`p-3 rounded-lg transition-all duration-200 ${
                    activeSection === section.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  title={section.label}
                >
                  <Icon size={20} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Content - Section Details */}
        <div className="flex-1 overflow-y-auto">
          {/* Section Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              {(() => {
                const Icon = sections.find(s => s.id === activeSection)?.icon || User;
                return <Icon size={24} className="text-blue-400" />;
              })()}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white">
                  {sections.find(s => s.id === activeSection)?.label}
                </h3>
                {cvData && (
                  <div className="text-xs text-gray-400 mt-1">
                    {(() => {
                      const sectionData = cvData[activeSection as keyof CVDataStructure];
                      if (Array.isArray(sectionData)) {
                        return `${sectionData.length} item${sectionData.length !== 1 ? 's' : ''}`;
                      } else if (typeof sectionData === 'object' && sectionData !== null) {
                        const filledFields = Object.values(sectionData).filter(v => v && v !== '').length;
                        return `${filledFields} field${filledFields !== 1 ? 's' : ''} filled`;
                      }
                      return 'No data';
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section Content */}
          <div className="p-4">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
};

// Adapted PersonalInfoStep content for Studio
const PersonalInfoStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, mockContext }) => {
  // Debug logging
  console.log('🔍 PersonalInfoStepContent received cvData:', cvData);
  console.log('🔍 cvData.basics:', cvData.basics);
  console.log('🔍 cvData.basics.name:', cvData.basics?.name);
  console.log('🔍 cvData.basics.email:', cvData.basics?.email);

  const handleInputChange = (field: string, value: string) => {
    console.log(`🔍 Updating basics.${field} to:`, value);
    onUpdateField(`basics.${field}`, value);
  };

  const handleLocationChange = (field: string, value: string) => {
    console.log(`🔍 Updating basics.location.${field} to:`, value);
    onUpdateField(`basics.location.${field}`, value);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Full Name *</label>
        <input
          type="text"
          value={cvData.basics?.name || ''}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="John Doe"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.name || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Professional Title</label>
        <input
          type="text"
          value={cvData.basics?.label || ''}
          onChange={(e) => handleInputChange('label', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Software Engineer"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.label || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Email *</label>
        <input
          type="email"
          value={cvData.basics?.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="john@example.com"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.email || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
        <input
          type="tel"
          value={cvData.basics?.phone || ''}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="+1 (555) 123-4567"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.phone || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
        <input
          type="text"
          value={cvData.basics?.location?.city || ''}
          onChange={(e) => handleLocationChange('city', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="San Francisco"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.location?.city || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">State/Region</label>
        <input
          type="text"
          value={cvData.basics?.location?.region || ''}
          onChange={(e) => handleLocationChange('region', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="California"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.location?.region || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
        <input
          type="url"
          value={cvData.basics?.url || ''}
          onChange={(e) => handleInputChange('url', e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="https://johndoe.com"
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.url || 'empty'}"</div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">Professional Summary</label>
        <textarea
          value={cvData.basics?.summary || ''}
          onChange={(e) => handleInputChange('summary', e.target.value)}
          rows={4}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Experienced software engineer with 5+ years..."
        />
        <div className="text-xs text-gray-500 mt-1">Current value: "{cvData.basics?.summary || 'empty'}"</div>
      </div>
    </div>
  );
};

// Adapted ExperienceStep content for Studio
const ExperienceStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  // Debug logging
  console.log('ExperienceStepContent received cvData:', cvData);
  console.log('cvData.work:', cvData.work);

  const addWorkExperience = () => {
    const newWork = {
      name: '',
      position: '',
      url: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: ['']
    };
    console.log('Adding new work experience:', newWork);
    onAddSection('work', newWork);
  };

  const updateWorkExperience = (index: number, field: string, value: any) => {
    console.log(`Updating work[${index}].${field} to:`, value);
    const updatedWork = [...(cvData.work || [])];
    updatedWork[index] = { ...updatedWork[index], [field]: value };
    onUpdateField('work', updatedWork);
  };

  const removeWorkExperience = (index: number) => {
    console.log(`Removing work experience at index:`, index);
    const updatedWork = (cvData.work || []).filter((_, i) => i !== index);
    onUpdateField('work', updatedWork);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addWorkExperience}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Experience</span>
        </button>
      </div>

      {(cvData.work || []).map((work, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Experience #{index + 1}</h4>
            <button
              onClick={() => removeWorkExperience(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
              <input
                type="text"
                value={work.position || ''}
                onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Software Engineer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
              <input
                type="text"
                value={work.name || ''}
                onChange={(e) => updateWorkExperience(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tech Company Inc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={work.startDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jan 2020"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={work.endDate || ''}
                  onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={work.summary || ''}
                onChange={(e) => updateWorkExperience(index, 'summary', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your role and achievements..."
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted EducationStep content for Studio
const EducationStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addEducation = () => {
    const newEducation = {
      institution: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      courses: []
    };
    onAddSection('education', newEducation);
  };

  const updateEducation = (index: number, field: string, value: any) => {
    const updatedEducation = [...(cvData.education || [])];
    updatedEducation[index] = { ...updatedEducation[index], [field]: value };
    onUpdateField('education', updatedEducation);
  };

  const removeEducation = (index: number) => {
    const updatedEducation = (cvData.education || []).filter((_, i) => i !== index);
    onUpdateField('education', updatedEducation);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addEducation}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Education</span>
        </button>
      </div>

      {(cvData.education || []).map((education, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Education #{index + 1}</h4>
            <button
              onClick={() => removeEducation(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Institution</label>
              <input
                type="text"
                value={education.institution || ''}
                onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="University of Technology"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Degree</label>
                <input
                  type="text"
                  value={education.studyType || ''}
                  onChange={(e) => updateEducation(index, 'studyType', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bachelor's"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={education.area || ''}
                  onChange={(e) => updateEducation(index, 'area', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={education.startDate || ''}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2018"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={education.endDate || ''}
                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">GPA/Score</label>
              <input
                type="text"
                value={education.score || ''}
                onChange={(e) => updateEducation(index, 'score', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="3.8/4.0"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted SkillsStep content for Studio
const SkillsStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addSkill = () => {
    const newSkill = {
      name: '',
      level: 'Beginner',
      keywords: ['']
    };
    onAddSection('skills', newSkill);
  };

  const updateSkill = (index: number, field: string, value: any) => {
    const updatedSkills = [...(cvData.skills || [])];
    updatedSkills[index] = { ...updatedSkills[index], [field]: value };
    onUpdateField('skills', updatedSkills);
  };

  const removeSkill = (index: number) => {
    const updatedSkills = (cvData.skills || []).filter((_, i) => i !== index);
    onUpdateField('skills', updatedSkills);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addSkill}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Skill</span>
        </button>
      </div>

      {(cvData.skills || []).map((skill, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Skill #{index + 1}</h4>
            <button
              onClick={() => removeSkill(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Skill Name</label>
              <input
                type="text"
                value={skill.name || ''}
                onChange={(e) => updateSkill(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="JavaScript"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Level</label>
              <select
                value={skill.level || 'Beginner'}
                onChange={(e) => updateSkill(index, 'level', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Keywords</label>
              <input
                type="text"
                value={skill.keywords.join(', ') || ''}
                onChange={(e) => updateSkill(index, 'keywords', e.target.value.split(',').map(k => k.trim()))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="javascript, react, node.js"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Adapted ProjectsStep content for Studio
const ProjectsStepContent: React.FC<{
  cvData: CVDataStructure;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVDataStructure, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVDataStructure, id: string) => void;
  mockContext: any;
}> = ({ cvData, onUpdateField, onAddSection, onRemoveSection, mockContext }) => {
  const addProject = () => {
    const newProject = {
      name: '',
      description: '',
      url: '',
      startDate: '',
      endDate: '',
      highlights: ['']
    };
    onAddSection('projects', newProject);
  };

  const updateProject = (index: number, field: string, value: any) => {
    const updatedProjects = [...(cvData.projects || [])];
    updatedProjects[index] = { ...updatedProjects[index], [field]: value };
    onUpdateField('projects', updatedProjects);
  };

  const removeProject = (index: number) => {
    const updatedProjects = (cvData.projects || []).filter((_, i) => i !== index);
    onUpdateField('projects', updatedProjects);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={addProject}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          <span className="text-sm">Add Project</span>
        </button>
      </div>

      {(cvData.projects || []).map((project, index) => (
        <div key={index} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-white">Project #{index + 1}</h4>
            <button
              onClick={() => removeProject(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Project Name</label>
              <input
                type="text"
                value={project.name || ''}
                onChange={(e) => updateProject(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome App"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={project.description || ''}
                onChange={(e) => updateProject(index, 'description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="A brief description of your project..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
                <input
                  type="text"
                  value={project.startDate || ''}
                  onChange={(e) => updateProject(index, 'startDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2022"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
                <input
                  type="text"
                  value={project.endDate || ''}
                  onChange={(e) => updateProject(index, 'endDate', e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Present"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Highlights</label>
              <input
                type="text"
                value={project.highlights.join(', ') || ''}
                onChange={(e) => updateProject(index, 'highlights', e.target.value.split(',').map(h => h.trim()))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Implemented new feature, improved performance"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default OnboardingFormPanel;
