import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

interface ExecutiveStandardTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const ExecutiveStandardTemplate: React.FC<ExecutiveStandardTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills, certifications } = cvData;

  return (
    <div className={`executive-standard-template ${className}`}>
      <style jsx>{`
        .executive-standard-template {
          font-family: 'Times New Roman', serif;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.75in;
          background: white;
          color: #000;
          line-height: 1.4;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .name {
          font-family: 'Arial', sans-serif;
          font-size: 2.2rem;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 0.5rem 0;
          color: #000;
        }

        .title {
          font-family: 'Arial', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 1rem 0;
        }

        .contact-info {
          font-family: 'Arial', sans-serif;
          font-size: 0.9rem;
          color: #374151;
          margin-bottom: 1rem;
        }

        .contact-separator {
          margin: 0 0.5rem;
          color: #6B7280;
        }

        .divider {
          height: 1px;
          background: #000;
          margin: 1.5rem 0;
        }

        .section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-family: 'Arial', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #000;
        }

        .summary-text {
          font-size: 0.95rem;
          line-height: 1.5;
          color: #374151;
        }

        .experience-item, .education-item, .certification-item {
          margin-bottom: 1.5rem;
        }

        .experience-header, .education-header, .certification-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .job-title, .degree-title, .certification-title {
          font-weight: 700;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .company-name, .institution-name, .certification-issuer {
          font-size: 0.95rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .location {
          font-size: 0.9rem;
          color: #6B7280;
        }

        .dates {
          font-size: 0.9rem;
          color: #6B7280;
          text-align: right;
        }

        .experience-description {
          margin-top: 0.5rem;
        }

        .bullet-point {
          margin: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
          font-size: 0.9rem;
          color: #374151;
        }

        .bullet-point::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #000;
        }

        .skills-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .skills-category {
          margin-bottom: 1rem;
        }

        .skills-category-title {
          font-weight: 700;
          font-size: 0.9rem;
          color: #000;
          margin-bottom: 0.5rem;
        }

        .skills-list {
          font-size: 0.85rem;
          color: #374151;
          line-height: 1.4;
        }

        .certification-year {
          font-size: 0.9rem;
          color: #6B7280;
          text-align: right;
        }

        @media print {
          .executive-standard-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>

      {/* Header */}
      <div className="header">
        <h1 className="name">{basics?.name || 'MICHAEL BROWN'}</h1>
        <p className="title">{basics?.label || 'PROJECT MANAGER'}</p>
        <div className="contact-info">
          {basics?.location?.address || '456 Business Ave, Cityville, USA'}
          <span className="contact-separator">|</span>
          {basics?.phone || '(555) 789-0123'}
          <span className="contact-separator">|</span>
          {basics?.email || 'michael.brown@email.com'}
          <span className="contact-separator">|</span>
          {basics?.profiles?.[0]?.url || 'linkedin.com/in/michaelbrown'}
        </div>
      </div>

      <div className="divider"></div>

      {/* Summary */}
      <div className="section">
        <h2 className="section-title">Summary</h2>
        <p className="summary-text">
          {basics?.summary || 'Results-oriented Project Manager with extensive experience leading cross-functional teams and delivering complex projects on time and within budget. Proven expertise in Agile methodologies, stakeholder management, and process improvement initiatives.'}
        </p>
      </div>

      {/* Experience */}
      <div className="section">
        <h2 className="section-title">Experience</h2>
        {work?.map((job, index) => (
          <div key={index} className="experience-item">
            <div className="experience-header">
              <div>
                <div className="job-title">{job.position}</div>
                <div className="company-name">{job.company}</div>
                <div className="location">{job.location}</div>
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
      <div className="section">
        <h2 className="section-title">Education</h2>
        {education?.map((edu, index) => (
          <div key={index} className="education-item">
            <div className="education-header">
              <div>
                <div className="degree-title">{edu.studyType} {edu.area}</div>
                <div className="institution-name">{edu.institution}</div>
                <div className="location">{edu.location}</div>
                {edu.gpa && <div style={{ fontSize: '0.9rem', color: '#6B7280', marginTop: '0.25rem' }}>GPA: {edu.gpa}</div>}
              </div>
              <div className="dates">{edu.startDate} – {edu.endDate}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Skills */}
      <div className="section">
        <h2 className="section-title">Skills</h2>
        <div className="skills-grid">
          <div className="skills-category">
            <div className="skills-category-title">Project Management</div>
            <div className="skills-list">Agile, Scrum, Waterfall, Risk Management, Budgeting, Stakeholder Management</div>
          </div>
          <div className="skills-category">
            <div className="skills-category-title">Software</div>
            <div className="skills-list">Jira, Asana, Microsoft Project, Trello, Slack</div>
          </div>
          <div className="skills-category">
            <div className="skills-category-title">Leadership</div>
            <div className="skills-list">Team Leadership, Mentoring, Conflict Resolution, Communication, Negotiation</div>
          </div>
          <div className="skills-category">
            <div className="skills-category-title">Other</div>
            <div className="skills-list">Strategic Planning, Process Improvement, Data Analysis, Problem Solving</div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div className="section">
          <h2 className="section-title">Certifications</h2>
          {certifications.map((cert, index) => (
            <div key={index} className="certification-item">
              <div className="certification-header">
                <div>
                  <div className="certification-title">{cert.name}</div>
                  <div className="certification-issuer">{cert.issuer}</div>
                </div>
                <div className="certification-year">{cert.date}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
