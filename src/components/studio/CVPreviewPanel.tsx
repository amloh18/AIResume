'use client';

import React from 'react';
import { CVData } from '@/lib/stores/cvStore';
import { Template } from '@/lib/stores/templateStore';

// Import all possible section components
import HeaderModern from './sections/HeaderModern';
import SummarySimple from './sections/SummarySimple';
import ExperienceTimeline from './sections/ExperienceTimeline';
import EducationSection from './sections/EducationSection';
import SkillsSection from './sections/SkillsSection';
import ProjectsSection from './sections/ProjectsSection';
import CertificationsSection from './sections/CertificationsSection';
import LanguagesSection from './sections/LanguagesSection';
import CustomSection from './sections/CustomSection';

interface CVPreviewPanelProps {
  cvData: CVData;
  template: Template | null;
  jobData?: any;
}

const componentMap: Record<string, React.ComponentType<any>> = {
  HeaderModern,
  SummarySimple,
  ExperienceTimeline,
  EducationSection,
  SkillsSection,
  ProjectsSection,
  CertificationsSection,
  LanguagesSection,
  CustomSection,
};

const CVPreviewPanel: React.FC<CVPreviewPanelProps> = ({ cvData, template, jobData }) => {
  if (!template) {
    return <div className="p-8 text-gray-500 text-center">No template selected.</div>;
  }

  // For demo: fallback to a default structure if template.availableSections is missing
  const structure = template.availableSections || [];

  return (
    <div
      className="max-w-3xl mx-auto my-8 bg-white shadow-lg rounded-lg p-8"
      style={{
        fontFamily: template.globalStyles.fontFamily,
        color: template.globalStyles.primaryColor,
        background: template.globalStyles.backgroundColor,
      }}
    >
      {structure.map((section) => {
        // Map section key to cvData
        let sectionData = (cvData as any)[section.key];
        // For customSections, pass the array
        if (section.key === 'customSections') sectionData = cvData.customSections;
        // Only render if data exists and is not empty
        if (sectionData && (!Array.isArray(sectionData) || sectionData.length > 0)) {
          const ComponentToRender = componentMap[section.componentName] || null;
          if (!ComponentToRender) return null;
          return (
            <ComponentToRender
              key={section.key}
              data={sectionData}
              jobData={jobData}
              section={section}
              template={template}
            />
          );
        }
        return null;
      })}
    </div>
  );
};

export default CVPreviewPanel;