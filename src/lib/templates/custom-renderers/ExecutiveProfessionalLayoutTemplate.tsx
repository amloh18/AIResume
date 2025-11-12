'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { stripHtmlTags } from '@/lib/utils/textFormatting';

interface ExecutiveProfessionalLayoutTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

// Format date to "YYYY/MM" format
const formatDateToYearMonth = (dateString: string | undefined | null): string => {
  if (!dateString) return 'Present';
  const dateLower = dateString.toLowerCase().trim();
  if (dateLower === 'present' || dateLower === '') return 'Present';
  
  // Handle various date formats
  // YYYY-MM-DD or YYYY-MM
  const dateMatch = dateString.match(/(\d{4})-(\d{1,2})/);
  if (dateMatch) {
    const year = dateMatch[1];
    const month = dateMatch[2].padStart(2, '0');
    return `${year}/${month}`;
  }
  
  // If already in YYYY/MM format, return as-is
  if (dateString.match(/^\d{4}\/\d{2}$/)) {
    return dateString;
  }
  
  // Fallback: try to parse as Date
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    }
  } catch (e) {
    // If parsing fails, return original
  }
  
  return dateString;
};

export const ExecutiveProfessionalLayoutTemplate: React.FC<ExecutiveProfessionalLayoutTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills, projects, languages } = cvData;

  return (
    <div className={`executive-professional-layout-template ${className}`}>
      <style jsx>{`
        .executive-professional-layout-template {
          font-family: 'Montserrat', 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.2;
          color: #000000;
          background: #ffffff;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }

        .header {
          text-align: left;
          margin-bottom: 6px;
          padding: 0;
        }

        .name {
          font-size: 22px;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-align: left;
          padding: 0;
          display: inline;
        }

        .title {
          font-size: 13px;
          font-weight: bold;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          text-align: left;
          padding: 0;
          display: inline;
          margin-left: 8px;
        }

        .contact-info {
          display: flex;
          justify-content: flex-start;
          gap: 15px;
          font-size: 10px;
          margin-top: 0;
          margin-bottom: 6px;
          padding: 0;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .contact-dot {
          width: 4px;
          height: 4px;
          background: #000000;
          border-radius: 50%;
        }

        .section {
          margin-bottom: 8px;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
          position: relative;
        }

        .section-title::after {
          display: none;
        }

        .summary-text {
          font-size: 13px;
          line-height: 1.3;
          margin-bottom: 12px;
          text-align: justify;
        }

        .experience-item, .education-item, .project-item {
          margin-bottom: 4px;
        }

        .experience-header, .education-header, .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0;
        }

        .job-title, .degree-title, .project-title {
          font-weight: bold;
          font-size: 14px;
          display: inline;
        }

        .company-name, .institution-name {
          font-size: 13px;
          display: inline;
          margin-left: 0;
        }

        .job-dates, .education-dates, .project-dates {
          font-size: 12px;
          text-align: right;
          color: #666666;
        }

        .job-location, .education-location {
          font-size: 12px;
          margin-top: 2px;
          color: #666666;
        }

        .job-description, .project-description, .education-description {
          margin-top: 0;
          font-size: 12px;
          line-height: 1.2;
          text-align: justify;
        }

        .job-description ul, .project-description ul, .education-description ul {
          margin: 6px 0;
          padding-left: 20px;
        }

        .job-description li, .project-description li, .education-description li {
          margin-bottom: 3px;
        }

        .skills-container {
          font-size: 12px;
          line-height: 1.2;
        }

        .skill-item {
          margin-bottom: 0;
        }

        .skill-category {
          font-weight: bold;
          display: inline;
        }

        .skill-list {
          display: inline;
          margin-left: 5px;
        }

        .languages-list {
          font-size: 12px;
        }

        .languages-list ul {
          margin: 0;
          padding-left: 20px;
        }

        .languages-list li {
          margin-bottom: 4px;
        }

        @media print {
          .executive-professional-layout-template {
            padding: 0;
            margin: 0;
            max-width: none;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1 className="name">{basics?.name || 'DAVID LEE'}</h1>
        <span className="title"> - {basics?.label || 'MARKETING MANAGER'}</span>
        <div className="contact-info">
          {basics?.email && (
            <div className="contact-item">
              <div className="contact-dot"></div>
              <span>{basics.email}</span>
            </div>
          )}
          {basics?.phone && (
            <div className="contact-item">
              <div className="contact-dot"></div>
              <span>{basics.phone}</span>
            </div>
          )}
          {basics?.profiles?.[0]?.url && (
            <div className="contact-item">
              <div className="contact-dot"></div>
              <span>{basics.profiles[0].url}</span>
            </div>
          )}
          {basics?.url && (
            <div className="contact-item">
              <div className="contact-dot"></div>
              <span>{basics.url}</span>
            </div>
          )}
        </div>
      </div>

      {/* Summary Section */}
      {basics?.summary && (
        <div className="section">
          <h2 className="section-title">SUMMARY</h2>
          <div className="summary-text">{stripHtmlTags(basics.summary)}</div>
        </div>
      )}

      {/* Experience Section */}
      {work && work.length > 0 && (
        <div className="section">
          <h2 className="section-title">EXPERIENCE</h2>
          {work.map((job, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <span className="job-title">{job.position}</span>
                  <span className="company-name">- {job.name}</span>
                </div>
                <div className="job-dates">{formatDateToYearMonth(job.startDate)} – {formatDateToYearMonth(job.endDate)}</div>
              </div>
              {job.summary && (
                <div className="job-description">
                  {stripHtmlTags(job.summary)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Education Section */}
      {education && education.length > 0 && (
        <div className="section">
          <h2 className="section-title">EDUCATION</h2>
          {education.map((edu, index) => (
            <div key={index} className="education-item">
              <div className="education-header">
                <div>
                  <span className="degree-title">{edu.studyType} {edu.area && `in ${edu.area}`}</span>
                  <span className="institution-name">- {edu.institution}</span>
                </div>
                <div className="education-dates">{formatDateToYearMonth(edu.startDate)} – {formatDateToYearMonth(edu.endDate)}</div>
              </div>
              {edu.description && (
                <div className="education-description">
                  {stripHtmlTags(edu.description)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills Section */}
      {skills && skills.length > 0 && (
        <div className="section">
          <h2 className="section-title">SKILLS</h2>
          <div className="skills-container">
            {skills
              .filter(skill => skill && skill.skills && Array.isArray(skill.skills) && skill.skills.length > 0)
              .map((skill, index) => (
                <div key={index} className="skill-item">
                  <span className="skill-category">{skill.category}:</span>
                  <span className="skill-list">{skill.skills.join(', ')}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Projects Section */}
      {projects && projects.length > 0 && (
        <div className="section">
          <h2 className="section-title">PROJECTS</h2>
          {projects.map((project, index) => (
            <div key={index} className="project-item">
              <div className="project-header">
                <div>
                  <div className="project-title">{project.name}</div>
                </div>
                <div className="project-dates">{formatDateToYearMonth(project.startDate)} – {formatDateToYearMonth(project.endDate)}</div>
              </div>
              {project.description && (
                <div className="project-description">{stripHtmlTags(project.description)}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Languages Section */}
      {languages && languages.length > 0 && (
        <div className="section">
          <h2 className="section-title">LANGUAGES</h2>
          <div className="languages-list">
            <ul>
              {languages.map((lang, index) => (
                <li key={index}>{lang.language} ({lang.fluency})</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
