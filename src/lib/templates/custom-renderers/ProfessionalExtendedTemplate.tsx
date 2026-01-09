'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText, formatDateRangeWithStyle, stripHtmlTags, type DateFormatStyle } from '@/lib/utils/textFormatting';

interface ProfessionalExtendedTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
  dateFormat?: DateFormatStyle;
}

export const ProfessionalExtendedTemplate: React.FC<ProfessionalExtendedTemplateProps> = ({
  cvData,
  className = '',
  dateFormat = 'MMM_YYYY'
}) => {
  const { basics, work, education, skills, projects } = cvData;

  return (
    <div className={`professional-extended-template ${className}`}>
      <style jsx>{`
        .professional-extended-template {
          font-family: 'Arial', 'Helvetica', sans-serif;
          font-size: 12px;
          line-height: 1.4;
          color: #000000;
          background: #E5E7EB;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .name {
          font-size: 28px;
          font-weight: bold;
          color: #000000;
          margin-bottom: 5px;
          letter-spacing: 1px;
        }
        
        .title {
          font-size: 14px;
          font-weight: normal;
          color: #000000;
          margin-bottom: 15px;
        }
        
        .header-line {
          height: 1px;
          background: #000000;
          margin: 0 auto 20px;
          width: 100%;
        }
        
        .profile-section {
          margin-bottom: 20px;
        }
        
        .profile-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
          border-bottom: 1px solid #000000;
          padding-bottom: 5px;
        }
        
        .profile-text {
          font-size: 12px;
          line-height: 1.5;
          color: #333333;
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
          margin-top: 20px;
        }
        
        .left-column {
          padding-right: 15px;
        }
        
        .right-column {
          padding-left: 15px;
          position: relative;
        }
        
        .timeline-line {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #000000;
        }
        
        .timeline-dot {
          position: absolute;
          left: -4px;
          width: 10px;
          height: 10px;
          background: #000000;
          border-radius: 50%;
          border: 2px solid #E5E7EB;
        }
        
        .section {
          margin-bottom: 20px;
        }
        
        .section-title {
          font-size: 14px;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 10px;
          border-bottom: 1px solid #000000;
          padding-bottom: 5px;
        }
        
        .contact-info {
          font-size: 11px;
          line-height: 1.4;
        }
        
        .contact-item {
          margin-bottom: 5px;
          display: flex;
          align-items: center;
        }
        
        .contact-icon {
          width: 12px;
          height: 12px;
          margin-right: 8px;
          color: #666666;
        }
        
        .education-item {
          margin-bottom: 12px;
        }
        
        .education-header {
          margin-bottom: 3px;
        }
        
        .degree {
          font-size: 12px;
          font-weight: bold;
          color: #000000;
          margin-bottom: 2px;
        }
        
        .university {
          font-size: 11px;
          color: #333333;
          margin-bottom: 2px;
        }
        
        .education-dates {
          font-size: 11px;
          color: #666666;
        }
        
        .skills-list {
          font-size: 11px;
          line-height: 1.4;
        }
        
        .skill-item {
          margin-bottom: 8px;
        }
        
        .skill-name {
          font-size: 11px;
          margin-bottom: 2px;
        }
        
        .skill-bar {
          width: 100%;
          height: 6px;
          background: #ffffff;
          border-radius: 3px;
          overflow: hidden;
          border: 1px solid #cccccc;
        }
        
        .skill-fill {
          height: 100%;
          background: #000000;
          border-radius: 3px;
        }
        
        .experience-item {
          margin-bottom: 15px;
          position: relative;
        }
        
        .experience-header {
          margin-bottom: 5px;
        }
        
        .job-title {
          font-size: 13px;
          font-weight: bold;
          color: #000000;
          margin-bottom: 2px;
        }
        
        .company-info {
          font-size: 11px;
          color: #333333;
          margin-bottom: 5px;
        }
        
        .company-name {
          font-weight: bold;
          font-style: italic;
        }
        
        .job-dates {
          color: #666666;
        }
        
        .job-description {
          font-size: 11px;
          line-height: 1.4;
          color: #333333;
        }
        
        .job-description ul {
          margin: 5px 0;
          padding-left: 15px;
        }
        
        .job-description li {
          margin-bottom: 3px;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #000000;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: #666666;
        }
        
        .social-links {
          display: flex;
          gap: 15px;
        }
        
        .social-link {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        
        .social-icon {
          width: 10px;
          height: 10px;
          color: #666666;
        }
        
        @media print {
          .professional-extended-template {
            padding: 0;
            margin: 0;
            max-width: none;
            background: #ffffff;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="header" data-section-id="personal">
        <div className="name">{basics?.name || 'HARRY JOHNSON'}</div>
        <div className="title">{basics?.label || 'WEB & GRAPHIC DESIGNER'}</div>
        <div className="header-line"></div>
      </div>

      {/* Profile Section */}
      {basics?.summary && (
        <div className="profile-section" data-section-id="summary">
          <div className="profile-title">Profile</div>
          <div className="profile-text">{stripHtmlTags(basics.summary)}</div>
        </div>
      )}

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
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
              {basics?.url && (
                <div className="contact-item">
                  <svg className="contact-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
                  </svg>
                  {basics.url}
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
            </div>
          </div>

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

          {/* Skills Section */}
          {skills && skills.length > 0 && (
            <div className="section" data-section-id="skills">
              <div className="section-title">Skills</div>
              <div className="skills-list">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-item">
                    <div className="skill-name">{skill.category}</div>
                    <div className="skill-bar">
                      <div
                        className="skill-fill"
                        style={{ width: `${Math.min(100, (skill.skills.length || 1) * 15)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="right-column">
          {/* Timeline Line */}
          <div className="timeline-line"></div>

          {/* Experience Section */}
          {work && work.length > 0 && (
            <div className="section" data-section-id="work">
              <div className="timeline-dot" style={{ top: '0px' }}></div>
              <div className="section-title">Experience</div>
              {work.map((job, index) => (
                <div key={index} className="experience-item" data-item-id={index}>
                  <div className="timeline-dot" style={{ top: `${index * 80}px` }}></div>
                  <div className="experience-header">
                    <div className="job-title">{job.position}</div>
                    <div className="company-info">
                      <span className="company-name">{job.name}</span> | <span className="job-dates">{formatDateRangeWithStyle(job.startDate, job.endDate, dateFormat)}</span>
                    </div>
                  </div>
                  {job.summary && (
                    <div
                      className="job-description"
                      dangerouslySetInnerHTML={{ __html: renderFormattedText(job.summary) }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div>{basics?.email}</div>
        <div className="social-links">
          <div className="social-link">
            <svg className="social-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M20 10C20 4.477 15.523 0 10 0S0 4.477 0 10c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V10h2.54V7.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V10h2.773l-.443 2.89h-2.33v6.988C16.343 19.128 20 14.991 20 10z" clipRule="evenodd" />
            </svg>
            Facebook: @harryjohnson
          </div>
          <div className="social-link">
            <svg className="social-icon" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
            </svg>
            Twitter: @harryjohnson
          </div>
          <div className="social-link">
            <svg className="social-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.338 16.338H13.67V12.16c0-.995-.017-2.277-1.387-2.277-1.39 0-1.601 1.086-1.601 2.207v4.248H8.014v-8.59h2.559v1.174h.037c.356-.675 1.227-1.387 2.526-1.387 2.703 0 3.203 1.778 3.203 4.092v4.711zM5.005 6.575a1.548 1.548 0 11-.003-3.096 1.548 1.548 0 01.003 3.096zm-1.337 9.763H6.34v-8.59H3.667v8.59zM17.668 1H2.328C1.595 1 1 1.581 1 2.298v15.403C1 18.418 1.595 19 2.328 19h15.34c.734 0 1.332-.582 1.332-1.299V2.298C19 1.581 18.402 1 17.668 1z" clipRule="evenodd" />
            </svg>
            Linkedin: @harryjohnson
          </div>
        </div>
      </div>
    </div>
  );
};
