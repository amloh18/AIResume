'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { stripHtmlTags } from '@/lib/utils/textFormatting';

interface DesignerModernTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const DesignerModernTemplate: React.FC<DesignerModernTemplateProps> = ({
  cvData,
  className = ''
}) => {
  const { basics, work, education, skills, projects, volunteer, awards, certificates, publications, languages, interests } = cvData;

  return (
    <div className={`designer-modern-template ${className}`}>
      <style jsx>{`
        .designer-modern-template {
          font-family: 'Helvetica Neue', 'Arial', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: #000000;
          background: #ffffff;
          max-width: 100%;
          margin: 0;
          margin: 0;
          padding: 32px;
          box-sizing: border-box;
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
          gap: 0;
          margin-bottom: 15px;
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
          margin-left: -10px;
        }
        
        
        .name {
          font-size: 48px;
          font-weight: 300;
          letter-spacing: 2px;
          line-height: 1.1;
        }
        
        .name-first {
          color: #666666;
          font-size: 48px;
          font-weight: bold;
          line-height: 0.9;
          margin: 0;
          display: block;
        }
        
        .name-last {
          color: #000000;
          font-size: 32px;
          margin: 0;
          display: block;
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
          position: relative;
        }
        
        .contact-section::before {
          content: '';
          position: absolute;
          left: -20px;
          top: 0;
          bottom: 0;
          width: 4px;
          background: #EAB308;
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
          border-radius: 50% 50% 0 50%;
          background: #EAB308;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          color: #ffffff;
          font-weight: bold;
          flex-shrink: 0;
          overflow: hidden;
          margin-right: -10px;
        }
        
        .profile-photo img {
          border-radius: 50% 50% 0 50%;
        }
        
        .profile-text {
          font-size: 14px;
          line-height: 1.7;
          color: #555555;
          flex: 1;
          text-align: justify;
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
          margin-bottom: 8px;
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
        
        .skill-category {
          font-weight: bold;
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
          text-align: justify;
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
            <div className="name-first">{basics?.name?.split(' ')[0] || 'DAVID'}</div>
            <div className="name-last">{basics?.name?.split(' ').slice(1).join(' ') || 'MATTHEW'}</div>
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
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50% 50% 0 50%' }}
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
              <div className="profile-text">{stripHtmlTags(basics.summary)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
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

          {/* Skills Section */}
          {skills && skills.length > 0 && (
            <div className="section">
              <div className="section-title">Skills</div>
              <div className="skills-list">
                {skills.map((skill, index) => (
                  <div key={index} className="skill-item">
                    <span className="skill-category">{skill.category}:</span> {skill.skills.join(', ')}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Languages Section */}
          {languages && languages.length > 0 && (
            <div className="section">
              <div className="section-title">Languages</div>
              <div className="skills-list">
                {languages.map((lang, index) => (
                  <div key={index} className="skill-item">
                    <span className="skill-category">{lang.language}:</span> {lang.fluency}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awards Section */}
          {awards && awards.length > 0 && (
            <div className="section">
              <div className="section-title">Awards</div>
              {awards.map((award, index) => (
                <div key={index} className="education-item">
                  <div className="education-header">
                    <div className="degree">{award.title}</div>
                    <div className="university">{award.awarder}</div>
                    <div className="education-dates">{award.date}</div>
                    {award.summary && (
                      <div className="university" style={{ marginTop: '4px', fontSize: '12px' }}>{stripHtmlTags(award.summary)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Certificates Section */}
          {certificates && certificates.length > 0 && (
            <div className="section">
              <div className="section-title">Certificates</div>
              {certificates.map((cert, index) => (
                <div key={index} className="education-item">
                  <div className="education-header">
                    <div className="degree">{cert.name}</div>
                    <div className="university">{cert.issuer}</div>
                    <div className="education-dates">{cert.date}</div>
                    {cert.description && (
                      <div className="university" style={{ marginTop: '4px', fontSize: '12px' }}>{stripHtmlTags(cert.description)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Publications Section */}
          {publications && publications.length > 0 && (
            <div className="section">
              <div className="section-title">Publications</div>
              {publications.map((pub, index) => (
                <div key={index} className="education-item">
                  <div className="education-header">
                    <div className="degree">{pub.name}</div>
                    <div className="university">{pub.publisher}</div>
                    <div className="education-dates">{pub.releaseDate}</div>
                    {pub.summary && (
                      <div className="university" style={{ marginTop: '4px', fontSize: '12px' }}>{stripHtmlTags(pub.summary)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Interests Section */}
          {interests && interests.length > 0 && (
            <div className="section">
              <div className="section-title">Interests</div>
              <div className="skills-list">
                {interests.map((interest, index) => (
                  <div key={index} className="skill-item">
                    <span className="skill-category">{interest.name}:</span> {interest.keywords?.join(', ') || ''}
                  </div>
                ))}
              </div>
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
                    <div className="job-description">
                      {stripHtmlTags(job.summary)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Projects Section */}
          {projects && projects.length > 0 && (
            <div className="section">
              <div className="section-title">Projects</div>
              {projects.map((project, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div className="job-title">{project.name}</div>
                    {project.startDate && (
                      <div className="company-info">
                        <span className="job-dates">{project.startDate} - {project.endDate || 'Present'}</span>
                      </div>
                    )}
                  </div>
                  {project.description && (
                    <div className="job-description">
                      {stripHtmlTags(project.description)}
                    </div>
                  )}
                  {project.keywords && project.keywords.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#999999', fontStyle: 'italic' }}>
                      Technologies: {project.keywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Volunteer Experience Section */}
          {volunteer && volunteer.length > 0 && (
            <div className="section">
              <div className="section-title">Volunteer Experience</div>
              {volunteer.map((vol, index) => (
                <div key={index} className="experience-item">
                  <div className="experience-header">
                    <div className="job-title">{vol.position}</div>
                    <div className="company-info">
                      <span className="company-name">{vol.organization}</span> | <span className="job-dates">{vol.startDate} - {vol.endDate || 'Present'}</span>
                    </div>
                  </div>
                  {vol.summary && (
                    <div className="job-description">
                      {stripHtmlTags(vol.summary)}
                    </div>
                  )}
                  {vol.highlights && vol.highlights.length > 0 && (
                    <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                      {vol.highlights.map((highlight, hIndex) => (
                        <li key={hIndex} style={{ marginBottom: '4px', fontSize: '13px', lineHeight: '1.6', color: '#555555' }}>
                          {stripHtmlTags(highlight)}
                        </li>
                      ))}
                    </ul>
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
