'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface ProfessionalMinimalTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
}

export const ProfessionalMinimalTemplate: React.FC<ProfessionalMinimalTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY'
}) => {
  const { basics, work, education, skills, projects, certificates, languages, awards } = cvData;

  // Format location
  const formatLocation = () => {
    const parts = [];
    if (basics?.location?.city) parts.push(basics.location.city);
    if (basics?.location?.region) parts.push(basics.location.region);
    if (basics?.location?.countryCode) parts.push(basics.location.countryCode);
    return parts.join(', ') || '';
  };

  return (
    <div className={`professional-minimal-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .professional-minimal-template {
          font-family: 'Calibri', 'Arial', sans-serif;
          max-width: 100%;
          margin: 0 auto;
          background: white;
          box-sizing: border-box;
          color: #333;
          line-height: 1.3;
          font-size: 9pt;
          padding: 20px 28px;
        }

        /* ====== HEADER ====== */
        .pm-header {
          margin-bottom: 12px;
        }

        .pm-name-row {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 6px;
        }

        .pm-name {
          font-size: 20pt;
          font-weight: 700;
          color: #111;
          margin: 0;
        }

        .pm-title {
          font-size: 11pt;
          font-weight: 400;
          color: #555;
          margin: 0;
        }

        .pm-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 9pt;
          color: #444;
        }

        .pm-contact-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        /* ====== SECTION STYLING ====== */
        .pm-section {
          margin-bottom: 12px;
        }

        .pm-section-title {
          font-size: 10pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          margin: 0 0 6px 0;
          padding-bottom: 3px;
          border-bottom: 1px solid #333;
          letter-spacing: 0.5px;
        }

        /* Profile/Summary */
        .pm-summary-text {
          font-size: 9pt;
          line-height: 1.4;
          color: #333;
          text-align: justify;
        }

        /* ====== TWO COLUMN GRID ====== */
        .pm-two-col-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        
        /* ====== 30/70 SPLIT LAYOUT ====== */
        .pm-split-item {
          display: grid;
          grid-template-columns: 30% 70%;
          gap: 12px;
          margin-bottom: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        
        .pm-split-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .pm-split-left {
          font-size: 9pt;
        }
        
        .pm-split-company {
          font-weight: 700;
          color: #111;
          margin: 0;
        }
        
        .pm-split-position {
          color: #444;
          font-style: italic;
          margin: 2px 0;
        }
        
        .pm-split-dates {
          font-size: 8pt;
          color: #666;
          margin-top: 2px;
        }
        
        .pm-split-right {
          font-size: 9pt;
          color: #333;
          line-height: 1.35;
        }
        
        .pm-split-right ul {
          margin: 0;
          padding-left: 14px;
        }
        
        .pm-split-right li {
          margin-bottom: 2px;
          text-align: justify;
        }

        /* ====== ITEMS ====== */
        .pm-item {
          margin-bottom: 8px;
        }

        .pm-item:last-child {
          margin-bottom: 0;
        }

        .pm-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .pm-item-title {
          font-size: 9pt;
          font-weight: 700;
          color: #111;
          margin: 0;
        }

        .pm-item-dates {
          font-size: 8pt;
          color: #666;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .pm-item-subtitle {
          font-size: 9pt;
          color: #444;
          font-style: italic;
          margin: 1px 0 3px 0;
        }

        .pm-item-description {
          font-size: 9pt;
          color: #333;
          line-height: 1.35;
          text-align: justify;
        }

        .pm-item-description ul {
          margin: 2px 0 0 0;
          padding-left: 14px;
        }

        .pm-item-description li {
          margin-bottom: 1px;
        }

        /* Skills - Compact */
        .pm-skill-category {
          margin-bottom: 4px;
        }

        .pm-skill-category-name {
          font-size: 9pt;
          font-weight: 600;
          color: #111;
          display: inline;
        }

        .pm-skill-list {
          font-size: 9pt;
          color: #444;
          display: inline;
        }

        /* Languages - Inline compact */
        .pm-inline-list {
          font-size: 9pt;
          color: #333;
        }

        /* Awards compact */
        .pm-award-item {
          font-size: 9pt;
          margin-bottom: 3px;
        }

        .pm-award-title {
          font-weight: 600;
          color: #111;
        }

        .pm-award-info {
          color: #666;
        }

        @media print {
          .professional-minimal-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            padding: 0.4in;
          }
        }
      `}} />

      {/* ====== HEADER ====== */}
      <div className="pm-header" data-section-id="personal">
        <div className="pm-name-row">
          <h1 className="pm-name">{basics?.name || 'YOUR NAME'}</h1>
          <span className="pm-title">{basics?.label || 'Professional Title'}</span>
        </div>
        <div className="pm-contact-row">
          {basics?.email && (
            <span className="pm-contact-item">✉ {basics.email}</span>
          )}
          {basics?.phone && (
            <span className="pm-contact-item">☎ {basics.phone}</span>
          )}
          {formatLocation() && (
            <span className="pm-contact-item">📍 {formatLocation()}</span>
          )}
          {basics?.url && (
            <span className="pm-contact-item">🔗 {basics.url}</span>
          )}
          {basics?.profiles?.map((profile, idx) => (
            <span key={idx} className="pm-contact-item">◆ {profile.url || profile.username}</span>
          ))}
        </div>
      </div>

      {/* ====== PROFILE ====== */}
      {basics?.summary && (
        <div className="pm-section" data-section-id="summary">
          <h2 className="pm-section-title">Profile</h2>
          <p className="pm-summary-text">{stripHtmlTags(basics.summary)}</p>
        </div>
      )}

      {/* ====== WORK EXPERIENCE - 30/70 Split ====== */}
      {work && work.length > 0 && (
        <div className="pm-section" data-section-id="work">
          <h2 className="pm-section-title">Work Experience</h2>
          {work.map((job, index) => (
            <div key={index} className="pm-split-item" data-item-id={index}>
              <div className="pm-split-left">
                <p className="pm-split-company">{job.name}</p>
                <p className="pm-split-position">{job.position}</p>
                <p className="pm-split-dates">
                  {formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}
                </p>
              </div>
              <div className="pm-split-right">
                {job.summary && (
                  <div dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== EDUCATION - 30/70 Split ====== */}
      {education && education.length > 0 && (
        <div className="pm-section" data-section-id="education">
          <h2 className="pm-section-title">Education</h2>
          {education.map((edu, index) => (
            <div key={index} className="pm-split-item" data-item-id={index}>
              <div className="pm-split-left">
                <p className="pm-split-company">{edu.institution}</p>
                <p className="pm-split-position">
                  {edu.studyType}{edu.area ? ` in ${edu.area}` : ''}
                </p>
                <p className="pm-split-dates">
                  {formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}
                </p>
              </div>
              <div className="pm-split-right">
                {edu.score && <p>Score: {edu.score}</p>}
                {edu.courses && edu.courses.length > 0 && (
                  <p>Courses: {edu.courses.join(', ')}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====== SKILLS - Two Column ====== */}
      {skills && skills.length > 0 && (
        <div className="pm-section" data-section-id="skills">
          <h2 className="pm-section-title">Skills</h2>
          <div className="pm-two-col-grid">
            {skills.map((skillCategory, index) => (
              <div key={index} className="pm-skill-category">
                <span className="pm-skill-category-name">{skillCategory.category}: </span>
                <span className="pm-skill-list">
                  {skillCategory.skills?.join(', ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ====== PROJECTS - 30/70 Split ====== */}
      {projects && projects.length > 0 && (
        <div className="pm-section" data-section-id="projects">
          <h2 className="pm-section-title">Projects</h2>
          {projects.map((project, index) => (
            <div key={index} className="pm-split-item" data-item-id={index}>
              <div className="pm-split-left">
                <p className="pm-split-company">{project.name}</p>
                {project.startDate && (
                  <p className="pm-split-dates">
                    {formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}
                  </p>
                )}
                {project.url && (
                  <p className="pm-split-dates" style={{ wordBreak: 'break-all' }}>{project.url}</p>
                )}
              </div>
              <div className="pm-split-right">
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
      )}

      {/* ====== CERTIFICATES - Single Column ====== */}
      {certificates && certificates.length > 0 && (
        <div className="pm-section" data-section-id="certificates">
          <h2 className="pm-section-title">Certifications</h2>
          {certificates.map((cert, index) => (
            <div key={index} className="pm-item" data-item-id={index}>
              <div className="pm-item-header">
                <h3 className="pm-item-title">{cert.name}</h3>
                {cert.date && (
                  <span className="pm-item-dates">{cert.date}</span>
                )}
              </div>
              <p className="pm-item-subtitle">{cert.issuer}</p>
            </div>
          ))}
        </div>
      )}

      {/* ====== LANGUAGES - Single Column Inline ====== */}
      {languages && languages.length > 0 && (
        <div className="pm-section" data-section-id="languages">
          <h2 className="pm-section-title">Languages</h2>
          <p className="pm-inline-list">
            {languages.map((lang, index) => (
              <span key={index}>
                <strong>{lang.language}</strong>
                {lang.fluency && ` (${lang.fluency})`}
                {index < languages.length - 1 ? ' • ' : ''}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* ====== AWARDS - Single Column ====== */}
      {awards && awards.length > 0 && (
        <div className="pm-section" data-section-id="awards">
          <h2 className="pm-section-title">Awards</h2>
          {awards.map((award, index) => (
            <div key={index} className="pm-award-item" data-item-id={index}>
              <span className="pm-award-title">{award.title}</span>
              {award.awarder && (
                <span className="pm-award-info"> – {award.awarder}</span>
              )}
              {award.date && (
                <span className="pm-award-info"> ({award.date})</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
