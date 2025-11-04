'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface ExecutiveProfessionalLayoutTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

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
          line-height: 1.5;
          color: #000000;
          background: #ffffff;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 40px;
        }

        .header {
          text-align: center;
          margin-bottom: 40px;
        }

        .name {
          font-size: 28px;
          font-weight: bold;
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .title {
          font-size: 16px;
          font-weight: bold;
          margin: 0 0 20px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .contact-info {
          display: flex;
          justify-content: center;
          gap: 15px;
          font-size: 12px;
          margin-bottom: 30px;
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
          margin-bottom: 30px;
        }

        .section-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 0 15px 0;
          letter-spacing: 0.5px;
          position: relative;
        }

        .section-title::after {
          content: '';
          position: absolute;
          bottom: -5px;
          left: 0;
          width: 30px;
          height: 1px;
          background: #000000;
        }

        .summary-text {
          font-size: 13px;
          line-height: 1.6;
          margin-bottom: 20px;
        }

        .experience-item, .education-item, .project-item {
          margin-bottom: 20px;
        }

        .experience-header, .education-header, .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .job-title, .degree-title, .project-title {
          font-weight: bold;
          font-size: 14px;
        }

        .company-name, .institution-name {
          font-size: 13px;
          margin-top: 2px;
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

        .job-description, .project-description {
          margin-top: 8px;
          font-size: 12px;
          line-height: 1.4;
        }

        .job-description ul, .project-description ul {
          margin: 6px 0;
          padding-left: 20px;
        }

        .job-description li, .project-description li {
          margin-bottom: 3px;
        }

        .skills-container {
          font-size: 12px;
          line-height: 1.4;
        }

        .skill-category {
          font-weight: bold;
          margin-bottom: 6px;
        }

        .skill-list {
          margin-bottom: 10px;
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
        <p className="title">{basics?.label || 'MARKETING MANAGER'}</p>
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
          <div className="summary-text">{basics.summary}</div>
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
                  <div className="job-title">{job.position}</div>
                  <div className="company-name">{job.name}</div>
                </div>
                <div className="job-dates">{job.startDate} – {job.endDate || 'Present'}</div>
              </div>
              {job.summary && (
                <div className="job-description">{job.summary}</div>
              )}
              {job.highlights && job.highlights.length > 0 && (
                <div className="job-description">
                  <ul>
                    {job.highlights.map((highlight, highlightIndex) => (
                      <li key={highlightIndex}>{highlight}</li>
                    ))}
                  </ul>
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
                  <div className="degree-title">{edu.studyType} {edu.area && `in ${edu.area}`}</div>
                  <div className="institution-name">{edu.institution}</div>
                </div>
                <div className="education-dates">{edu.startDate} – {edu.endDate || 'Present'}</div>
              </div>
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
                <div key={index}>
                  <div className="skill-category">{skill.category}:</div>
                  <div className="skill-list">{skill.skills.join(', ')}</div>
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
                <div className="project-dates">{project.startDate} – {project.endDate || 'Present'}</div>
              </div>
              {project.description && (
                <div className="project-description">{project.description}</div>
              )}
              {project.highlights && project.highlights.length > 0 && (
                <div className="project-description">
                  <ul>
                    {project.highlights.map((highlight, highlightIndex) => (
                      <li key={highlightIndex}>{highlight}</li>
                    ))}
                  </ul>
                </div>
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
