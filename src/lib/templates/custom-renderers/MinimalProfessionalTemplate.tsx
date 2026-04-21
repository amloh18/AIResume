'use client';

import React, { useMemo } from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';
import { isHeaderSection } from '@/lib/constants/cv-sections';
import { createSectionIdResolver } from '@/lib/utils/section-id-resolver';

interface MinimalProfessionalTemplateProps {
    cvData: UnifiedCVDataStructure;
    className?: string;
    dateFormat?: DateFormatStyle;
    sectionWrapper?: React.ComponentType<any>;
    AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
    onAddSection?: (sectionType: string) => void;
}

export const MinimalProfessionalTemplate: React.FC<MinimalProfessionalTemplateProps> = ({
    cvData,
    className = '',
    dateFormat = 'MMM_YYYY',
    sectionWrapper: SectionWrapper,
    AddSectionButton,
    onAddSection
}) => {
    const { basics, work, education, skills, projects, certificates, languages, awards } = cvData;

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
        <div className={`minimal-professional-template ${className}`}>
            <style dangerouslySetInnerHTML={{
                __html: `
        .minimal-professional-template {
          font-family: 'Calibri', 'Arial', sans-serif;
          max-width: 100%;
          margin: 0 auto;
          background: white;
          box-sizing: border-box;
          color: #333;
          line-height: 1.5;
          font-size: 11pt;
          padding: 24px 32px;
        }

        /* ====== HEADER SECTION ====== */
        .mp-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .mp-header-left {
          flex: 1;
        }

        .mp-name-row {
          display: flex;
          align-items: baseline;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .mp-name {
          font-size: 22pt;
          font-weight: 700;
          color: #6B21A8;
          margin: 0;
          letter-spacing: 0.5px;
        }

        .mp-title {
          font-size: 14pt;
          font-weight: 400;
          color: #A855F7;
          margin: 0;
        }

        .mp-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          font-size: 10pt;
          color: #4B5563;
        }

        .mp-contact-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .mp-contact-icon {
          color: #6B21A8;
        }

        /* Profile Picture - Round */
        .mp-profile-pic {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
          border: 3px solid #E9D5FF;
        }

        /* ====== SECTION STYLING ====== */
        .mp-section {
          margin-bottom: 20px;
        }

        .mp-section-header {
          background-color: #EDE9FE;
          padding: 6px 16px;
          margin-bottom: 12px;
          text-align: center;
        }

        .mp-section-title {
          font-size: 11pt;
          font-weight: 600;
          text-transform: uppercase;
          color: #6B21A8;
          margin: 0;
          letter-spacing: 0.5px;
        }

        /* Summary */
        .mp-summary-text {
          font-size: 10pt;
          line-height: 1.6;
          color: #374151;
          text-align: justify;
        }

        /* ====== SINGLE COLUMN ITEMS ====== */
        .mp-item {
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid #E5E7EB;
        }

        .mp-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .mp-item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 4px;
        }

        .mp-item-title {
          font-size: 11pt;
          font-weight: 700;
          color: #111;
          margin: 0;
        }

        .mp-item-dates {
          font-size: 9pt;
          color: #6B7280;
          flex-shrink: 0;
          text-align: right;
        }

        .mp-item-subtitle {
          font-size: 10pt;
          color: #6B21A8;
          font-weight: 500;
          margin: 2px 0 6px 0;
        }

        .mp-item-description {
          font-size: 10pt;
          color: #4B5563;
          line-height: 1.5;
          text-align: justify;
        }

        .mp-item-description ul {
          margin: 4px 0 0 0;
          padding-left: 18px;
        }

        .mp-item-description li {
          margin-bottom: 3px;
        }

        /* Skills - Inline */
        .mp-skills-container {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .mp-skill-category {
          margin-bottom: 10px;
        }

        .mp-skill-category-name {
          font-size: 10pt;
          font-weight: 600;
          color: #6B21A8;
          margin-bottom: 4px;
        }

        .mp-skill-list {
          font-size: 10pt;
          color: #4B5563;
          line-height: 1.5;
        }

        /* Languages - Inline */
        .mp-languages-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
        }

        .mp-language-item {
          font-size: 10pt;
        }

        .mp-language-name {
          font-weight: 600;
          color: #111;
        }

        .mp-language-level {
          color: #6B7280;
        }

        /* Awards */
        .mp-award-item {
          margin-bottom: 8px;
        }

        .mp-award-title {
          font-size: 10pt;
          font-weight: 600;
          color: #111;
        }

        .mp-award-awarder {
          font-size: 9pt;
          color: #6B7280;
        }

        @media print {
          .minimal-professional-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            padding: 0.5in;
          }
          
          .mp-section-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />

            {/* ====== HEADER ====== */}
            <Wrapper id="personal" sectionType="personal">
                <div className="mp-header">
                    <div className="mp-header-left">
                        <div className="mp-name-row">
                            <h1 className="mp-name">{basics?.name || 'YOUR NAME'}</h1>
                            <span className="mp-title">{basics?.label || 'Professional Title'}</span>
                        </div>
                        <div className="mp-contact-row">
                            {basics?.email && (
                                <span className="mp-contact-item">
                                    <span className="mp-contact-icon">✉</span>
                                    {basics.email}
                                </span>
                            )}
                            {basics?.phone && (
                                <span className="mp-contact-item">
                                    <span className="mp-contact-icon">☎</span>
                                    {basics.phone}
                                </span>
                            )}
                            {formatLocation() && (
                                <span className="mp-contact-item">
                                    <span className="mp-contact-icon">📍</span>
                                    {formatLocation()}
                                </span>
                            )}
                            {basics?.url && (
                                <span className="mp-contact-item">
                                    <span className="mp-contact-icon">🔗</span>
                                    {basics.url}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Profile Picture - Only show if image exists */}
                    {basics?.image && (
                        <img
                            src={basics.image}
                            alt={basics.name || 'Profile'}
                            className="mp-profile-pic"
                        />
                    )}
                </div>
            </Wrapper>

            {/* ====== SUMMARY ====== */}
            {basics?.summary && (
                <Wrapper id="summary" sectionType="summary">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Profile</h2>
                        </div>
                        <p className="mp-summary-text">{stripHtmlTags(basics.summary)}</p>
                    </div>
                </Wrapper>
            )}

            {/* ====== WORK EXPERIENCE ====== */}
            {work && work.length > 0 && (
                <Wrapper id="work" sectionType="work">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Work Experience</h2>
                        </div>
                        {work.map((job, index) => (
                            <div key={index} className="mp-item" data-item-id={index}>
                                <div className="mp-item-header">
                                    <h3 className="mp-item-title">{job.position || <span className="text-gray-400">Job Title</span>}</h3>
                                    <span className="mp-item-dates">
                                        {formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}
                                    </span>
                                </div>
                                <p className="mp-item-subtitle">{job.name || <span className="text-gray-400">Company Name</span>}</p>
                                {job.summary && (
                                    <div
                                        className="mp-item-description"
                                        dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </Wrapper>
            )}

            {/* ====== EDUCATION ====== */}
            {education && education.length > 0 && (
                <Wrapper id="education" sectionType="education">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Education</h2>
                        </div>
                        {education.map((edu, index) => (
                            <div key={index} className="mp-item" data-item-id={index}>
                                <div className="mp-item-header">
                                    <h3 className="mp-item-title">
                                        {edu.studyType || edu.area ? `${edu.studyType || ''}${edu.area ? ` in ${edu.area}` : ''}` : <span className="text-gray-400">Degree & Major</span>}
                                    </h3>
                                    <span className="mp-item-dates">
                                        {formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}
                                    </span>
                                </div>
                                <p className="mp-item-subtitle">{edu.institution || <span className="text-gray-400">Institution Name</span>}</p>
                                {edu.score && (
                                    <div className="mp-item-description">Score: {edu.score}</div>
                                )}
                            </div>
                        ))}
                    </div>
                </Wrapper>
            )}

            {/* ====== SKILLS ====== */}
            {skills && skills.length > 0 && (
                <Wrapper id="skills" sectionType="skills">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Skills</h2>
                        </div>
                        {skills.map((skillCategory, index) => (
                            <div key={index} className="mp-skill-category">
                                <div className="mp-skill-category-name">{skillCategory.category}</div>
                                <div className="mp-skill-list">
                                    {skillCategory.skills?.join(' • ')}
                                </div>
                            </div>
                        ))}
                    </div>
                </Wrapper>
            )}

            {/* ====== PROJECTS ====== */}
            {projects && projects.length > 0 && (
                <Wrapper id="projects" sectionType="projects">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Projects</h2>
                        </div>
                        {projects.map((project, index) => (
                            <div key={index} className="mp-item" data-item-id={index}>
                                <div className="mp-item-header">
                                    <h3 className="mp-item-title">{project.name || <span className="text-gray-400">Project Name</span>}</h3>
                                    {project.startDate && (
                                        <span className="mp-item-dates">
                                            {formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}
                                        </span>
                                    )}
                                </div>
                                {project.description && (
                                    <div
                                        className="mp-item-description"
                                        dangerouslySetInnerHTML={{ __html: renderFormattedText(project.description) }}
                                    />
                                )}
                                {(Array.isArray(project.highlights) ? project.highlights : Array.isArray((project as any).achievements) ? (project as any).achievements : []).length > 0 && (
                                    <ul style={{ marginTop: '4px', paddingLeft: '16px' }}>
                                        {(Array.isArray(project.highlights) ? project.highlights : Array.isArray((project as any).achievements) ? (project as any).achievements : []).map((h: any, i: number) => (
                                            <li key={i}>{stripHtmlTags(typeof h === 'string' ? h : h?.text || '')}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                </Wrapper>
            )}

            {/* ====== CERTIFICATES ====== */}
            {certificates && certificates.length > 0 && (
                <Wrapper id="certificates" sectionType="certificates">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Certifications</h2>
                        </div>
                        {certificates.map((cert, index) => (
                            <div key={index} className="mp-item" data-item-id={index}>
                                <div className="mp-item-header">
                                    <h3 className="mp-item-title">{cert.name || <span className="text-gray-400">Certificate Name</span>}</h3>
                                    {cert.date && (
                                        <span className="mp-item-dates">{cert.date}</span>
                                    )}
                                </div>
                                <p className="mp-item-subtitle">{cert.issuer || <span className="text-gray-400">Issuer</span>}</p>
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
                </Wrapper>
            )}

            {/* ====== LANGUAGES ====== */}
            {languages && languages.length > 0 && (
                <Wrapper id="languages" sectionType="languages">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Languages</h2>
                        </div>
                        <div className="mp-languages-inline">
                            {languages.map((lang, index) => (
                                <span key={index} className="mp-language-item">
                                    <span className="mp-language-name">{lang.language}</span>
                                    {lang.fluency && (
                                        <span className="mp-language-level"> – {lang.fluency}</span>
                                    )}
                                </span>
                            ))}
                        </div>
                    </div>
                </Wrapper>
            )}

            {/* ====== AWARDS ====== */}
            {awards && awards.length > 0 && (
                <Wrapper id="awards" sectionType="awards">
                    <div className="mp-section">
                        <div className="mp-section-header">
                            <h2 className="mp-section-title">Awards</h2>
                        </div>
                        {awards.map((award, index) => (
                            <div key={index} className="mp-award-item" data-item-id={index}>
                                <span className="mp-award-title">{award.title || <span className="text-gray-400">Award Title</span>}</span>
                                {award.awarder && (
                                    <span className="mp-award-awarder"> – {award.awarder}</span>
                                )}
                                {award.date && (
                                    <span className="mp-item-dates" style={{ marginLeft: '8px' }}>({award.date})</span>
                                )}
                            </div>
                        ))}
                    </div>
                </Wrapper>
            )}
        </div>
    );
};
