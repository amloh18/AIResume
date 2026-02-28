'use client';

import React, { useMemo } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { stripHtmlTags, formatDateRangeWithStyle, type DateFormatStyle } from '@/lib/utils/textFormatting';
import { isHeaderSection } from '@/lib/constants/cv-sections';
import { createSectionIdResolver } from '@/lib/utils/section-id-resolver';

interface ElegantTimelineTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
  sectionWrapper?: React.ComponentType<any>;
  AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
  onAddSection?: (sectionType: string) => void;
}

export const ElegantTimelineTemplate: React.FC<ElegantTimelineTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY',
  sectionWrapper: SectionWrapper,
  AddSectionButton,
  onAddSection
}) => {
  const { basics, work, education, skills, projects, awards } = cvData;

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

  return (
    <div className={`elegant-timeline-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .elegant-timeline-template {
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: #374151;
          background: #ffffff;
          max-width: 100%;
          margin: 0;
          margin: 0;
          padding: 32px;
          box-sizing: border-box;
        }
        
        .header-section {
          text-align: center;
          margin-bottom: 40px;
        }
        
        .name-box {
          border: 2px solid #374151;
          padding: 20px;
          margin: 0 auto 20px;
          display: inline-block;
        }
        
        .name {
          font-size: 28px;
          font-weight: bold;
          color: #111827;
          margin: 0;
          padding: 0;
          text-transform: uppercase;
          letter-spacing: 2px;
          display: block;
          line-height: 1.2;
        }
        
        .title {
          font-size: 16px;
          font-weight: 400;
          color: #6B7280;
          margin: 4px 0 0 0;
          padding: 0;
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          line-height: 1.2;
        }
        
        .profile-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #E5E7EB;
          margin: 0 auto 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #9CA3AF;
          border: 3px solid #374151;
          overflow: hidden;
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr 2px 1fr;
          gap: 30px;
          position: relative;
        }
        
        .left-column {
          padding-right: 15px;
          text-align: right;
        }
        
        .right-column {
          padding-left: 15px;
        }
        
        .center-line {
          background: #374151;
          width: 2px;
          position: relative;
        }
        
        .center-line::before {
          content: '';
          position: absolute;
          top: 0;
          left: -4px;
          width: 10px;
          height: 10px;
          background: #374151;
          border-radius: 50%;
        }
        
        .section {
          margin-bottom: 30px;
          position: relative;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 15px;
          color: #374151;
          border-bottom: 1px solid #D1D5DB;
          padding-bottom: 5px;
        }
        
        .contact-info {
          font-size: 13px;
          line-height: 1.6;
        }
        
        .contact-item {
          margin-bottom: 8px;
          display: flex;
          align-items: center;
        }
        
        .left-column .contact-item {
          justify-content: flex-end;
        }
        
        .right-column .contact-item {
          justify-content: flex-start;
        }
        
        .contact-icon {
          width: 14px;
          height: 14px;
          color: #6B7280;
        }
        
        .left-column .contact-icon {
          margin-left: 10px;
        }
        
        .right-column .contact-icon {
          margin-right: 10px;
        }
        
        .education-item {
          margin-bottom: 15px;
        }
        
        .education-header {
          margin-bottom: 5px;
        }
        
        .degree {
          font-size: 14px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 2px;
        }
        
        .university {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 2px;
        }
        
        .education-dates {
          font-size: 12px;
          color: #9CA3AF;
        }
        
        .skills-list {
          font-size: 13px;
          line-height: 1.6;
        }
        
        .skill-category {
          margin-bottom: 8px;
        }
        
        .skill-category-name {
          font-weight: bold;
          color: #374151;
        }
        
        .skill-list {
          color: #6B7280;
        }
        
        .profile-text {
          font-size: 14px;
          line-height: 1.7;
          color: #4B5563;
          margin-bottom: 25px;
        }
        
        .experience-item {
          margin-bottom: 20px;
        }
        
        .experience-header {
          margin-bottom: 8px;
        }
        
        .job-title {
          font-size: 15px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 3px;
        }
        
        .company-info {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 8px;
        }
        
        .company-name {
          font-weight: bold;
        }
        
        .job-dates {
          color: #9CA3AF;
        }
        
        .job-description {
          font-size: 13px;
          line-height: 1.6;
          color: #4B5563;
        }
        
        .job-description ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .job-description li {
          margin-bottom: 4px;
        }
        
        .project-item {
          margin-bottom: 15px;
        }
        
        .project-title {
          font-size: 14px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 3px;
        }
        
        .project-description {
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 5px;
        }
        
        .project-technologies {
          font-size: 11px;
          color: #9CA3AF;
          font-style: italic;
        }
        
        .award-item {
          margin-bottom: 10px;
        }
        
        .award-title {
          font-size: 13px;
          font-weight: bold;
          color: #374151;
          margin-bottom: 2px;
        }
        
        .award-issuer {
          font-size: 12px;
          color: #6B7280;
        }
        
        .award-year {
          font-size: 11px;
          color: #9CA3AF;
        }
        
        /* Page break rules for multi-page CVs */
        .header-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .profile-photo {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .section-title {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .experience-item,
        .education-item,
        .project-item,
        .award-item {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Fix page duplication - allow natural page breaks */
        .main-content {
          page-break-inside: auto;
          break-inside: auto;
        }
        
        .left-column,
        .right-column {
          page-break-inside: auto;
          break-inside: auto;
        }
        
        @media print {
          .elegant-timeline-template {
            padding: 0;
            margin: 0;
            max-width: none;
            background: #ffffff;
          }
          
          .header-section {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          /* Allow natural page breaks to prevent duplication */
          .main-content {
            page-break-inside: auto;
            break-inside: auto;
          }
          
          .left-column,
          .right-column {
            page-break-inside: auto;
            break-inside: auto;
          }
        }
      `}} />

      {/* Header Section */}
      <div className="header-section" data-section-id="personal">
        <div className="name-box">
          <div className="name">{basics?.name || 'CHLOE WINEHOUSE'}</div>
          <div className="title">{basics?.label || 'PROFESSIONAL TITLE'}</div>
        </div>
        {basics?.image && (
          <div className="profile-photo">
            <img
              src={basics.image}
              alt={basics.name || 'Profile'}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
          {/* Profile Section */}
          {basics?.summary && (
            <div className="section" data-section-id="summary">
              <div className="section-title">Profile</div>
              <div className="profile-text">{stripHtmlTags(basics.summary)}</div>
            </div>
          )}

          {/* Education Section */}
          {education && education.length > 0 && (
            <div className="section" data-section-id="education">
              <div className="section-title">Education</div>
              {education.map((edu, index) => (
                <div key={index} className="education-item" data-item-id={index}>
                  <div className="education-header">
                    <div className="degree">{edu.studyType} {edu.area && `in ${edu.area}`}</div>
                    <div className="university">{edu.institution}</div>
                    <div className="education-dates">{formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}


          {/* Projects Section */}
          {projects && projects.length > 0 && (
            <div className="section" data-section-id="projects">
              <div className="section-title">Projects</div>
              {projects.map((project, index) => (
                <div key={index} className="project-item" data-item-id={index}>
                  <div className="project-title">{project.name}</div>
                  {project.description && (
                    <div className="project-description">{stripHtmlTags(project.description)}</div>
                  )}
                  {project.keywords && (
                    <div className="project-technologies">
                      Technologies: {project.keywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Awards Section */}
          {awards && awards.length > 0 && (
            <div className="section" data-section-id="awards">
              <div className="section-title">Awards</div>
              {awards.map((award, index) => (
                <div key={index} className="award-item" data-item-id={index}>
                  <div className="award-title">{award.title}</div>
                  <div className="award-issuer">{award.awarder}</div>
                  <div className="award-year">{award.date}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Center Line */}
        <div className="center-line"></div>

        {/* Right Column */}
        <div className="right-column">
          {/* Contact Section */}
          <div className="section" data-section-id="personal">
            <div className="section-title">Contact</div>
            <div className="contact-info">
              {basics?.phone && (
                <div className="contact-item">
                  <svg className="contact-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  {basics.phone}
                </div>
              )}
              {basics?.email && (
                <div className="contact-item">
                  <svg className="contact-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  {basics.email}
                </div>
              )}
              {basics?.location?.city && (
                <div className="contact-item">
                  <svg className="contact-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {basics.location.city}
                </div>
              )}
              {basics?.profiles?.[0]?.url && (
                <div className="contact-item">
                  <svg className="contact-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  {basics.profiles[0].username}
                </div>
              )}
            </div>
          </div>

          {/* Skills Section */}
          {skills && skills.length > 0 && (
            <div className="section" data-section-id="skills">
              <div className="section-title">Skills</div>
              <div className="skills-list">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-category">
                    <div className="skill-category-name">{skill.category}</div>
                    <div className="skill-list">
                      {skill.skills.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Experience Section */}
          {work && work.length > 0 && (
            <div className="section" data-section-id="work">
              <div className="section-title">Work Experience</div>
              {work.map((job, index) => (
                <div key={index} className="experience-item" data-item-id={index}>
                  <div className="experience-header">
                    <div className="job-title">{job.position}</div>
                    <div className="company-info">
                      <span className="company-name">{job.name}</span> | <span className="job-dates">{formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}</span>
                    </div>
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
        </div>
      </div>
    </div>
  );
};
