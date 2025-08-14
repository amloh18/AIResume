'use client';

import React, { useState } from 'react';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Zap, 
  Rocket, 
  Award, 
  Globe, 
  FileText,
  Plus,
  GripVertical,
  ChevronRight,
  ChevronLeft,
  MoreVertical,
  Palette,
  Type,
  Layout,
  ChevronLeft as ChevronLeftIcon
} from 'lucide-react';
import { CVData, PersonalInfo, Experience, Education, Skill, Project, Certification, Language, CustomSection } from '@/lib/stores/cvStore';
import { Template } from '@/lib/stores/templateStore';
import PersonalInfoForm from './forms/PersonalInfoForm';
import ExperienceForm from './forms/ExperienceForm';
import EducationForm from './forms/EducationForm';
import SkillsForm from './forms/SkillsForm';
import ProjectsForm from './forms/ProjectsForm';
import CertificationsForm from './forms/CertificationsForm';
import LanguagesForm from './forms/LanguagesForm';
import CustomSectionsForm from './forms/CustomSectionsForm';

interface StructurePanelProps {
  cvData: CVData;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVData, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVData, id: string) => void;
  selectedTemplate: Template | null;
  isCollapsed: boolean;
  onTogglePanel: () => void;
}

const StructurePanel: React.FC<StructurePanelProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  selectedTemplate,
  isCollapsed,
  onTogglePanel
}) => {
  const [activeTab, setActiveTab] = useState<'structure' | 'design'>('structure');
  const [activeDesignSubTab, setActiveDesignSubTab] = useState<'templates' | 'styling' | 'snippets'>('templates');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  const sections = [
    { id: 'personal-info', label: 'Personal Info', icon: User, type: 'personalInfo' as keyof CVData },
    { id: 'experience', label: 'Experience', icon: Briefcase, type: 'experience' as keyof CVData },
    { id: 'education', label: 'Education', icon: GraduationCap, type: 'education' as keyof CVData },
    { id: 'skills', label: 'Skills', icon: Zap, type: 'skills' as keyof CVData },
    { id: 'projects', label: 'Projects', icon: Rocket, type: 'projects' as keyof CVData },
    { id: 'certifications', label: 'Certifications', icon: Award, type: 'certifications' as keyof CVData },
    { id: 'languages', label: 'Languages', icon: Globe, type: 'languages' as keyof CVData },
    { id: 'customSections', label: 'Custom Sections', icon: FileText, type: 'customSections' as keyof CVData },
  ];

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'personal-info':
        return (
          <PersonalInfoForm
            personalInfo={cvData.personalInfo}
            onUpdate={(field: keyof PersonalInfo, value: any) => 
              onUpdateField(`personalInfo.${field}`, value)
            }
          />
        );
      
      case 'experience':
        return (
          <ExperienceForm
            experience={cvData.experience}
            onAdd={() => onAddSection('experience')}
            onRemove={(id: string) => onRemoveSection('experience', id)}
            onUpdate={(id: string, updates: Partial<Experience>) => {
              const index = cvData.experience.findIndex(exp => exp.id === id);
              if (index !== -1) {
                const updatedExp = { ...cvData.experience[index], ...updates };
                onUpdateField(`experience.${index}`, updatedExp);
              }
            }}
          />
        );
      
      case 'education':
        return (
          <EducationForm
            education={cvData.education}
            onAdd={() => onAddSection('education')}
            onRemove={(id: string) => onRemoveSection('education', id)}
            onUpdate={(id: string, updates: Partial<Education>) => {
              const index = cvData.education.findIndex(edu => edu.id === id);
              if (index !== -1) {
                const updatedEdu = { ...cvData.education[index], ...updates };
                onUpdateField(`education.${index}`, updatedEdu);
              }
            }}
          />
        );
      
      case 'skills':
        return (
          <SkillsForm
            skills={cvData.skills}
            onAdd={() => onAddSection('skills')}
            onRemove={(id: string) => onRemoveSection('skills', id)}
            onUpdate={(id: string, updates: Partial<Skill>) => {
              const index = cvData.skills.findIndex(skill => skill.id === id);
              if (index !== -1) {
                const updatedSkill = { ...cvData.skills[index], ...updates };
                onUpdateField(`skills.${index}`, updatedSkill);
              }
            }}
          />
        );
      
      case 'projects':
        return (
          <ProjectsForm
            projects={cvData.projects}
            onAdd={() => onAddSection('projects')}
            onRemove={(id: string) => onRemoveSection('projects', id)}
            onUpdate={(id: string, updates: Partial<Project>) => {
              const index = cvData.projects.findIndex(proj => proj.id === id);
              if (index !== -1) {
                const updatedProj = { ...cvData.projects[index], ...updates };
                onUpdateField(`projects.${index}`, updatedProj);
              }
            }}
          />
        );
      
      case 'certifications':
        return (
          <CertificationsForm
            certifications={cvData.certifications}
            onAdd={() => onAddSection('certifications')}
            onRemove={(id: string) => onRemoveSection('certifications', id)}
            onUpdate={(id: string, updates: Partial<Certification>) => {
              const index = cvData.certifications.findIndex(cert => cert.id === id);
              if (index !== -1) {
                const updatedCert = { ...cvData.certifications[index], ...updates };
                onUpdateField(`certifications.${index}`, updatedCert);
              }
            }}
          />
        );
      
      case 'languages':
        return (
          <LanguagesForm
            languages={cvData.languages}
            onAdd={() => onAddSection('languages')}
            onRemove={(id: string) => onRemoveSection('languages', id)}
            onUpdate={(id: string, updates: Partial<Language>) => {
              const index = cvData.languages.findIndex(lang => lang.id === id);
              if (index !== -1) {
                const updatedLang = { ...cvData.languages[index], ...updates };
                onUpdateField(`languages.${index}`, updatedLang);
              }
            }}
          />
        );
      
      case 'customSections':
        return (
          <CustomSectionsForm
            customSections={cvData.customSections}
            onAdd={() => onAddSection('customSections')}
            onRemove={(id: string) => onRemoveSection('customSections', id)}
            onUpdate={(id: string, updates: any) => {
              const index = cvData.customSections.findIndex(section => section.id === id);
              if (index !== -1) {
                const updatedSection = { ...cvData.customSections[index], ...updates };
                onUpdateField(`customSections.${index}`, updatedSection);
              }
            }}
          />
        );
      
      default:
        return <div className="p-4 text-gray-400">Select a section</div>;
    }
  };

  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col bg-gray-800 relative">
        {/* Floating Toggle Button */}
        <button
          onClick={onTogglePanel}
          className="absolute -right-3 top-4 z-50 w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center hover:bg-lime-700 transition-colors shadow-lg focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          title="Expand Structure Panel"
        >
          <ChevronRight className="h-3 w-3" />
        </button>

        {/* Icon Rail */}
        <div className="flex flex-col items-center py-4 space-y-2">
          <button
            onClick={() => {
              setActiveTab('structure');
              onTogglePanel();
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'structure'
                ? 'bg-lime-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Structure"
          >
            <FileText className="h-5 w-5" />
          </button>
          
          <button
            onClick={() => {
              setActiveTab('design');
              onTogglePanel();
            }}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === 'design'
                ? 'bg-lime-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
            title="Design"
          >
            <Palette className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-800 relative">
      {/* Floating Toggle Button */}
      <button
        onClick={onTogglePanel}
        className="absolute -right-3 top-4 z-50 w-6 h-6 bg-lime-600 text-white rounded-full flex items-center justify-center hover:bg-lime-700 transition-colors shadow-lg focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
        title="Collapse Structure Panel"
      >
        <ChevronLeftIcon className="h-3 w-3" />
      </button>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('structure')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'structure'
              ? 'text-lime-400 border-b-2 border-lime-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Structure
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'design'
              ? 'text-lime-400 border-b-2 border-lime-400'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Design
        </button>
      </div>

      {activeTab === 'structure' ? (
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Vertical Icon Rail */}
            <div className="w-12 bg-gray-700 flex flex-col items-center py-4 space-y-2">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="relative group"
                  title={section.label}
                >
                  <button
                    className="p-2 rounded-lg transition-colors text-gray-400 hover:text-white hover:bg-gray-600"
                  >
                    <section.icon className="h-4 w-4" />
                  </button>
                  <button
                    className="absolute -left-1 top-1 p-1 text-gray-500 hover:text-gray-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Drag to reorder"
                  >
                    <GripVertical className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Section Content */}
            <div className="flex-1 p-4 space-y-6">
              {sections.map((section) => (
                <div key={section.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center space-x-2">
                      <section.icon className="h-4 w-4 text-lime-400" />
                      <span>{section.label}</span>
                    </h3>
                    <button className="p-1 text-gray-400 hover:text-gray-300">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="bg-gray-700 rounded-lg p-4">
                    {renderSection(section.id)}
                  </div>
                </div>
              ))}

              {/* Add Section Button */}
              <div className="pt-4">
                <button
                  onClick={() => setShowAddSectionModal(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-sm font-medium">Add Section</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Design Tab */
        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Design Sub-rail */}
            <div className="w-12 bg-gray-700 flex flex-col items-center py-4 space-y-2">
              <button
                onClick={() => setActiveDesignSubTab('templates')}
                className={`p-2 rounded-lg transition-colors ${
                  activeDesignSubTab === 'templates'
                    ? 'bg-lime-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
                title="Templates"
              >
                <Layout className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveDesignSubTab('styling')}
                className={`p-2 rounded-lg transition-colors ${
                  activeDesignSubTab === 'styling'
                    ? 'bg-lime-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
                title="Styling"
              >
                <Palette className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveDesignSubTab('snippets')}
                className={`p-2 rounded-lg transition-colors ${
                  activeDesignSubTab === 'snippets'
                    ? 'bg-lime-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-600'
                }`}
                title="Snippets"
              >
                <Type className="h-4 w-4" />
              </button>
            </div>

            {/* Design Content */}
            <div className="flex-1 p-4">
              {activeDesignSubTab === 'templates' && (
                <div className="space-y-3">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">Compact Professional ATS</h3>
                    <p className="text-xs text-gray-400 mb-3">Clean, ATS-friendly template</p>
                    <button className="w-full px-3 py-2 bg-lime-600 text-white text-sm rounded hover:bg-lime-700">
                      Apply Template
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">Classic Dots Pro</h3>
                    <p className="text-xs text-gray-400 mb-3">Traditional with modern touches</p>
                    <button className="w-full px-3 py-2 bg-gray-600 text-gray-300 text-sm rounded hover:bg-gray-500">
                      Apply Template
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-white mb-2">MonoChic Accent</h3>
                    <p className="text-xs text-gray-400 mb-3">Minimalist with accent colors</p>
                    <button className="w-full px-3 py-2 bg-gray-600 text-gray-300 text-sm rounded hover:bg-gray-500">
                      Apply Template
                    </button>
                  </div>
                </div>
              )}

              {activeDesignSubTab === 'styling' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Primary Color</label>
                    <div className="flex space-x-2">
                      <button className="w-8 h-8 bg-lime-500 rounded-full border-2 border-lime-400"></button>
                      <button className="w-8 h-8 bg-blue-500 rounded-full border-2 border-transparent"></button>
                      <button className="w-8 h-8 bg-purple-500 rounded-full border-2 border-transparent"></button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Font Family</label>
                    <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-300 text-sm">
                      <option>Inter</option>
                      <option>Roboto</option>
                      <option>Poppins</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Spacing</label>
                    <input type="range" min="0.8" max="1.4" step="0.1" className="w-full" />
                  </div>
                </div>
              )}

              {activeDesignSubTab === 'snippets' && (
                <div className="space-y-3">
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">Quantified Achievement</h4>
                    <p className="text-xs text-gray-400 mb-2">Increased efficiency by 40% through process optimization</p>
                    <button className="text-xs text-lime-400 hover:text-lime-300">Insert</button>
                  </div>
                  
                  <div className="p-3 bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-2">Leadership Bullet</h4>
                    <p className="text-xs text-gray-400 mb-2">Led cross-functional team of 8 developers</p>
                    <button className="text-xs text-lime-400 hover:text-lime-300">Insert</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <h3 className="text-lg font-medium text-white mb-4">Add New Section</h3>
            <div className="grid grid-cols-2 gap-3">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    onAddSection(section.type);
                    setShowAddSectionModal(false);
                  }}
                  className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-left"
                >
                  <div className="flex items-center space-x-2">
                    <section.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{section.label}</span>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddSectionModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-600 text-gray-300 rounded-lg hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StructurePanel;
