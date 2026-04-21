'use client';

import React, { useMemo } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';
import { isHeaderSection } from '@/lib/constants/cv-sections';
import { createSectionIdResolver } from '@/lib/utils/section-id-resolver';

interface OnePagerProfessionalTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
  sectionWrapper?: React.ComponentType<any>;
  AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
  onAddSection?: (sectionType: string) => void;
}

export const OnePagerProfessionalTemplate: React.FC<OnePagerProfessionalTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY',
  sectionWrapper: SectionWrapper,
  AddSectionButton,
  onAddSection
}) => {
  const { basics, work, education, skills, projects, certificates } = cvData;

  // Create a section ID resolver to map section types to actual UUIDs from structure
  const resolveSectionId = useMemo(() => createSectionIdResolver(cvData), [cvData]);

  // Helper to wrap section content with DraggableSection when provided
  // Header sections (personal, contact, summary) should not be draggable
  // IMPORTANT: Resolves sectionType to actual UUID for drag-and-drop compatibility
  const Wrapper = ({ id, sectionType, children }: { id: string; sectionType: string; children: React.ReactNode }) => {
    const isHeader = isHeaderSection(sectionType);
    // Resolve the actual section ID from structure (UUID) for drag-and-drop
    const actualId = resolveSectionId(sectionType);

    if (SectionWrapper) {
      return (
        <SectionWrapper sectionId={actualId} sectionType={sectionType} isLocked={isHeader}>
          {children}
        </SectionWrapper>
      );
    }
    return <div data-section-id={actualId}>{children}</div>;
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
    <div className={`one-pager-professional-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .one-pager-professional-template {
          font-family: 'Calibri', 'Arial', sans-serif;
          max-width: 100%;
          margin: 0 auto;
          background: white;
          box-sizing: border-box;
          color: #333;
          line-height: 1.4;
          font-size: 11pt;
          padding: 24px 32px;
        }

        /* ====== TOP SECTION: Single Column ====== */
        
        /* Header - Name and Title */
        .opp-header {
          text-align: center;
          margin-bottom: 12px;
        }

        .opp-name {
          font-size: 28pt;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 4px 0;
          color: #111;
          letter-spacing: 2px;
        }

        .opp-title {
          font-size: 12pt;
          font-weight: 400;
          color: #4B5563;
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Thin separator line after header */
        .opp-separator {
          height: 1px;
          background-color: #D1D5DB;
          margin: 16px 0;
          width: 100%;
        }

        /* Profile Summary Section */
        .opp-profile-section {
          margin-bottom: 20px;
        }

        .opp-section-title {
          font-size: 12pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
          position: relative;
          display: inline-block;
        }

        .opp-section-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 40px;
          height: 3px;
          background-color: #111;
        }

        .opp-profile-text {
          font-size: 10pt;
          line-height: 1.6;
          color: #374151;
          margin-top: 12px;
        }

        /* ====== MAIN SECTION: Two Columns ====== */
        .opp-main-container {
          display: grid;
          grid-template-columns: 30% 70%;
          gap: 24px;
        }

        /* Left Sidebar */
        .opp-sidebar {
          padding-right: 16px;
        }

        .opp-sidebar-section {
          margin-bottom: 20px;
        }

        .opp-sidebar-title {
          font-size: 11pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
          position: relative;
          display: inline-block;
        }

        .opp-sidebar-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 30px;
          height: 3px;
          background-color: #111;
        }

        .opp-sidebar-content {
          margin-top: 12px;
        }

        /* Contact Info */
        .opp-contact-item {
          font-size: 9pt;
          color: #4B5563;
          margin-bottom: 6px;
          display: flex;
          align-items: flex-start;
          gap: 6px;
        }

        .opp-contact-icon {
          font-weight: 600;
          color: #111;
          flex-shrink: 0;
        }

        .opp-contact-text {
          word-break: break-word;
        }

        /* Education in Sidebar */
        .opp-edu-item {
          margin-bottom: 12px;
        }

        .opp-edu-degree {
          font-size: 10pt;
          font-weight: 600;
          color: #111;
          margin: 0;
        }

        .opp-edu-institution {
          font-size: 9pt;
          color: #4B5563;
          margin: 2px 0;
        }

        .opp-edu-dates {
          font-size: 9pt;
          color: #6B7280;
        }

        /* Skills as Chips */
        .opp-skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .opp-skill-chip {
          background-color: #E5E7EB;
          color: #374151;
          font-size: 8pt;
          padding: 4px 10px;
          border-radius: 12px;
          white-space: nowrap;
        }

        /* Certificates in Sidebar */
        .opp-cert-item {
          margin-bottom: 8px;
        }

        .opp-cert-name {
          font-size: 9pt;
          font-weight: 600;
          color: #111;
          margin: 0;
        }

        .opp-cert-issuer {
          font-size: 8pt;
          color: #6B7280;
          margin: 2px 0 0 0;
        }

        /* Right Content Area */
        .opp-content {
          padding-left: 8px;
        }

        .opp-content-section {
          margin-bottom: 20px;
        }

        .opp-content-title {
          font-size: 12pt;
          font-weight: 700;
          text-transform: uppercase;
          color: #111;
          margin: 0 0 4px 0;
          letter-spacing: 0.5px;
          position: relative;
          display: inline-block;
        }

        .opp-content-title::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 40px;
          height: 3px;
          background-color: #111;
        }

        /* Timeline for Experience/Projects */
        .opp-timeline {
          margin-top: 16px;
          position: relative;
          padding-left: 16px;
        }

        .opp-timeline::before {
          content: '';
          position: absolute;
          left: 0;
          top: 6px;
          bottom: 6px;
          width: 2px;
          background-color: #E5E7EB;
        }

        .opp-timeline-item {
          position: relative;
          margin-bottom: 16px;
          padding-left: 12px;
        }

        .opp-timeline-item::before {
          content: '';
          position: absolute;
          left: -20px;
          top: 6px;
          width: 8px;
          height: 8px;
          background-color: #111;
          border-radius: 50%;
        }

        .opp-timeline-item:last-child {
          margin-bottom: 0;
        }

        .opp-timeline-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 4px;
        }

        .opp-timeline-role {
          font-size: 11pt;
          font-weight: 700;
          color: #111;
          margin: 0;
        }

        .opp-timeline-dates {
          font-size: 9pt;
          color: #6B7280;
          flex-shrink: 0;
        }

        .opp-timeline-org {
          font-size: 10pt;
          color: #374151;
          font-weight: 500;
          margin: 2px 0 8px 0;
        }

        .opp-timeline-description {
          font-size: 9pt;
          color: #4B5563;
          line-height: 1.5;
        }

        .opp-timeline-description ul {
          margin: 0;
          padding-left: 16px;
        }

        .opp-timeline-description li {
          margin-bottom: 3px;
        }

        /* Projects styling */
        .opp-project-name {
          font-size: 10pt;
          font-weight: 700;
          color: #111;
        }

        .opp-project-url {
          font-size: 8pt;
          color: #111;
          word-break: break-all;
        }

        @media print {
          .one-pager-professional-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            padding: 0.5in;
          }
          
          .opp-section-title::after,
          .opp-sidebar-title::after,
          .opp-content-title::after,
          .opp-timeline::before,
          .opp-timeline-item::before,
          .opp-skill-chip {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

      {/* ====== TOP SECTION: Single Column ====== */}

      {/* Header - Name and Title */}
      <Wrapper id="personal" sectionType="personal">
        <div className="opp-header">
          <h1 className="opp-name">{basics?.name || 'YOUR NAME'}</h1>
          <p className="opp-title">{basics?.label || 'Professional Title'}</p>
        </div>
      </Wrapper>

      {/* Thin Separator */}
      <div className="opp-separator"></div>

      {/* Profile Summary */}
      {basics?.summary && (
        <Wrapper id="summary" sectionType="summary">
          <div className="opp-profile-section">
            <h2 className="opp-section-title">Profile</h2>
            <p className="opp-profile-text">{stripHtmlTags(basics.summary)}</p>
          </div>
        </Wrapper>
      )}

      {/* ====== MAIN SECTION: Two Columns ====== */}
      <div className="opp-main-container">

        {/* Left Sidebar (~30%) */}
        <div className="opp-sidebar">

          {/* Contact Information */}
          <Wrapper id="contact" sectionType="contact">
            <div className="opp-sidebar-section">
              <h3 className="opp-sidebar-title">Contact</h3>
              <div className="opp-sidebar-content">
                {basics?.email && (
                  <div className="opp-contact-item">
                    <span className="opp-contact-icon">✉</span>
                    <span className="opp-contact-text">{basics.email}</span>
                  </div>
                )}
                {basics?.phone && (
                  <div className="opp-contact-item">
                    <span className="opp-contact-icon">☎</span>
                    <span className="opp-contact-text">{basics.phone}</span>
                  </div>
                )}
                {formatLocation() && (
                  <div className="opp-contact-item">
                    <span className="opp-contact-icon">📍</span>
                    <span className="opp-contact-text">{formatLocation()}</span>
                  </div>
                )}
                {basics?.url && (
                  <div className="opp-contact-item">
                    <span className="opp-contact-icon">🔗</span>
                    <span className="opp-contact-text">{basics.url}</span>
                  </div>
                )}
                {basics?.profiles?.map((profile, idx) => (
                  <div key={idx} className="opp-contact-item">
                    <span className="opp-contact-icon">◆</span>
                    <span className="opp-contact-text">{profile.url || profile.username}</span>
                  </div>
                ))}
              </div>
            </div>
          </Wrapper>

          {/* Education */}
          {education && education.length > 0 && (
            <Wrapper id="education" sectionType="education">
              <div className="opp-sidebar-section">
                <h3 className="opp-sidebar-title">Education</h3>
                <div className="opp-sidebar-content">
                  {education.map((edu, index) => (
                    <div key={index} className="opp-edu-item" data-item-id={index}>
                      <p className="opp-edu-degree">
                        {edu.studyType || edu.area ? `${edu.studyType || ''}${edu.area ? ` in ${edu.area}` : ''}` : <span className="text-gray-400">Degree & Major</span>}
                      </p>
                      <p className="opp-edu-institution">{edu.institution || <span className="text-gray-400">Institution Name</span>}</p>
                      <p className="opp-edu-dates">
                        {formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </Wrapper>
          )}

          {/* Skills as Chips */}
          {skills && skills.length > 0 && (
            <Wrapper id="skills" sectionType="skills">
              <div className="opp-sidebar-section">
                <h3 className="opp-sidebar-title">Skills</h3>
                <div className="opp-sidebar-content">
                  <div className="opp-skills-container">
                    {skills.flatMap((skillCategory, catIdx) =>
                      skillCategory.skills?.map((skill, skillIdx) => (
                        <span
                          key={`${catIdx}-${skillIdx}`}
                          className="opp-skill-chip"
                        >
                          {skill}
                        </span>
                      )) || []
                    )}
                  </div>
                </div>
              </div>
            </Wrapper>
          )}

          {/* Certificates */}
          {certificates && certificates.length > 0 && (
            <Wrapper id="certificates" sectionType="certificates">
              <div className="opp-sidebar-section">
                <h3 className="opp-sidebar-title">Certifications</h3>
                <div className="opp-sidebar-content">
                  {certificates.map((cert, index) => (
                    <div key={index} className="opp-cert-item" data-item-id={index}>
                      <p className="opp-cert-name">{cert.name || <span className="text-gray-400">Certificate Name</span>}</p>
                      {cert.issuer && (
                        <p className="opp-cert-issuer">{cert.issuer || <span className="text-gray-400">Issuer</span>}</p>
                      )}
                      {(Array.isArray((cert as any).highlights) ? (cert as any).highlights : Array.isArray((cert as any).achievements) ? (cert as any).achievements : []).length > 0 && (
                        <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                          {(Array.isArray((cert as any).highlights) ? (cert as any).highlights : Array.isArray((cert as any).achievements) ? (cert as any).achievements : []).map((h: any, i: number) => (
                            <li key={i}>{stripHtmlTags(typeof h === 'string' ? h : h?.text || '')}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Wrapper>
          )}
        </div>

        {/* Right Content Area (~70%) */}
        <div className="opp-content">

          {/* Experience with Timeline */}
          {work && work.length > 0 && (
            <Wrapper id="work" sectionType="work">
              <div className="opp-content-section">
                <h3 className="opp-content-title">Experience</h3>
                <div className="opp-timeline">
                  {work.map((job, index) => (
                    <div key={index} className="opp-timeline-item" data-item-id={index}>
                      <div className="opp-timeline-header">
                        <h4 className="opp-timeline-role">{job.position || <span className="text-gray-400">Job Title</span>}</h4>
                        <span className="opp-timeline-dates">
                          {formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}
                        </span>
                      </div>
                      <p className="opp-timeline-org">{job.name || <span className="text-gray-400">Company Name</span>}</p>
                      {job.summary && (
                        <div
                          className="opp-timeline-description"
                          dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Wrapper>
          )}

          {/* Projects with Timeline */}
          {projects && projects.length > 0 && (
            <Wrapper id="projects" sectionType="projects">
              <div className="opp-content-section">
                <h3 className="opp-content-title">Projects</h3>
                <div className="opp-timeline">
                  {projects.map((project, index) => (
                    <div key={index} className="opp-timeline-item" data-item-id={index}>
                      <div className="opp-timeline-header">
                        <h4 className="opp-project-name">{project.name || <span className="text-gray-400">Project Name</span>}</h4>
                        {project.startDate && (
                          <span className="opp-timeline-dates">
                            {formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}
                          </span>
                        )}
                      </div>
                      {project.url && (
                        <p className="opp-project-url">{project.url}</p>
                      )}
                      {project.description && (
                        <div
                          className="opp-timeline-description"
                          dangerouslySetInnerHTML={{ __html: renderFormattedText(project.description) }}
                        />
                      )}
                      {project.highlights && project.highlights.length > 0 && (
                        <div className="opp-timeline-description">
                          <ul>
                            {project.highlights.map((h, i) => <li key={i}>{h}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Wrapper>
          )}
        </div>
      </div>
    </div>
  );
};
