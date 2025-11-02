'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface TechProBlueTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const TechProBlueTemplate: React.FC<TechProBlueTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills, projects } = cvData;

  return (
    <div className={`tech-pro-blue-template ${className}`}>
      <style jsx>{`
        .tech-pro-blue-template {
          font-family: 'Lato', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 2rem 0 !important;
          background: white;
          color: #000;
          line-height: 1.4;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 0;
          box-sizing: border-box;
          min-height: 100vh;
          position: relative;
        }

        .sidebar {
          background: #2C3E50;
          color: white;
          padding: 1.5rem;
          border-radius: 0;
          min-height: 100vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .main-content {
          padding: 1.5rem;
          min-height: 100vh;
          overflow-y: auto;
          box-sizing: border-box;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .name {
          font-size: 1.8rem;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 0.5rem 0;
          color: white;
          text-align: center;
        }

        .title {
          font-size: 0.9rem;
          font-weight: 600;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
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
          background: #E5E7EB;
          margin: 0 auto 1.5rem auto;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B7280;
          font-size: 0.8rem;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          color: white;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: white;
        }

        .contact-icon {
          width: 14px;
          height: 14px;
          opacity: 0.8;
        }

        .skills-category {
          margin-bottom: 1rem;
        }

        .skills-category-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: white;
          margin-bottom: 0.25rem;
        }

        .skills-list {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.9);
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
          margin-bottom: 1.5rem;
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

        /* Override parent container padding and spacing */
        .tech-pro-blue-template {
          margin-top: -32px !important;
          margin-right: -32px !important;
          margin-bottom: -32px !important;
          margin-left: -32px !important;
          padding: 2rem 0 !important;
          width: calc(100% + 64px) !important;
          height: calc(100% + 64px) !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          z-index: 10 !important;
        }

        @media print {
          .tech-pro-blue-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 2rem 0 !important;
            min-height: 100vh;
            position: static !important;
            top: auto !important;
            left: auto !important;
            z-index: auto !important;
          }
          
          .sidebar {
            min-height: 100vh;
            border-radius: 0;
          }
          
          .main-content {
            min-height: 100vh;
          }
        }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Header */}
        <div className="header">
          <h1 className="name">{basics?.name || 'Your Name'}</h1>
          <p className="title">{basics?.label || 'Your Title'}</p>
        </div>

        <div className="divider"></div>

        {/* Profile Picture */}
        <div className="profile-picture">
          Profile Photo
        </div>

        {/* Contact */}
        <div>
          <h3 className="section-title">Contact</h3>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>{basics?.phone || '+1 (123) 456-7890'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span>{basics?.email || 'john.doe@email.com'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{basics?.location?.address || 'San Francisco, CA'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span>{basics?.profiles?.[0]?.url || 'linkedin.com/in/johndoe'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span>{basics?.url || 'github.com/johndoe'}</span>
          </div>
        </div>

        <div className="divider"></div>

        {/* Skills */}
        <div>
          <h3 className="section-title">Skills</h3>
          
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
              <div className="skills-category-title">Technical Skills</div>
              <div className="skills-list">Add your skills to see them here</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Summary */}
        <div>
          <h2 className="main-section-title">Summary</h2>
          <p className="summary-text">
            {basics?.summary || 'Experienced Software Engineer with expertise in full-stack development, cloud technologies, and agile methodologies. Proven track record of delivering scalable solutions and collaborating effectively with cross-functional teams to achieve business objectives.'}
          </p>
        </div>

        {/* Experience */}
        <div>
          <h2 className="main-section-title">Experience</h2>
          {work?.map((job, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{job.position}</div>
                  <div className="company-info">{job.name}</div>
                </div>
                <div className="dates">{job.startDate} – {job.endDate || 'Present'}</div>
              </div>
              <div className="experience-description">
                {job.highlights?.map((highlight, idx) => (
                  <div key={idx} className="bullet-point">{highlight}</div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Education */}
        <div>
          <h2 className="main-section-title">Education</h2>
          {education?.map((edu, index) => (
            <div key={index} className="education-item">
              <div className="education-header">
                <div>
                  <div className="degree-title">{edu.studyType} {edu.area}</div>
                  <div className="institution-info">{edu.institution}</div>
                  {edu.score && <div className="gpa">Score: {edu.score}</div>}
                </div>
                <div className="dates">{edu.startDate} – {edu.endDate}</div>
              </div>
            </div>
          ))}
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
                  <p style={{ marginBottom: '0.5rem', fontSize: '0.85rem', color: '#374151' }}>
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
  );
};
