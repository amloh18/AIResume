'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, stripHtmlTags, formatDateRange } from '@/lib/utils/textFormatting';

interface DataDrivenProTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  enabledSections?: string[];
}

export const DataDrivenProTemplate: React.FC<DataDrivenProTemplateProps> = ({
  cvData,
  className = ''
}) => {
  const { basics, work, education, skills, projects, volunteer, certificates, awards, publications, languages, interests, references } = cvData;

  return (
    <div className={`data-driven-pro-template ${className}`}>
      <style dangerouslySetInnerHTML={{
        __html: `
        .data-driven-pro-template {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 100%;
          margin: 0;
          padding: 32px;
          background: white;
          color: #000 !important;
          line-height: 1.4;
          overflow-wrap: anywhere;
          word-break: break-word;
          box-sizing: border-box;
        }

        /* Force black text for all headings to prevent dark mode bleed */
        .data-driven-pro-template h1, 
        .data-driven-pro-template h2, 
        .data-driven-pro-template h3, 
        .data-driven-pro-template h4, 
        .data-driven-pro-template p, 
        .data-driven-pro-template span, 
        .data-driven-pro-template div {
          color: #000 !important;
        }

        .data-driven-pro-template .text-gray-500,
        .data-driven-pro-template .text-gray-600, 
        .data-driven-pro-template .text-gray-700 {
           color: #4b5563 !important;
        }

        .header {
          display: grid;
          grid-template-columns: 80% 20%;
          gap: 1rem;
          margin-bottom: 0.75rem;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .name {
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0;
          color: #000;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }

        .title {
          font-size: 0.9rem;
          color: #374151;
          margin: 0.5rem 0 0 0;
          text-transform: uppercase;
          font-weight: 500;
        }

        .header-right {
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }

        .profile-picture {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #E5E7EB;
        }

        .horizontal-separator {
          height: 1px;
          background: #E5E7EB;
          margin: 0.75rem 0 1.5rem 0;
        }

        .main-content {
          display: grid;
          grid-template-columns: 25% 1px 75%;
          gap: 1rem;
          position: relative;
        }

        .left-column {
          padding-right: 0.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .right-column {
          padding-left: 0.75rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .vertical-separator {
          background: #E5E7EB;
          width: 1px;
          position: relative;
        }

        .separator-dot {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          background: #000;
          border-radius: 50%;
        }

        .section-title {
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.5rem 0;
          letter-spacing: 2px;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .contact-item span {
          white-space: normal;
          overflow: visible;
          flex: 1;
          word-break: break-word;
        }

        .contact-icon {
          width: 14px;
          height: 14px;
          opacity: 0.8;
          flex-shrink: 0;
        }

        .education-item {
          margin-bottom: 0.75rem;
        }

        .degree-title {
          font-weight: 600;
          font-size: 0.8rem;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .institution-info {
          font-size: 0.75rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .education-dates {
          font-size: 0.75rem;
          color: #6B7280;
        }

        .skills-category {
          margin-bottom: 0.75rem;
        }

        .skills-category-title {
          font-weight: 700;
          font-size: 0.8rem;
          color: #000;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
        }

        .skills-list {
          font-size: 0.75rem;
          color: #6B7280;
          line-height: 1.3;
        }

        .main-section-title {
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.5rem 0;
          letter-spacing: 2px;
        }

        .summary-text {
          font-size: 0.8rem;
          line-height: 1.5;
          color: #374151;
          margin-bottom: 1rem;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .experience-item, .project-item {
          margin-bottom: 1rem;
        }
        
        .main-section-title {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        .main-section-title + * {
          page-break-before: avoid;
          break-before: avoid;
        }

        .experience-header, .project-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .job-title, .project-title {
          font-weight: 700;
          color: #000;
          margin-bottom: 0.25rem;
          font-size: 0.8rem;
        }

        .company-info {
          font-size: 0.75rem;
          color: #374151;
        }

        .dates {
          font-size: 0.75rem;
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
          font-size: 0.75rem;
          color: #374151;
          word-wrap: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .bullet-point::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #000;
        }

        .technologies {
          font-style: italic;
          font-size: 0.7rem;
          color: #6B7280;
          margin-top: 0.5rem;
        }
        
        /* Allow natural page breaks - content flows across pages */
        .data-driven-pro-template {
          page-break-inside: auto;
          break-inside: auto;
        }
        
        /* Sections can break naturally, but try to keep section headers with content */
        .right-column > div {
          page-break-inside: auto;
          break-inside: auto;
        }
        
        /* Section headers should stay with first item */
        .main-section-title {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        /* Experience items should stay together */
        .experience-item, .project-item {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Ensure main content can flow */
        .main-content {
          min-height: auto;
        }
        
        .right-column {
          min-height: auto;
        }

        @media print {
          .data-driven-pro-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          
          /* Allow natural page breaks */
          .right-column > div {
            page-break-inside: auto;
            break-inside: auto;
          }
          
          /* Section headers stay with content */
          .main-section-title {
            page-break-after: avoid;
            break-after: avoid;
          }
          
          /* Keep experience items together */
          .experience-item, .project-item {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}} />

      {/* Header */}
      {basics?.name && (
        <div className="header" data-section-id="personal">
          <div className="header-left">
            <h1 className="name">{basics.name}</h1>
            {basics.label && <p className="title">{basics.label}</p>}
          </div>
          <div className="header-right">
            {basics.image && (
              <img
                src={basics.image}
                alt="Profile"
                className="profile-picture"
              />
            )}
          </div>
        </div>
      )}

      {/* Horizontal Separator */}
      {basics?.name && <div className="horizontal-separator"></div>}

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column (25%) */}
        <div className="left-column">
          {/* Contact */}
          <div>
            <h3 className="section-title">Contact</h3>
            <div className="contact-item">
              <span>{basics?.phone || '+919662345079'}</span>
            </div>
            <div className="contact-item">
              <span>{basics?.email || 'amarjotsinghl@outlook.com'}</span>
            </div>
            <div className="contact-item">
              <span>
                {[basics?.location?.countryCode, basics?.location?.city, basics?.location?.postalCode]
                  .filter(Boolean)
                  .join(', ') || 'Country, City, Zip'}
              </span>
            </div>
            <div className="contact-item">
              <span>
                {basics?.profiles?.[0]?.username ||
                  (basics?.profiles?.[0]?.url
                    ? basics.profiles[0].url.replace(/^https?:\/\/(www\.)?(linkedin\.com\/in\/|github\.com\/|twitter\.com\/)/, '')
                    : 'username')
                }
              </span>
            </div>
          </div>

          {/* Education */}
          <div style={{ marginTop: '1.5rem' }} data-section-id="education">
            <h3 className="section-title">Education</h3>
            {education?.map((edu, index) => (
              <div key={index} className="education-item" data-item-id={index}>
                <div className="degree-title">{edu.studyType || 'ENTER YOUR MAJOR'}</div>
                <div className="institution-info">{edu.institution || 'Name of University'}</div>
                <div className="education-dates">{formatDateRange(edu.startDate || '2005', edu.endDate || '2007')}</div>
              </div>
            ))}
            {(!education || education.length === 0) && (
              <div className="education-item">
                <div className="degree-title">ENTER YOUR MAJOR</div>
                <div className="institution-info">Name of University</div>
                <div className="education-dates">2005 - 2007</div>
              </div>
            )}
          </div>

          {/* Skills */}
          {skills && skills.length > 0 && (
            <div style={{ marginTop: '1.5rem' }} data-section-id="skills">
              <h3 className="section-title">Skills</h3>
              {skills.map((skill, index) => (
                <div key={index} className="skills-category" data-item-id={index}>
                  <div className="skills-category-title">{skill.category || 'Professional'}</div>
                  <div className="skills-list">
                    {Array.isArray(skill.skills) && skill.skills.length > 0 ? (
                      skill.skills.map((s, i) => (
                        <div key={i}>{stripHtmlTags(s)}</div>
                      ))
                    ) : (
                      <div>{stripHtmlTags(skill.category || '')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vertical Separator */}
        <div className="vertical-separator">
          {/* Dots for right column section headings */}
          {(() => {
            const rightColumnSections = [];
            if (basics?.summary) rightColumnSections.push('Profile');
            if (work && work.length > 0) rightColumnSections.push('Work Experience');
            if (projects && projects.length > 0) rightColumnSections.push('Projects');
            if (volunteer && volunteer.length > 0) rightColumnSections.push('Volunteer');
            if (certificates && certificates.length > 0) rightColumnSections.push('Certificates');
            if (awards && awards.length > 0) rightColumnSections.push('Awards');
            if (publications && publications.length > 0) rightColumnSections.push('Publications');

            // Count entries for each section
            const entryCounts = [];
            if (work && work.length > 0) entryCounts.push(...work.map((_, i) => ({ section: 'Work Experience', index: i })));
            if (projects && projects.length > 0) entryCounts.push(...projects.map((_, i) => ({ section: 'Projects', index: i })));
            if (volunteer && volunteer.length > 0) entryCounts.push(...volunteer.map((_, i) => ({ section: 'Volunteer', index: i })));
            if (certificates && certificates.length > 0) entryCounts.push(...certificates.map((_, i) => ({ section: 'Certificates', index: i })));
            if (awards && awards.length > 0) entryCounts.push(...awards.map((_, i) => ({ section: 'Awards', index: i })));
            if (publications && publications.length > 0) entryCounts.push(...publications.map((_, i) => ({ section: 'Publications', index: i })));

            const totalDots = rightColumnSections.length + entryCounts.length;
            const dotPositions = [];

            // Calculate positions for dots (evenly distributed)
            for (let i = 0; i < totalDots; i++) {
              const position = (i + 1) / (totalDots + 1) * 100;
              dotPositions.push(position);
            }

            return dotPositions.map((pos, index) => (
              <div
                key={index}
                className="separator-dot"
                style={{ top: `${pos}%` }}
              ></div>
            ));
          })()}
        </div>

        {/* Right Column (75%) */}
        <div className="right-column">
          {/* Profile */}
          {basics?.summary && (
            <div data-section-id="summary">
              <h2 className="main-section-title">Profile</h2>
              <p className="summary-text">
                {stripHtmlTags(basics.summary)}
              </p>
            </div>
          )}

          {/* Work Experience */}
          {work && work.length > 0 && (
            <div data-section-id="work">
              <h2 className="main-section-title">Work Experience</h2>
              {work.map((job, index) => (
                <div key={index} className="experience-item" data-item-id={index}>
                  <div className="experience-header">
                    <div>
                      <div className="job-title">{job.position || ''}</div>
                      <div className="company-info">
                        {job.name || ''}
                        {(job.name && (job.startDate || job.endDate)) && ' | '}
                        {formatDateRange(job.startDate || '', job.endDate || '')}
                      </div>
                    </div>
                  </div>
                  <div className="experience-description">
                    {job.summary && (
                      <div
                        style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}
                      >
                        {stripHtmlTags(job.summary)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div data-section-id="projects">
              <h2 className="main-section-title">Projects</h2>
              {projects.map((project, index) => (
                <div key={index} className="project-item" data-item-id={index}>
                  <div className="project-header">
                    <div>
                      <div className="project-title">{project.name}</div>
                    </div>
                  </div>
                  <div className="project-description">
                    {project.description && (
                      <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                        {stripHtmlTags(project.description)}
                      </p>
                    )}
                    {project.keywords && project.keywords.length > 0 && (
                      <div className="technologies">
                        Technologies: {project.keywords.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Volunteer */}
          {volunteer && volunteer.length > 0 && (
            <div data-section-id="volunteer">
              <h2 className="main-section-title">Volunteer Experience</h2>
              {volunteer.map((vol, index) => (
                <div key={index} className="experience-item" data-item-id={index}>
                  <div className="experience-header">
                    <div>
                      <div className="job-title">{vol.position || ''}</div>
                      <div className="company-info">
                        {vol.organization || ''}
                        {(vol.organization && (vol.startDate || vol.endDate)) && ' | '}
                        {formatDateRange(vol.startDate || '', vol.endDate || '')}
                      </div>
                    </div>
                  </div>
                  <div className="experience-description">
                    {vol.summary && (
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                        {stripHtmlTags(vol.summary)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certificates */}
          {certificates && certificates.length > 0 && (
            <div>
              <h2 className="main-section-title">Certificates</h2>
              {certificates.map((cert, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">{cert.name || ''}</div>
                      <div className="company-info">
                        {cert.issuer || ''}
                        {(cert.issuer && cert.date) && ' | '}
                        {cert.date || ''}
                      </div>
                    </div>
                  </div>
                  {cert.description && (
                    <div className="experience-description">
                      <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                        {stripHtmlTags(cert.description)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Awards */}
          {awards && awards.length > 0 && (
            <div>
              <h2 className="main-section-title">Awards</h2>
              {awards.map((award, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">{award.title || ''}</div>
                      <div className="company-info">
                        {award.awarder || ''}
                        {(award.awarder && award.date) && ' | '}
                        {award.date || ''}
                      </div>
                    </div>
                  </div>
                  {award.summary && (
                    <div className="experience-description">
                      <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                        {stripHtmlTags(award.summary)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Publications */}
          {publications && publications.length > 0 && (
            <div>
              <h2 className="main-section-title">Publications</h2>
              {publications.map((pub, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">{pub.name || ''}</div>
                      <div className="company-info">
                        {pub.publisher || ''}
                        {(pub.publisher && pub.releaseDate) && ' | '}
                        {pub.releaseDate || ''}
                      </div>
                    </div>
                  </div>
                  {pub.summary && (
                    <div className="experience-description">
                      <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                        {stripHtmlTags(pub.summary)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Languages */}
          {languages && languages.length > 0 && (
            <div>
              <h2 className="main-section-title">Languages</h2>
              <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                {languages.map((lang, index) => (
                  <div key={index} style={{ marginBottom: '0.25rem' }}>
                    <strong>{lang.language}</strong> - {lang.fluency}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interests */}
          {interests && interests.length > 0 && (
            <div>
              <h2 className="main-section-title">Interests</h2>
              <div style={{ fontSize: '0.75rem', color: '#374151' }}>
                {interests.map((interest, index) => (
                  <div key={index} style={{ marginBottom: '0.25rem' }}>
                    <strong>{interest.name}</strong>
                    {interest.keywords && interest.keywords.length > 0 && (
                      <span> - {interest.keywords.join(', ')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* References */}
          {references && references.length > 0 && (
            <div>
              <h2 className="main-section-title">References</h2>
              {references && references.length > 0 && references.map((ref, index) => (
                <div key={index} className="experience-item">
                  <div className="job-title">{ref.name || ''}</div>
                  <div style={{ fontSize: '0.75rem', color: '#374151', marginTop: '0.25rem' }}>
                    {stripHtmlTags(ref.reference)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
