'use client';

import React from 'react';
import { UnifiedCVDataStructure, CVSectionStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';
import { isHeaderSection } from '@/lib/constants/cv-sections';

interface TechProBlueTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
  sectionWrapper?: React.ComponentType<any>;
  AddSectionButton?: React.ComponentType<{ onClick: () => void }>;
  onAddSection?: (sectionType: string) => void;
}

export const TechProBlueTemplate: React.FC<TechProBlueTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY',
  sectionWrapper: SectionWrapper,
  AddSectionButton,
  onAddSection
}) => {
  const { basics, work, education, skills, projects, languages, certificates, awards, volunteer, publications, interests, references } = cvData;

  // Organize sections by column
  const sidebarSectionTypes = ['personal', 'personal_header', 'skills', 'languages', 'contact'];

  // Default structure if not present
  const defaultStructure: CVSectionStructure[] = [
    { id: 'personal', type: 'personal', visible: true, column: 'sidebar' },
    { id: 'skills', type: 'skills', visible: true, column: 'sidebar' },
    { id: 'languages', type: 'languages', visible: true, column: 'sidebar' },
    { id: 'summary', type: 'summary', visible: true, column: 'main' },
    { id: 'work', type: 'work', visible: true, column: 'main' },
    { id: 'education', type: 'education', visible: true, column: 'main' },
    { id: 'projects', type: 'projects', visible: true, column: 'main' },
    { id: 'certificates', type: 'certificates', visible: true, column: 'main' },
    { id: 'awards', type: 'awards', visible: true, column: 'main' },
    { id: 'volunteer', type: 'volunteer', visible: true, column: 'main' },
    { id: 'publications', type: 'publications', visible: true, column: 'main' },
    { id: 'interests', type: 'interests', visible: true, column: 'main' },
    { id: 'references', type: 'references', visible: true, column: 'main' }
  ];

  const sections = cvData.structure?.sections?.length ? cvData.structure.sections : defaultStructure;

  // Filter sections by column
  const sidebarSections = sections.filter(s => {
    if (s.visible === false) return false;
    if (s.column === 'sidebar') return true;
    if (s.column === 'main') return false;
    return sidebarSectionTypes.includes(s.type); // Fallback for legacy data
  });

  const mainSections = sections.filter(s => {
    if (s.visible === false) return false;
    if (s.column === 'main') return true;
    if (s.column === 'sidebar') return false;
    return !sidebarSectionTypes.includes(s.type); // Fallback for legacy data
  });


  const renderSectionContent = (section: CVSectionStructure) => {
    switch (section.type) {
      case 'personal':
      case 'personal_header':
        return (
          <>
            {/* Header */}
            <div className="header">
              {basics?.name && <h1 className="name">{basics.name}</h1>}
              {basics?.label && <p className="title">{basics.label}</p>}
            </div>

            <div className="divider"></div>

            {/* Profile Picture */}
            {basics?.image && (
              <img
                src={basics.image}
                alt={basics.name || 'Profile'}
                className="profile-picture"
              />
            )}

            {/* Contact */}
            <div>
              <h3 className="section-title">Contact</h3>
              {basics?.phone && (
                <div className="contact-item">
                  <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                  </svg>
                  <span>{basics.phone}</span>
                </div>
              )}
              {basics?.email && (
                <div className="contact-item">
                  <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                  </svg>
                  <span>{basics.email}</span>
                </div>
              )}
              {(basics?.location?.city || basics?.location?.region) && (
                <div className="contact-item">
                  <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                  </svg>
                  <span>{[basics.location.city, basics.location.region].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {basics?.profiles?.[0]?.url && (
                <div className="contact-item">
                  <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  <span>{basics.profiles[0].url}</span>
                </div>
              )}
              {basics?.url && (
                <div className="contact-item">
                  <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  <span>{basics.url}</span>
                </div>
              )}
            </div>

            <div className="divider"></div>
          </>
        );

      case 'skills':
        return (
          <>
            <h3 className="section-title">Skills</h3>
            {skills && skills.length > 0 ? (
              skills.map((skill, index) => (
                <div key={index} className="skills-category" data-item-id={index}>
                  <div className="skills-category-title">{skill.category}</div>
                  <div className="skills-list">
                    {skill.skills.join(', ')}
                  </div>
                </div>
              ))
            ) : (
              <div className="skills-category placeholder-item">
                <div className="skills-category-title placeholder-text">Technical Skills</div>
                <div className="skills-list placeholder-text">Add your skills to see them here</div>
              </div>
            )}
          </>
        );

      case 'languages':
        // Only render if languages exist, matching original behavior
        if (!languages || languages.length === 0) return null;
        return (
          <>
            <div className="divider"></div>
            <h3 className="section-title">Languages</h3>
            {languages.map((lang, index) => (
              <div key={index} className="skills-category">
                <div className="skills-category-title">{lang.language}</div>
                <div className="skills-list">{lang.fluency}</div>
              </div>
            ))}
          </>
        );

      case 'summary':
        if (!basics?.summary) return null;
        return (
          <>
            <h3 className="section-title">Summary</h3>
            <div className="summary" dangerouslySetInnerHTML={{ __html: renderFormattedText(basics.summary) }} />
            <div className="divider"></div>
          </>
        );

      case 'work':
        if (!work || work.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Experience</h3>
            {work.map((job, index) => (
              <div key={index} className="experience-item" data-item-id={index}>
                <div className="experience-header">
                  <div className="job-title-company">
                    <span className="job-title">{job.position || <span className="text-gray-400">Job Title</span>}</span>
                    <span className="separator"> at </span>
                    {job.url ? (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="company-name">{job.name || <span className="text-gray-400">Company Name</span>}</a>
                    ) : (
                      <span className="company-name">{job.name || <span className="text-gray-400">Company Name</span>}</span>
                    )}
                  </div>
                  <div className="date-range">
                    {formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}
                  </div>
                </div>

                {job.summary && (
                  <div className="job-description" dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }} />
                )}

                {job.highlights && job.highlights.length > 0 && (
                  <ul className="job-highlights">
                    {job.highlights.map((highlight, i) => (
                      <li key={i}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'education':
        if (!education || education.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Education</h3>
            {education.map((edu, index) => (
              <div key={index} className="education-item" data-item-id={index}>
                <div className="education-header">
                  <div className="msg-row">
                    <div className="school-degree">
                      <span className="school-name">{edu.institution || <span className="text-gray-400">Institution Name</span>}</span>
                      <span className="separator">, </span>
                      <span className="degree">{edu.studyType || edu.area ? `${edu.studyType || ''} ${edu.area || ''}`.trim() : <span className="text-gray-400">Degree & Major</span>}</span>
                    </div>
                  </div>
                  <div className="date-range">
                    {formatDateRangeWithStyle(edu.startDate, edu.endDate, dateFormat)}
                  </div>
                </div>
                {edu.score && <div className="gpa">GPA: {edu.score}</div>}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'projects':
        if (!projects || projects.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Projects</h3>
            {projects.map((project, index) => (
              <div key={index} className="project-item" data-item-id={index}>
                <div className="project-header">
                  <div className="project-name-link">
                    <span className="project-name">{project.name || <span className="text-gray-400">Project Name</span>}</span>
                    {project.url && (
                      <a href={project.url} className="project-link" target="_blank" rel="noopener noreferrer">
                        view project
                      </a>
                    )}
                  </div>
                  <div className="date-range">
                    {formatDateRangeWithStyle(project.startDate, project.endDate, dateFormat)}
                  </div>
                </div>
                {project.description && (
                  <div className="project-description" dangerouslySetInnerHTML={{ __html: renderFormattedText(project.description) }} />
                )}
                {(Array.isArray(project.highlights) ? project.highlights : Array.isArray((project as any).achievements) ? (project as any).achievements : []).map((h: any, i: number) => (
                  <div key={i} className="bullet-point">{stripHtmlTags(typeof h === 'string' ? h : h?.text || '')}</div>
                ))}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'certificates':
        if (!certificates || certificates.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Certificates</h3>
            {certificates.map((cert, index) => (
              <div key={index} className="certificate-item" data-item-id={index}>
                <div className="certificate-header">
                  <span className="certificate-name">{cert.name || <span className="text-gray-400">Certificate Name</span>}</span>
                  <span className="date-range">{cert.date}</span>
                </div>
                <div className="certificate-issuer">{cert.issuer || <span className="text-gray-400">Issuer</span>}</div>
                {(Array.isArray((cert as any).highlights) ? (cert as any).highlights : Array.isArray((cert as any).achievements) ? (cert as any).achievements : []).map((h: any, i: number) => (
                  <div key={i} className="bullet-point">{stripHtmlTags(typeof h === 'string' ? h : h?.text || '')}</div>
                ))}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'awards':
        if (!awards || awards.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Awards</h3>
            {awards.map((award, index) => (
              <div key={index} className="award-item" data-item-id={index}>
                <div className="award-header">
                  <span className="award-title">{award.title || <span className="text-gray-400">Award Title</span>}</span>
                  <span className="date-range">{award.date}</span>
                </div>
                <div className="award-awarder">{award.awarder || <span className="text-gray-400">Awarder</span>}</div>
                <div className="award-summary">{award.summary}</div>
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'volunteer':
        if (!volunteer || volunteer.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Volunteer</h3>
            {volunteer.map((vol, index) => (
              <div key={index} className="volunteer-item" data-item-id={index}>
                <div className="volunteer-header">
                  <div className="organization-role">
                    <span className="role">{vol.position}</span>
                    <span className="separator"> at </span>
                    <span className="organization">{vol.organization}</span>
                  </div>
                  <div className="date-range">
                    {formatDateRangeWithStyle(vol.startDate, vol.endDate, dateFormat)}
                  </div>
                </div>
                <div className="volunteer-summary" dangerouslySetInnerHTML={{ __html: renderFormattedText(vol.summary) }} />
                {vol.highlights && vol.highlights.length > 0 && (
                  <ul className="volunteer-highlights">
                    {vol.highlights.map((highlight, i) => (
                      <li key={i}>{highlight}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'publications':
        if (!publications || publications.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Publications</h3>
            {publications.map((pub, index) => (
              <div key={index} className="publication-item" data-item-id={index}>
                <div className="publication-header">
                  <div className="pub-name-link">
                    <span className="pub-name">{pub.name || <span className="text-gray-400">Publication Title</span>}</span>
                    {pub.url && (
                      <a href={pub.url} className="pub-link" target="_blank" rel="noopener noreferrer">
                        view publication
                      </a>
                    )}
                  </div>
                  <div className="date-range">{pub.releaseDate}</div>
                </div>
                <div className="pub-publisher">{pub.publisher || <span className="text-gray-400">Publisher</span>}</div>
                <div className="pub-summary">{pub.summary}</div>
                {(Array.isArray((pub as any).highlights) ? (pub as any).highlights : Array.isArray((pub as any).achievements) ? (pub as any).achievements : []).map((h: any, i: number) => (
                  <div key={i} className="bullet-point">{stripHtmlTags(typeof h === 'string' ? h : h?.text || '')}</div>
                ))}
              </div>
            ))}
            <div className="divider"></div>
          </>
        );

      case 'interests':
        if (!interests || interests.length === 0) return null;
        return (
          <>
            <h3 className="section-title">Interests</h3>
            <div className="interests-container">
              {interests.map((interest, index) => (
                <div key={index} className="interest-item" data-item-id={index}>
                  <span className="interest-name">{interest.name}</span>
                  {interest.keywords && interest.keywords.length > 0 && (
                    <span className="interest-keywords"> ({interest.keywords.join(', ')})</span>
                  )}
                </div>
              ))}
            </div>
            <div className="divider"></div>
          </>
        );

      case 'references':
        if (!references || references.length === 0) return null;
        return (
          <>
            <h3 className="section-title">References</h3>
            <div className="references-container">
              {references.map((ref, index) => (
                <div key={index} className="reference-item" data-item-id={index}>
                  <div className="reference-name">{ref.name}</div>
                  <div className="reference-details" dangerouslySetInnerHTML={{ __html: renderFormattedText(ref.reference) }} />
                </div>
              ))}
            </div>
            <div className="divider"></div>
          </>
        );

      default:
        // Generic fallback for custom sections?
        return null;



    }
  };


  return (
    <div className={`tech-pro-blue-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .tech-pro-blue-template {
          font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          width: 100% !important;
          height: auto !important;
          margin: 0 !important;
          padding: 0 !important;
          background: white;
          color: #000;
          line-height: 1.4;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 0;
          box-sizing: border-box;
          min-height: 100%;
          position: relative;
          overflow: visible !important;
        }

        .tech-pro-blue-template::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: 33.3333%;
          background: #2C3E50;
          z-index: 0;
          min-height: 100%;
        }

        .tech-pro-blue-template .sidebar {
          background: #2C3E50;
          color: white !important;
          padding: 1.5rem;
          border-radius: 0;
          overflow-y: visible;
          box-sizing: border-box;
          position: relative;
          z-index: 1;
        }

        .main-content {
          padding: 1.5rem;
          box-sizing: border-box;
          background: white;
          position: relative;
          z-index: 1;
        }

        .header {
          text-align: center;
          margin-bottom: 1rem;
        }

        .tech-pro-blue-template .name {
          font-size: 1.8rem;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 0.5rem 0;
          color: white !important;
          text-align: center;
        }

        .tech-pro-blue-template .title {
          font-size: 0.9rem;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9) !important;
          margin: 0 0 1.5rem 0;
          text-align: center;
        }

        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
          margin: 1rem 0;
        }

        .profile-picture {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.2);
          margin: 0 auto 1.5rem auto;
          display: block;
          object-fit: cover;
          background-color: #E5E7EB;
        }

        .tech-pro-blue-template .section-title {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          color: white !important;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }

        .tech-pro-blue-template .contact-item, 
        .tech-pro-blue-template .contact-info,
        .tech-pro-blue-template .contact-icon + span {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: white !important;
        }

        .contact-icon {
          width: 14px;
          height: 14px;
          opacity: 1;
          fill: white !important;
          color: white !important;
        }

        .skills-category {
          margin-bottom: 1rem;
        }

        .tech-pro-blue-template .skills-category-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: white !important;
          margin-bottom: 0.25rem;
        }

        .tech-pro-blue-template .skills-list {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.9) !important;
          line-height: 1.3;
        }

        .main-section-title {
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #D1D5DB;
        }

        .summary-text {
          font-size: 0.9rem;
          line-height: 1.5;
          color: #374151;
          margin-bottom: 1.5rem;
        }

        .experience-item, .education-item, .project-item {
          margin-bottom: 1rem;
        }

        .experience-header, .education-header, .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .job-title, .degree-title, .project-title {
          font-weight: 700;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .company-info, .institution-info {
          font-size: 0.9rem;
          color: #374151;
        }

        .dates {
          font-size: 0.85rem;
          color: #6B7280;
          text-align: right;
        }

        .experience-description, .project-description {
          margin-top: 0.5rem;
        }

        .bullet-point {
          margin: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
          font-size: 0.85rem;
          color: #374151;
        }

        .bullet-point::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #000;
        }

        .gpa {
          font-size: 0.85rem;
          color: #6B7280;
          margin-top: 0.25rem;
        }

        .technologies {
          font-style: italic;
          font-size: 0.8rem;
          color: #6B7280;
          margin-top: 0.5rem;
        }

        /* Placeholder styles for empty sections */
        .placeholder-text {
          color: #9CA3AF !important;
          font-style: italic;
        }

        .placeholder-item {
          opacity: 0.7;
        }

        /* Template base styles - allow natural flow for pagination */
        .tech-pro-blue-template {
          margin: 0;
          padding: 0;
          width: 100%;
          box-sizing: border-box;
        }

        @media print {
          .tech-pro-blue-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          .sidebar {
            border-radius: 0;
          }
        }
      `}} />

      {/* Sidebar */}
      <div className="sidebar">
        {sidebarSections.map((section) => {
          const content = renderSectionContent(section);
          if (!content) return null; // Don't render empty sections (like empty languages)

          return (
            <React.Fragment key={section.id}>
              {SectionWrapper ? (
                <SectionWrapper sectionId={section.id} sectionType={section.type} isLocked={isHeaderSection(section.type)}>
                  {content}
                </SectionWrapper>
              ) : (
                <div data-section-id={section.id}>{content}</div>
              )}
              {onAddSection && AddSectionButton && (
                <div className="add-section-container" style={{ margin: '8px 0' }}>
                  <AddSectionButton onClick={() => onAddSection('')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="main-content">
        {mainSections.map((section) => {
          const content = renderSectionContent(section);
          if (!content) return null;

          return (
            <React.Fragment key={section.id}>
              {SectionWrapper ? (
                <SectionWrapper sectionId={section.id} sectionType={section.type} isLocked={isHeaderSection(section.type)}>
                  {content}
                </SectionWrapper>
              ) : (
                <div data-section-id={section.id}>{content}</div>
              )}
              {onAddSection && AddSectionButton && (
                <div className="add-section-container" style={{ margin: '8px 0' }}>
                  <AddSectionButton onClick={() => onAddSection('')} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>


    </div>

  );
};
