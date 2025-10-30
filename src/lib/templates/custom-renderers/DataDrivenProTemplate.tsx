'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface DataDrivenProTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const DataDrivenProTemplate: React.FC<DataDrivenProTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills, projects } = cvData;

  return (
    <div className={`data-driven-pro-template ${className}`}>
      <style jsx>{`
        .data-driven-pro-template {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.5in;
          background: white;
          color: #000;
          line-height: 1.4;
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
          width: 4px;
          height: 4px;
          background: #E5E7EB;
          border-radius: 50%;
        }

        .section-title {
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.5rem 0;
          letter-spacing: 1.5px;
        }

        .contact-item {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.75rem;
          color: #374151;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
        }

        .contact-item span {
          word-break: break-all;
          overflow-wrap: anywhere;
          max-width: calc(100% - 20px);
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
          font-weight: 600;
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
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.5rem 0;
          letter-spacing: 1.5px;
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

        @media print {
          .data-driven-pro-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <div className="header-left">
          <h1 className="name">{basics?.name || 'CHLOE WINEHOUSE'}</h1>
          <p className="title">{basics?.label || 'PROFESSIONAL TITLE'}</p>
        </div>
        <div className="header-right">
          <img 
            src={basics?.image || '/images/default-avatar.png'} 
            alt="Profile" 
            className="profile-picture"
          />
        </div>
      </div>

      {/* Horizontal Separator */}
      <div className="horizontal-separator"></div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column (25%) */}
        <div className="left-column">
          {/* Contact */}
          <div>
            <h3 className="section-title">Contact</h3>
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              <span>{basics?.phone || '+1 103 456 7890'}</span>
            </div>
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <span>{basics?.email || 'youremail@email.com'}</span>
            </div>
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <span>{basics?.location?.address || 'Country, City, Zip'}</span>
            </div>
            <div className="contact-item">
              <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span>
                {basics?.profiles?.[0]?.url 
                  ? basics.profiles[0].url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '')
                  : 'username'
                }
              </span>
            </div>
          </div>

          {/* Education */}
          <div style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title">Education</h3>
            {education?.map((edu, index) => (
              <div key={index} className="education-item">
                <div className="degree-title">{edu.studyType || 'ENTER YOUR MAJOR'}</div>
                <div className="institution-info">{edu.institution || 'Name of University'}</div>
                <div className="education-dates">{edu.startDate || '2005'} - {edu.endDate || '2007'}</div>
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
          <div style={{ marginTop: '1.5rem' }}>
            <h3 className="section-title">Skills</h3>
            <div className="skills-category">
              <div className="skills-category-title">Professional</div>
              <div className="skills-list">
                {skills && skills.length > 0 ? (
                  skills.map((skill, index) => (
                    <div key={index}>
                      {Array.isArray(skill.skills) 
                        ? skill.skills.join('\n') 
                        : skill.category || 'Problem Solving'
                      }
                    </div>
                  ))
                ) : (
                  <div>
                    Providing Discipline<br/>
                    Problem Solving<br/>
                    Planning Meetings<br/>
                    Reliability<br/>
                    Problem Solving<br/>
                    Providing Discipline<br/>
                    Planning Meetings<br/>
                    Reliability<br/>
                    Solving Problems
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Vertical Separator */}
        <div className="vertical-separator">
          <div className="separator-dot"></div>
          <div className="separator-dot"></div>
          <div className="separator-dot"></div>
          <div className="separator-dot"></div>
        </div>

        {/* Right Column (75%) */}
        <div className="right-column">
          {/* Profile */}
          <div>
            <h2 className="main-section-title">Profile</h2>
            <p className="summary-text">
              {basics?.summary || 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.'}
            </p>
          </div>

          {/* Work Experience */}
          <div>
            <h2 className="main-section-title">Work Experience</h2>
            {work?.map((job, index) => (
              <div key={index} className="experience-item">
                <div className="experience-header">
                  <div>
                    <div className="job-title">{job.position || 'YOUR JOB TITLE GOES HERE'}</div>
                    <div className="company-info">{job.name || 'Company Name'} | {job.startDate || '2008'} - {job.endDate || '2010'}</div>
                  </div>
                </div>
                <div className="experience-description">
                  <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  </p>
                  {job.highlights?.map((highlight, idx) => (
                    <div key={idx} className="bullet-point">{highlight}</div>
                  ))}
                  {(!job.highlights || job.highlights.length === 0) && (
                    <>
                      <div className="bullet-point">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                      <div className="bullet-point">Sed do eiusmod tempor incididunt ut labore et dolore</div>
                      <div className="bullet-point">Ut enim ad minim veniam, quis nostrud exercitation</div>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(!work || work.length === 0) && (
              <>
                <div className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">YOUR JOB TITLE GOES HERE</div>
                      <div className="company-info">Company Name | 2008 - 2010</div>
                    </div>
                  </div>
                  <div className="experience-description">
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <div className="bullet-point">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                    <div className="bullet-point">Sed do eiusmod tempor incididunt ut labore et dolore</div>
                    <div className="bullet-point">Ut enim ad minim veniam, quis nostrud exercitation</div>
                  </div>
                </div>
                <div className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">YOUR JOB TITLE GOES HERE</div>
                      <div className="company-info">Company Name | 2008 - 2010</div>
                    </div>
                  </div>
                  <div className="experience-description">
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <div className="bullet-point">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                    <div className="bullet-point">Sed do eiusmod tempor incididunt ut labore et dolore</div>
                    <div className="bullet-point">Ut enim ad minim veniam, quis nostrud exercitation</div>
                  </div>
                </div>
                <div className="experience-item">
                  <div className="experience-header">
                    <div>
                      <div className="job-title">YOUR JOB TITLE GOES HERE</div>
                      <div className="company-info">Company Name | 2008 - 2010</div>
                    </div>
                  </div>
                  <div className="experience-description">
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                    </p>
                    <div className="bullet-point">Lorem ipsum dolor sit amet, consectetur adipiscing elit</div>
                    <div className="bullet-point">Sed do eiusmod tempor incididunt ut labore et dolore</div>
                    <div className="bullet-point">Ut enim ad minim veniam, quis nostrud exercitation</div>
                    <div className="bullet-point">Duis aute irure dolor in reprehenderit in voluptate</div>
                    <div className="bullet-point">Excepteur sint occaecat cupidatat non proident</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Projects */}
          {projects && projects.length > 0 && (
            <div>
              <h2 className="main-section-title">Projects</h2>
              {projects.map((project, index) => (
                <div key={index} className="project-item">
                  <div className="project-header">
                    <div>
                      <div className="project-title">{project.name}</div>
                    </div>
                  </div>
                  <div className="project-description">
                    <p style={{ marginBottom: '0.5rem', fontSize: '0.75rem', color: '#374151' }}>
                      {project.description}
                    </p>
                    {project.highlights?.map((highlight, idx) => (
                      <div key={idx} className="bullet-point">{highlight}</div>
                    ))}
                    {project.keywords && (
                      <div className="technologies">
                        Technologies: {project.keywords.join(', ')}
                      </div>
                    )}
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
