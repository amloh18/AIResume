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
          font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 8.5in;
          margin: 0 auto;
          padding: 0.75in;
          background: white;
          color: #000;
          line-height: 1.4;
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 2rem;
        }

        .sidebar {
          background: #F0F0F0;
          padding: 1.5rem;
          border-radius: 8px;
        }

        .main-content {
          padding-left: 1rem;
        }

        .header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .name {
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0 0 0.5rem 0;
          color: #000;
        }

        .title {
          font-size: 1.1rem;
          color: #374151;
          margin: 0 0 1rem 0;
        }

        .divider {
          height: 1px;
          background: #D1D5DB;
          margin: 1rem 0;
        }

        .section-title {
          font-size: 0.9rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #000;
          margin: 0 0 0.75rem 0;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #D1D5DB;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
          font-size: 0.85rem;
          color: #374151;
        }

        .contact-icon {
          width: 14px;
          height: 14px;
          opacity: 0.7;
        }

        .skills-category {
          margin-bottom: 1rem;
        }

        .skills-category-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: #000;
          margin-bottom: 0.25rem;
        }

        .skills-list {
          font-size: 0.8rem;
          color: #6B7280;
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

        @media print {
          .data-driven-pro-template {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
        }
      `}</style>

      {/* Sidebar */}
      <div className="sidebar">
        {/* Contact */}
        <div>
          <h3 className="section-title">Contact</h3>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
            <span>{basics?.phone || '+84 909 123 456'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
            <span>{basics?.email || 'lehoangnhi@email.com'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            <span>{basics?.location?.address || 'Ho Chi Minh City, Vietnam'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
            <span>{basics?.profiles?.[0]?.url || 'linkedin.com/in/lehoangnhi'}</span>
          </div>
          <div className="contact-item">
            <svg className="contact-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            <span>{basics?.website || 'lehoangnhi.com'}</span>
          </div>
        </div>

        <div className="divider"></div>

        {/* Skills */}
        <div>
          <h3 className="section-title">Skills</h3>
          
          <div className="skills-category">
            <div className="skills-category-title">Programming Languages</div>
            <div className="skills-list">Python, R, SQL, Java, C++</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Libraries & Frameworks</div>
            <div className="skills-list">Pandas, NumPy, Scikit-learn, TensorFlow, Keras, PyTorch, Spark</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Tools & Platforms</div>
            <div className="skills-list">Jupyter, VS Code, Git, Docker, AWS, GCP, Azure</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Data Visualization</div>
            <div className="skills-list">Matplotlib, Seaborn, Plotly, Tableau, Power BI</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Machine Learning</div>
            <div className="skills-list">Regression, Classification, Clustering, NLP, Deep Learning</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Statistical Analysis</div>
            <div className="skills-list">Hypothesis Testing, A/B Testing, Time Series</div>
          </div>

          <div className="skills-category">
            <div className="skills-category-title">Other</div>
            <div className="skills-list">Data Cleaning, Feature Engineering, Model Deployment</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="header">
          <h1 className="name">{basics?.name || 'Le Hoang Nhi'}</h1>
          <p className="title">{basics?.label || 'Data Scientist'}</p>
        </div>

        <div className="divider"></div>

        {/* Summary */}
        <div>
          <h2 className="main-section-title">Summary</h2>
          <p className="summary-text">
            {basics?.summary || 'Experienced Data Scientist with expertise in machine learning, statistical analysis, and data visualization. Proven track record of developing and deploying ML models that drive business value and improve decision-making processes.'}
          </p>
        </div>

        {/* Work Experience */}
        <div>
          <h2 className="main-section-title">Work Experience</h2>
          {work?.map((job, index) => (
            <div key={index} className="experience-item">
              <div className="experience-header">
                <div>
                  <div className="job-title">{job.position}</div>
                  <div className="company-info">{job.company}, {job.location}</div>
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
                  <div className="institution-info">{edu.institution}, {edu.location}</div>
                  {edu.gpa && <div className="gpa">GPA: {edu.gpa}</div>}
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
