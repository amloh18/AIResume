'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface HeaderProfessionalTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
  sectionWrapper?: React.ComponentType<any>;
  AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
  onAddSection?: (sectionType: string) => void;
}

export const HeaderProfessionalTemplate: React.FC<HeaderProfessionalTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY',
  sectionWrapper: SectionWrapper,
  AddSectionButton,
  onAddSection
}) => {
  const { basics, work, education, skills, projects, certificates, languages } = cvData;

  // Helper to wrap section content with DraggableSection when provided
  // Header sections (personal, contact, summary) should not be draggable
  const headerSectionTypes = ['personal', 'personal_header', 'contact', 'summary'];

  const Wrapper = ({ id, sectionType, children }: { id: string; sectionType: string; children: React.ReactNode }) => {
    const isHeader = headerSectionTypes.includes(sectionType);

    if (SectionWrapper) {
      return (
        <SectionWrapper sectionId={id} sectionType={sectionType} isLocked={isHeader}>
          {children}
        </SectionWrapper>
      );
    }
    return <div data-section-id={id}>{children}</div>;
  };

  // Format location
  const formatLocation = () => {
    const parts = [];
    if (basics?.location?.city) parts.push(basics.location.city);
    if (basics?.location?.region) parts.push(basics.location.region);
    if (basics?.location?.countryCode) parts.push(basics.location.countryCode);
    return parts.join(', ') || '';
  };

  return (
    <div className={`header-professional-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .header-professional-template {
          font-family: 'Calibri', 'Arial', sans-serif;
          max-width: 100%;
          margin: 0 auto;
          background: white;
          box-sizing: border-box;
          color: #333;
          line-height: 1.4;
          font-size: 11pt;
        }

        /* Header - Light Grey, Edge-to-Edge */
        .hp-header {
          background-color: #E5E7EB;
          padding: 24px 32px;
          margin: 0 -20px; /* Negative margin to go edge-to-edge if parent has padding */
          width: calc(100% + 40px);
          display: flex;
          align-items: center;
          gap: 24px;
        }
        
        .hp-header.no-photo {
          justify-content: flex-start;
        }
        
        .hp-header.has-photo {
          justify-content: flex-start;
        }

        /* Photo styling */
        .hp-photo {
          width: 100px;
          height: 100px;
          border-radius: 4px;
          object-fit: cover;
          flex-shrink: 0;
          border: 2px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .hp-header-content {
          flex: 1;
        }

        .hp-name {
          font-size: 26pt;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          color: #111;
          letter-spacing: 1px;
        }

        .hp-title {
          font-size: 11pt;
          font-weight: 400;
          color: #374151;
          margin: 0 0 12px 0;
        }

        .hp-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 10pt;
          color: #4B5563;
        }

        .hp-contact-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* Section Header - Grey Background, Centered Text */
        .hp-section-header {
          background-color: #E5E7EB;
          padding: 8px 32px;
          margin: 0 -20px 16px -20px;
          width: calc(100% + 40px);
          text-align: center;
        }

        .hp-section-title {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          margin: 0;
          letter-spacing: 0.5px;
        }

        /* Content Area */
        .hp-content {
          padding: 0 12px;
        }

        /* Section container */
        .hp-section {
          margin-bottom: 20px;
        }
        
        /* Add spacing after header before first section */
        .hp-header + .hp-section {
          margin-top: 20px;
        }

        /* 2-Column Layout for Items */
        .hp-item {
          display: grid;
          grid-template-columns: 30% 70%;
          gap: 16px;
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #E5E7EB;
        }

        .hp-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        /* Left Column - Metadata */
        .hp-item-left {
          font-size: 10pt;
        }

        .hp-item-role {
          font-weight: 700;
          color: #111;
          font-size: 11pt;
          margin-bottom: 2px;
        }

        .hp-item-org {
          color: #374151;
          margin-bottom: 2px;
        }

        .hp-item-dates {
          color: #6B7280;
          font-size: 9pt;
        }

        .hp-item-location {
          color: #6B7280;
          font-size: 9pt;
        }

        /* Right Column - Summary/Description */
        .hp-item-right {
          font-size: 10pt;
          color: #374151;
          line-height: 1.5;
        }

        .hp-item-right ul {
          margin: 0;
          padding-left: 16px;
        }

        .hp-item-right li {
          margin-bottom: 4px;
        }

        /* Professional Summary */
        .hp-summary-text {
          font-size: 10pt;
          line-height: 1.6;
          color: #374151;
          padding: 0 12px;
          margin-bottom: 20px;
        }

        /* Skills - Simple grid layout */
        .hp-skills-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 0 12px;
        }

        .hp-skill-category {
          margin-bottom: 8px;
        }

        .hp-skill-category-name {
          font-weight: 700;
          font-size: 10pt;
          color: #111;
          margin-bottom: 4px;
        }

        .hp-skill-list {
          font-size: 9pt;
          color: #4B5563;
          line-height: 1.4;
        }

        /* Languages - Inline */
        .hp-languages {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          padding: 0 12px;
        }

        .hp-language-item {
          font-size: 10pt;
        }

        .hp-language-name {
          font-weight: 600;
          color: #111;
        }

        .hp-language-level {
          color: #6B7280;
          font-size: 9pt;
        }

        @media print {
          .header-professional-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          .hp-header, .hp-section-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* Header - Grey Background Edge-to-Edge with optional Photo */}
      <div className={`hp-header ${basics?.image ? 'has-photo' : 'no-photo'}`} data-section-id="personal">
        {basics?.image && (
          <img
            src={basics.image}
            alt={basics.name || 'Profile'}
            className="hp-photo"
          />
        )}
        <div className="hp-header-content">
          <h1 className="hp-name">{basics?.name || 'YOUR NAME'}</h1>
          <p className="hp-title">{basics?.label || 'Professional Title'}</p>
          <div className="hp-contact-row">
            {basics?.email && (
              <span className="hp-contact-item">{basics.email}</span>
            )}
            {basics?.phone && (
              <span className="hp-contact-item">{basics.phone}</span>
            )}
            {formatLocation() && (
              <span className="hp-contact-item">{formatLocation()}</span>
            )}
            {basics?.profiles?.[0]?.url && (
              <span className="hp-contact-item">{basics.profiles[0].url}</span>
            )}
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      {basics?.summary && (
        <div className="hp-section" data-section-id="summary">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Professional Summary</h2>
          </div>
          <p className="hp-summary-text">{stripHtmlTags(basics.summary)}</p>
        </div>
      )}

      {/* Work Experience */}
      {work && work.length > 0 && (
        <div className="hp-section" data-section-id="work">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Work Experience</h2>
          </div>
          <div className="hp-content">
            {work.map((job, index) => (
              <div key={index} className="hp-item" data-item-id={index}>
                <div className="hp-item-left">
                  <div className="hp-item-role">{job.position}</div>
                  <div className="hp-item-org">{job.name}</div>
                  <div className="hp-item-dates">{formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}</div>
                </div>
                <div className="hp-item-right">
                  {job.summary && (
                    <div dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div className="hp-section" data-section-id="education">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Education</h2>
          </div>
          <div className="hp-content">
            {education.map((edu, index) => (
              <div key={index} className="hp-item" data-item-id={index}>
                <div className="hp-item-left">
                  <div className="hp-item-role">{edu.studyType} {edu.area && `in ${edu.area}`}</div>
                  <div className="hp-item-org">{edu.institution}</div>
                  <div className="hp-item-dates">{formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}</div>
                </div>
                <div className="hp-item-right">
                  {edu.score && <div>Score: {edu.score}</div>}
                  {edu.courses && edu.courses.length > 0 && (
                    <div>Courses: {edu.courses.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills */}
      {skills && skills.length > 0 && (
        <div className="hp-section" data-section-id="skills">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Skills</h2>
          </div>
          <div className="hp-skills-grid">
            {skills.map((skill, index) => (
              <div key={index} className="hp-skill-category">
                <div className="hp-skill-category-name">{skill.category}</div>
                <div className="hp-skill-list">{skill.skills.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="hp-section" data-section-id="projects">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Projects</h2>
          </div>
          <div className="hp-content">
            {projects.map((project, index) => (
              <div key={index} className="hp-item" data-item-id={index}>
                <div className="hp-item-left">
                  <div className="hp-item-role">{project.name}</div>
                  {project.startDate && (
                    <div className="hp-item-dates">{formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}</div>
                  )}
                  {project.url && (
                    <div className="hp-item-location" style={{ wordBreak: 'break-all' }}>{project.url}</div>
                  )}
                </div>
                <div className="hp-item-right">
                  {project.description && (
                    <div dangerouslySetInnerHTML={{ __html: renderFormattedText(project.description) }} />
                  )}
                  {project.highlights && project.highlights.length > 0 && (
                    <ul>
                      {project.highlights.map((h, i) => <li key={i}>{h}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certificates && certificates.length > 0 && (
        <div className="hp-section" data-section-id="certificates">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Certifications</h2>
          </div>
          <div className="hp-content">
            {certificates.map((cert, index) => (
              <div key={index} className="hp-item" data-item-id={index}>
                <div className="hp-item-left">
                  <div className="hp-item-role">{cert.name}</div>
                  <div className="hp-item-org">{cert.issuer}</div>
                  {cert.date && <div className="hp-item-dates">{cert.date}</div>}
                </div>
                <div className="hp-item-right">
                  {cert.url && <div style={{ wordBreak: 'break-all' }}>{cert.url}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages */}
      {languages && languages.length > 0 && (
        <div className="hp-section" data-section-id="languages">
          <div className="hp-section-header">
            <h2 className="hp-section-title">Languages</h2>
          </div>
          <div className="hp-languages">
            {languages.map((lang, index) => (
              <div key={index} className="hp-language-item">
                <span className="hp-language-name">{lang.language}</span>
                {lang.fluency && <span className="hp-language-level"> – {lang.fluency}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
