'use client';

import React, { useState } from 'react';
import { CVData, PersonalInfo, Experience, Education, Skill, Project, Certification, Language } from '@/lib/stores/cvStore';
import { Template } from '@/lib/stores/templateStore';
import PersonalInfoForm from './forms/PersonalInfoForm';
import ExperienceForm from './forms/ExperienceForm';
import EducationForm from './forms/EducationForm';
import SkillsForm from './forms/SkillsForm';
import ProjectsForm from './forms/ProjectsForm';
import CertificationsForm from './forms/CertificationsForm';
import LanguagesForm from './forms/LanguagesForm';
import CustomSectionsForm from './forms/CustomSectionsForm';

interface CVFormPanelProps {
  cvData: CVData;
  onUpdateField: (path: string, value: any) => void;
  onAddSection: (sectionType: keyof CVData, item?: any) => void;
  onRemoveSection: (sectionType: keyof CVData, id: string) => void;
  selectedTemplate: Template | null;
}

const CVFormPanel: React.FC<CVFormPanelProps> = ({
  cvData,
  onUpdateField,
  onAddSection,
  onRemoveSection,
  selectedTemplate
}) => {
  const [activeSection, setActiveSection] = useState<string>('personal-info');

  const sections = [
    { id: 'personal-info', label: 'Personal Info', icon: '👤' },
    { id: 'experience', label: 'Experience', icon: '💼' },
    { id: 'education', label: 'Education', icon: '🎓' },
    { id: 'skills', label: 'Skills', icon: '⚡' },
    { id: 'projects', label: 'Projects', icon: '🚀' },
    { id: 'certifications', label: 'Certifications', icon: '🏆' },
    { id: 'languages', label: 'Languages', icon: '🌍' },
    { id: 'customSections', label: 'Custom Sections', icon: '📝' },
  ];

  const renderSection = () => {
    switch (activeSection) {
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
             onUpdate={(id: string, updates: Partial<CustomSection>) => {
               const index = cvData.customSections.findIndex(section => section.id === id);
               if (index !== -1) {
                 const updatedSection = { ...cvData.customSections[index], ...updates };
                 onUpdateField(`customSections.${index}`, updatedSection);
               }
             }}
           />
         );
       
       default:
        return <div>Select a section</div>;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Section Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeSection === section.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {renderSection()}
      </div>
    </div>
  );
};

export default CVFormPanel; 