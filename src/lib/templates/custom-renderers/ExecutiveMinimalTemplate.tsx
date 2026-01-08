'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface ExecutiveMinimalTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
}

export const ExecutiveMinimalTemplate: React.FC<ExecutiveMinimalTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY'
}) => {
  const { basics, work, education, skills, certificates, languages, interests } = cvData;

  // Flatten skills for display
  const allSkills = skills?.reduce((acc: string[], skill) => {
    if (skill.skills && Array.isArray(skill.skills)) {
      return [...acc, ...skill.skills];
    }
    return acc;
  }, []) || [];

  return (
    <div className={`executive-minimal-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

        .executive-minimal-template {
          font-family: 'Inter', sans-serif;
          color: #333;
          line-height: 1.5;
          max-width: 100%;
          margin: 0;
          padding: 40px;
          background: white;
          font-size: 14px;
        }

        .header {
          margin-bottom: 1.5rem;
        }

        .name {
          font-family: 'Caveat', cursive;
          font-size: 2.5rem;
          color: #000;
          margin: 0;
          line-height: 1.2;
        }

        .title {
          font-size: 1rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
          letter-spacing: 2px;
          margin-top: 0.25rem;
        }

        .contact-info {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          margin-top: 0.75rem;
          font-size: 0.9rem;
          color: #555;
        }

        .contact-item {
          display: flex;
          align-items: center;
        }

        .section {
          margin-bottom: 1.5rem;
        }

        .section-title {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          color: #000;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 1px;
          letter-spacing: 1px;
          margin-bottom: 1rem;
          padding-bottom: 5px;
          border-bottom: 1px solid #000;
          display: inline-block;
          min-width: 50px;
        }

        .summary-text {
          color: #444;
          line-height: 1.6;
        }

        /* 30/70 Split Layout */
        .split-row {
          display: grid;
          grid-template-columns: 25% 75%;
          gap: 1.5rem;
          margin-bottom: 1.25rem;
          page-break-inside: avoid;
        }

        .split-left {
          text-align: left;
        }

        .split-right {
          text-align: left;
        }

        .company-name {
          font-weight: 700;
          font-size: 1rem;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .job-title {
          font-weight: 500;
          color: #333;
          margin-bottom: 0.25rem;
        }

        .date-range {
          font-size: 0.85rem;
          color: #666;
          font-style: italic;
        }

        .description ul {
          margin: 0;
          padding-left: 1.2rem;
        }

        .description li {
          margin-bottom: 0.5rem;
          color: #444;
        }

        /* Languages Box Style */
        .language-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .language-box {
          border: 1px solid #000;
          padding: 0.5rem 1rem;
          font-weight: 500;
          text-transform: uppercase;
          font-size: 0.85rem;
        }

        /* Skills Dot Separated */
        .skills-container {
          line-height: 1.8;
          color: #444;
        }

        .skill-item {
          display: inline-block;
        }

        .skill-separator {
          margin: 0 0.5rem;
          color: #999;
          font-weight: bold;
        }

        @media print {
          .executive-minimal-template {
            padding: 0;
          }
          .section {
            page-break-inside: avoid;
          }
        }
      `}} />

      {/* Header */}
      <div className="header" data-section-id="personal">
        {basics?.name && <h1 className="name">{basics.name}</h1>}
        {basics?.label && <div className="title">{basics.label}</div>}

        <div className="contact-info">
          {basics?.email && <span className="contact-item">{basics.email}</span>}
          {basics?.phone && <span className="contact-item">{basics.phone}</span>}
          {basics?.location?.city && <span className="contact-item">{basics.location.city}</span>}
          {/* Add more contacts if needed */}
        </div>
      </div>

      {/* Profile / Summary */}
      {basics?.summary && (
        <div className="section" data-section-id="summary">
          <div className="section-title">Profile</div>
          <div className="summary-text">{stripHtmlTags(basics.summary)}</div>
        </div>
      )}

      {/* Professional Experience - 30/70 SPLIT */}
      {work && work.length > 0 && (
        <div className="section" data-section-id="work">
          <div className="section-title">Professional Experience</div>
          {work.map((job, index) => (
            <div key={index} className="split-row" data-item-id={index}>
              <div className="split-left">
                <div className="company-name">{job.name}</div>
                <div className="job-title">{job.position}</div>
                <div className="date-range">
                  {formatDateRangeWithStyle(job.startDate || '', job.endDate || '', dateFormat)}
                </div>
              </div>
              <div className="split-right description">
                <div dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary || '') }} />
                {job.highlights && job.highlights.length > 0 && (
                  <ul>
                    {job.highlights.map((highlight, hIndex) => (
                      <li key={hIndex}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Education - Single Column Layout */}
      {education && education.length > 0 && (
        <div className="section" data-section-id="education">
          <div className="section-title">Education</div>
          {education.map((edu, index) => (
            <div key={index} style={{ marginBottom: '1rem' }} data-item-id={index}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="company-name">{edu.institution}</div>
                <div className="date-range">
                  {formatDateRangeWithStyle(edu.startDate || '', edu.endDate || '', dateFormat)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div className="job-title" style={{ fontWeight: 400 }}>{edu.studyType} {edu.area && `in ${edu.area}`}</div>
                {edu.score && <div style={{ fontSize: '0.85rem', color: '#666' }}>GPA: {edu.score}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Skills - Dot Separated */}
      {allSkills.length > 0 && (
        <div className="section" data-section-id="skills">
          <div className="section-title">Skills</div>
          <div className="skills-container">
            {allSkills.map((skill, index) => (
              <span key={index} className="skill-item">
                {stripHtmlTags(skill)}
                {index < allSkills.length - 1 && <span className="skill-separator">•</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Languages - Boxed */}
      {languages && languages.length > 0 && (
        <div className="section" data-section-id="languages">
          <div className="section-title">Languages</div>
          <div className="language-grid">
            {languages.map((lang, index) => (
              <div key={index} className="language-box">
                {lang.language}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates - Simple List */}
      {certificates && certificates.length > 0 && (
        <div className="section" data-section-id="certificates">
          <div className="section-title">Certificates</div>
          {certificates.map((cert, index) => (
            <div key={index} style={{ marginBottom: '1rem' }} data-item-id={index}>
              <div className="company-name">{cert.name}</div>
              <div className="date-range">{cert.issuer} | {cert.date}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
