'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface DesignerModernTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const DesignerModernTemplate: React.FC<DesignerModernTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills } = cvData;

  return (
    <div className={`designer-modern-template ${className}`}>
      <style jsx>{`
        .designer-modern-template {
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #000000;
          background: #ffffff;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 40px;
        }
        
        .header {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        
        .header-second-row {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          margin-bottom: 40px;
        }
        
        .left-header {
          display: flex;
          flex-direction: column;
        }
        
        .right-header {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        
        .right-header-left-aligned {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        
        
        .name {
          font-size: 48px;
          font-weight: 300;
          letter-spacing: 2px;
          line-height: 1.1;
        }
        
        .name-first {
          color: #666666;
          font-size: 36px;
          line-height: 0.9;
        }
        
        .name-last {
          color: #000000;
        }
        
        .title {
          font-size: 16px;
          font-weight: 400;
          text-transform: uppercase;
          letter-spacing: 3px;
          color: #333333;
          margin-bottom: 20px;
        }
        
        .contact-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          margin-bottom: 20px;
        }
        
        .contact-label {
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }
        
        .contact-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 5px;
          font-size: 12px;
          color: #666666;
        }
        
        .profile-section {
          display: flex;
          align-items: flex-start;
          gap: 20px;
          width: 100%;
        }
        
        .profile-photo {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: #EAB308;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #ffffff;
          font-weight: bold;
          flex-shrink: 0;
        }
        
        .profile-text {
          font-size: 14px;
          line-height: 1.7;
          color: #555555;
          flex: 1;
        }
        
        .main-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 40px;
          margin-top: 30px;
        }
        
        .left-column {
          padding-right: 20px;
        }
        
        .right-column {
          padding-left: 20px;
          border-left: 3px solid #000000;
          padding-left: 30px;
        }
        
        .section {
          margin-bottom: 30px;
        }
        
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 20px;
          color: #333333;
        }
        
        .skills-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .skill-item {
          font-size: 13px;
          color: #555555;
        }
        
        .education-item {
          margin-bottom: 20px;
        }
        
        .education-header {
          margin-bottom: 5px;
        }
        
        .degree {
          font-size: 14px;
          font-weight: bold;
          color: #333333;
          margin-bottom: 2px;
        }
        
        .university {
          font-size: 12px;
          color: #666666;
          margin-bottom: 2px;
        }
        
        .education-dates {
          font-size: 12px;
          color: #999999;
        }
        
        .experience-item {
          margin-bottom: 25px;
        }
        
        .experience-header {
          margin-bottom: 8px;
        }
        
        .job-title {
          font-size: 16px;
          font-weight: bold;
          color: #333333;
          margin-bottom: 3px;
        }
        
        .company-info {
          font-size: 13px;
          color: #666666;
          margin-bottom: 8px;
        }
        
        .company-name {
          font-weight: bold;
        }
        
        .job-dates {
          color: #999999;
        }
        
        .job-description {
          font-size: 13px;
          line-height: 1.6;
          color: #555555;
        }
        
        .job-description ul {
          margin: 8px 0;
          padding-left: 20px;
        }
        
        .job-description li {
          margin-bottom: 4px;
        }
        
        @media print {
          .designer-modern-template {
            padding: 0;
            margin: 0;
            max-width: none;
            background: #ffffff;
          }
        }
      `}</style>

      {/* Header Section */}
      <div className="header">
        {/* Left Column - Row 1: Name and Title */}
        <div className="left-header">
          <div className="name">
            <span className="name-first">{basics?.name?.split(' ')[0] || 'DAVID'}</span>
            <br />
            <span className="name-last">{basics?.name?.split(' ').slice(1).join(' ') || 'MATTHEW'}</span>
          </div>
          <div className="title">{basics?.label || 'UX DESIGNER'}</div>
        </div>
        
        {/* Right Column - Row 1: Contact Info */}
        <div className="right-header">
          <div className="contact-section">
            <div className="contact-info">
              {basics?.phone && <div>P: {basics.phone}</div>}
              {basics?.email && <div>E: {basics.email}</div>}
              {basics?.location?.city && <div>{basics.location.city}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Second Row */}
      <div className="header-second-row">
        {/* Left Column - Row 2: Photo */}
        <div className="left-header">
          <div className="profile-photo">
            {basics?.image ? (
              <img 
                src={basics.image} 
                alt={basics.name || 'Profile'} 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              'Photo'
            )}
          </div>
        </div>
        
        {/* Right Column - Row 2: Profile Section */}
        <div className="right-header-left-aligned">
          <div className="section-title">Profile</div>
          {basics?.summary && (
            <div className="profile-section">
              <div className="profile-text">{basics.summary}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
          {/* Skills Section */}
          {skills && skills.length > 0 && (
            <div className="section">
              <div className="section-title">Skills</div>
              <div className="skills-list">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-item">
                    {skill.category}: {skill.skills.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education Section */}
          {education && education.length > 0 && (
            <div className="section">
              <div className="section-title">Education</div>
              {education.map((edu, index) => (
                <div key={index} className="education-item">
                  <div className="education-header">
                    <div className="degree">{edu.studyType} {edu.area && `in ${edu.area}`}</div>
                    <div className="university">{edu.institution}</div>
                    <div className="education-dates">{edu.startDate} - {edu.endDate || 'Present'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="right-column">
          {/* Experience Section */}
          {work && work.length > 0 && (
            <div className="section">
              <div className="section-title">Experience</div>
              {work.map((job, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div className="job-title">{job.position}</div>
                    <div className="company-info">
                      <span className="company-name">{job.name}</span> | <span className="job-dates">{job.startDate} - {job.endDate || 'Present'}</span>
                    </div>
                  </div>
                  {job.summary && (
                    <div className="job-description">{job.summary}</div>
                  )}
                  {job.highlights && job.highlights.length > 0 && (
                    <div className="job-description">
                      <ul>
                        {job.highlights.map((highlight, highlightIndex) => (
                          <li key={highlightIndex}>{highlight}</li>
                        ))}
                      </ul>
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
