'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface ExecutiveStandardTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
  sectionWrapper?: React.ComponentType<any>;
  AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
  onAddSection?: (sectionType: string) => void;
}

export const ExecutiveStandardTemplate: React.FC<ExecutiveStandardTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY',
  sectionWrapper: SectionWrapper,
  AddSectionButton,
  onAddSection
}) => {
  const { basics, work, education, skills, projects, languages, certificates, awards, volunteer, publications, interests, references } = cvData;

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

  return (
    <div className={`executive-standard-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .executive-standard-template {
          font-family: 'Times New Roman', serif;
          max-width: 100%;
          margin: 0 auto;
          padding: 32px;
          background: white;
          box-sizing: border-box;
          color: #000;
          line-height: 1.4;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .name {
          font-family: 'Arial', sans-serif;
          font-size: 2.2rem;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 0.5rem 0;
          color: #000;
        }

        .title {
          font-family: 'Arial', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 1rem 0;
        }

        .contact-info {
          font-family: 'Arial', sans-serif;
          font-size: 0.9rem;
          color: #374151;
          margin-bottom: 1rem;
        }

        .contact-separator {
          margin: 0 0.5rem;
          color: #6B7280;
        }

        .divider {
          height: 1px;
          background: #000;
          margin: 1.5rem 0;
        }

        .section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-family: 'Arial', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #000;
        }

        .summary-text {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #374151;
        }

        .experience-item, .education-item, .certification-item {
          margin-bottom: 1.5rem;
        }

        .experience-header, .education-header, .certification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .job-title, .degree-title, .certification-title {
          font-weight: 700;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .company-name, .institution-name, .certification-issuer {
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .location {
          font-size: 0.9rem;
          color: #6B7280;
        }

        .dates {
          font-size: 0.9rem;
          color: #6B7280;
          text-align: right;
        }

        .experience-description {
          margin-top: 0.5rem;
        }

        .bullet-point {
          margin: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
          font-size: 0.9rem;
          color: #374151;
        }

        .bullet-point::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #000;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .skills-category {
          margin-bottom: 1rem;
        }

        .skills-category-title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #000;
          margin-bottom: 0.5rem;
        }

        .skills-list {
          font-size: 0.85rem;
          color: #374151;
          line-height: 1.4;
        }

        .certification-year {
          font-size: 0.9rem;
          color: #6B7280;
          text-align: right;
        }

        @media print {
          .executive-standard-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}} />

      {/* Header */}
      <div className="header" data-section-id="personal">
        {basics?.name && <h1 className="name">{basics.name}</h1>}
        {basics?.label && <p className="title">{basics.label}</p>}
        <div className="contact-info">
          {(() => {
            const items: string[] = [];
            // Location (city, region, country)
            const locationParts = [
              basics?.location?.city,
              basics?.location?.region,
              basics?.location?.countryCode
            ].filter(Boolean);
            if (locationParts.length > 0) items.push(locationParts.join(', '));
            // Phone
            if (basics?.phone) items.push(basics.phone);
            // Email
            if (basics?.email) items.push(basics.email);
            // LinkedIn or Portfolio URL
            if (basics?.url) {
              items.push(basics.url);
            } else if (basics?.profiles?.[0]?.url) {
              items.push(basics.profiles[0].url);
            }
            return items.map((item, i) => (
              <span key={i}>
                {i > 0 && <span className="contact-separator">|</span>}
                {item}
              </span>
            ));
          })()}
        </div>
      </div>

      <div className="divider"></div>

      {/* Summary */}
      {basics?.summary && (
        <div className="section" data-section-id="summary">
          <h2 className="section-title">Summary</h2>
          <p className="summary-text">
            {stripHtmlTags(basics.summary)}
          </p>
        </div>
      )}

      {/* Experience */}
      <div className="section" data-section-id="work">
        <h2 className="section-title">Experience</h2>
        {work?.map((job, index) => (
          <div key={index} className="experience-item" data-item-id={index}>
            <div className="experience-header">
              <div>
                <div className="job-title">{job.position}</div>
                <div className="company-name">{job.name}</div>
              </div>
              <div className="dates">{formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}</div>
            </div>
            <div className="experience-description">
              {job.summary && (
                <div
                  className="bullet-point"
                  dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Education */}
      <div className="section" data-section-id="education">
        <h2 className="section-title">Education</h2>
        {education?.map((edu, index) => (
          <div key={index} className="education-item" data-item-id={index}>
            <div className="education-header">
              <div>
                <div className="degree-title">{edu.studyType} {edu.area}</div>
                <div className="institution-name">{edu.institution}</div>
                {edu.score && <div style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '0.25rem' }}>Score: {edu.score}</div>}
              </div>
              <div className="dates">{formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="section" data-section-id="skills">
        <h2 className="section-title">Skills</h2>
        <div className="skills-grid">
          {skills && skills.length > 0 ? (
            skills.map((skill, index) => (
              <div key={index} className="skills-category">
                <div className="skills-category-title">{skill.category}</div>
                <div className="skills-list">
                  {skill.skills.join(', ')}
                </div>
              </div>
            ))
          ) : (
            <div className="skills-category">
              <div className="skills-category-title">Professional Skills</div>
              <div className="skills-list">Add your skills to see them here</div>
            </div>
          )}
        </div>
      </div>

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div className="section" data-section-id="projects">
          <h2 className="section-title">Projects</h2>
          {projects.map((project, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{project.name}</div>
                </div>
                {project.startDate && <div className="dates">{formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}</div>}
              </div>
              {project.description && <div className="bullet-point">{stripHtmlTags(project.description)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Languages */}
      {languages && languages.length > 0 && (
        <div className="section" data-section-id="languages">
          <h2 className="section-title">Languages</h2>
          <div className="skills-grid">
            {languages.map((lang, index) => (
              <div key={index} className="skills-category">
                <div className="skills-category-title">{lang.language}</div>
                <div className="skills-list">{lang.fluency}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certificates */}
      {certificates && certificates.length > 0 && (
        <div className="section" data-section-id="certificates">
          <h2 className="section-title">Certifications</h2>
          {certificates.map((cert, index) => (
            <div key={index} className="certification-item">
              <div className="certification-header">
                <div>
                  <div className="certification-title">{cert.name}</div>
                  <div className="certification-issuer">{cert.issuer}</div>
                </div>
                <div className="certification-year">{cert.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Awards */}
      {awards && awards.length > 0 && (
        <div className="section" data-section-id="awards">
          <h2 className="section-title">Awards</h2>
          {awards.map((award, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{award.title}</div>
                  <div className="company-name">{award.awarder}</div>
                </div>
                <div className="dates">{award.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Volunteer */}
      {volunteer && volunteer.length > 0 && (
        <div className="section" data-section-id="volunteer">
          <h2 className="section-title">Volunteer Experience</h2>
          {volunteer.map((vol, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{vol.position}</div>
                  <div className="company-name">{vol.organization}</div>
                </div>
                <div className="dates">{formatDateRangeWithStyle(vol.startDate, vol.endDate, dateFormat)}</div>
              </div>
              {vol.summary && <div className="bullet-point">{stripHtmlTags(vol.summary)}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Publications */}
      {publications && publications.length > 0 && (
        <div className="section" data-section-id="publications">
          <h2 className="section-title">Publications</h2>
          {publications.map((pub, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{pub.name}</div>
                  <div className="company-name">{pub.publisher}</div>
                </div>
                <div className="dates">{pub.releaseDate}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interests */}
      {interests && interests.length > 0 && (
        <div className="section" data-section-id="interests">
          <h2 className="section-title">Interests</h2>
          <div className="skills-grid">
            {interests.map((interest, index) => (
              <div key={index} className="skills-category">
                <div className="skills-category-title">{interest.name}</div>
                <div className="skills-list">{interest.keywords?.join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* References */}
      {references && references.length > 0 && (
        <div className="section" data-section-id="references">
          <h2 className="section-title">References</h2>
          {references.map((ref, index) => (
            <div key={index} className="experience-item">
              <div className="job-title">{ref.name}</div>
              {ref.reference && <div className="summary-text" style={{ fontStyle: 'italic' }}>"{ref.reference}"</div>}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};
