'use client';

import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { renderFormattedText } from '@/lib/utils/textFormatting';

interface TheModernCVTemplateProps {
  cvData: UnifiedCVDataStructure;
  className?: string;
}

export const TheModernCVTemplate: React.FC<TheModernCVTemplateProps> = ({ 
  cvData, 
  className = '' 
}) => {
  const { basics, work, education, skills, projects, languages } = cvData;

  return (
    <div className={`data-driven-pro-template ${className}`}>
      <style jsx>{`
        .data-driven-pro-template {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 8.5in;
          min-height: 11in;
          margin: 0 auto;
          padding: 0.75in;
          background: white;
          color: #111827;
          line-height: 1.5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }

        .flex-container {
          display: flex;
          gap: 2rem;
        }

        .sidebar {
          width: 1.25rem; /* 20px */
          background: #111827;
          flex-shrink: 0;
          height: calc(11in - 1.5in); /* Full page height minus padding */
        }

        .main-content {
          flex-grow: 1;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }

        .name {
          font-size: 2.5rem; /* 40px */
          font-weight: 700;
          margin: 0;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 1px;
          line-height: 1.1;
        }

        .title {
          font-size: 1rem; /* 16px */
          color: #374151;
          margin: 0.5rem 0 0 0;
          text-transform: uppercase;
          font-weight: 500;
          letter-spacing: 2px;
        }

        .contact-info {
          text-align: right;
          flex-shrink: 0;
          padding-left: 1rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: flex-end;
          margin-bottom: 4px;
        }

        .contact-text {
          font-size: 0.9rem; /* 14.4px */
          color: #374151;
          border-bottom: 1px solid #D1D5DB;
          padding-bottom: 2px;
          line-height: 1.2;
        }

        .contact-icon {
          font-size: 0.8rem; /* 12.8px */
          font-weight: 700;
          color: #111827;
          width: 16px;
          text-align: center;
        }

        /* Body */
        .body-container {
          display: grid;
          grid-template-columns: minmax(0, 2fr) 1px minmax(0, 1fr); /* ~66% / 33% split */
          gap: 1.5rem;
        }

        .left-column {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        .vertical-divider {
          background-color: #D1D5DB;
          width: 1px;
          height: 100%;
        }

        .right-column {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Left Column Sections */
        .section-title-left {
          font-size: 1rem; /* 16px */
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #111827;
          margin: 0 0 1.5rem 0;
        }

        .summary-section {
          margin-bottom: 2rem;
        }

        .summary-text {
          font-size: 0.9rem; /* 14.4px */
          color: #4B5563;
          line-height: 1.6;
        }

        .work-section {
          margin-bottom: 2rem;
        }

        .work-item {
          margin-bottom: 1.5rem;
        }

        .job-title {
          font-size: 1rem; /* 16px */
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .company-info {
          font-size: 0.9rem; /* 14.4px */
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.75rem;
        }

        .bullet-list {
          list-style: none;
          padding-left: 1.25rem; /* 20px */
          margin: 0;
        }

        .bullet-list li {
          font-size: 0.9rem; /* 14.4px */
          color: #4B5563;
          line-height: 1.6;
          position: relative;
          margin-bottom: 0.25rem;
        }

        .bullet-list li::before {
          content: '•';
          position: absolute;
          left: -1.25rem; /* -20px */
          top: 0;
          color: #111827;
          font-size: 1.1rem;
          line-height: 1.5;
        }
        
        .project-item {
          font-size: 0.9rem;
          color: #4B5563;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }
        
        .project-name {
          font-weight: 700;
          color: #111827;
        }
        
        .project-link {
          color: #4B5563;
          text-decoration: underline;
          margin-left: 0.25rem;
        }

        /* Right Column Sections */
        .profile-picture {
          width: 100%;
          object-fit: cover;
          margin-bottom: 2rem;
        }

        .section-title-right {
          font-size: 1rem; /* 16px */
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #111827;
          margin: 0 0 1rem 0;
          border-bottom: 2px solid #111827;
          padding-bottom: 0.25rem;
        }
        
        .right-section {
          margin-bottom: 2rem;
        }

        .education-item {
          margin-bottom: 1rem;
        }

        .degree {
          font-size: 0.9rem; /* 14.4px */
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .institution {
          font-size: 0.9rem; /* 14.4px */
          color: #4B5563;
          margin: 0;
        }

        .education-dates {
          font-size: 0.8rem; /* 12.8px */
          color: #6B7280;
          margin: 0;
        }

        .skill-category {
          margin-bottom: 1rem;
        }

        .skill-category-title {
          font-size: 0.9rem; /* 14.4px */
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .skill-list {
          list-style: none;
          padding-left: 0;
          margin: 0;
        }

        .skill-list li {
          font-size: 0.9rem; /* 14.4px */
          color: #4B5563;
          margin-bottom: 2px;
          line-height: 1.5;
        }
        
        .language-item {
          font-size: 0.9rem;
          color: #4B5563;
          margin-bottom: 2px;
          line-height: 1.5;
        }

        @media print {
          .data-driven-pro-template {
            box-shadow: none;
            margin: 0;
            padding: 0.5in;
          }
          .sidebar {
            height: calc(11in - 1in);
          }
        }
      `}</style>

      <div className="flex-container">
        {/* Sidebar */}
        <div className="sidebar"></div>

        {/* Main Content Area */}
        <div className="main-content">
          
          {/* Header Section */}
          <header className="header">
            <div className="header-main">
              <h1 className="name">{basics?.name || 'Alexander William Smith'}</h1>
              <h2 className="title">{basics?.label || 'Software Engineer'}</h2>
            </div>
            <div className="contact-info">
              <div className="contact-item">
                <span className="contact-text">{basics?.phone || '+1 555 456 7890'}</span>
                <span className="contact-icon">M</span>
              </div>
              <div className="contact-item">
                <span className="contact-text">{basics?.email || 'alexander.smith@mail.com'}</span>
                <span className="contact-icon">@</span>
              </div>
              <div className="contact-item">
                <span className="contact-text">{basics?.url || 'www.alexander-website.com'}</span>
                <span className="contact-icon">W</span>
              </div>
              <div className="contact-item">
                <span className="contact-text">{basics?.location?.address || '23 St, Tec City Los Angeles, CA'}</span>
                <span className="contact-icon">📍</span>
              </div>
            </div>
          </header>

          {/* Body Columns */}
          <div className="body-container">
            
            {/* Left Column */}
            <div className="left-column">
              
              <section className="summary-section">
                <h3 className="section-title-left">Summary</h3>
                <p className="summary-text">
                  {basics?.summary || 'Dynamic Software Engineer with over 5 years of experience specializing in backend architecture and system design. Adept at leading teams and integrating new innovative solutions to increase efficiency and scalability. Successfully led projects resulting in a 40% increase in performance metrics. Proficient in agile methodologies and ready to bring technical acumen to a progressive team.'}
                </p>
              </section>

              <section className="work-section">
                <h3 className="section-title-left">Work Experience</h3>
                {work?.map((job, index) => (
                  <div key={index} className="work-item">
                    <h4 className="job-title">{job.position}</h4>
                    <p className="company-info">{job.name} | {job.startDate} – {job.endDate}</p>
                    <ul className="bullet-list">
                      {job.highlights?.map((hl, idx) => (
                        <li 
                          key={idx}
                          dangerouslySetInnerHTML={{ __html: renderFormattedText(hl) }}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
                {(!work || work.length === 0) && (
                  <>
                    <div className="work-item">
                      <h4 className="job-title">Lead Software Engineer</h4>
                      <p className="company-info">Digital Innovations Inc | June 2021 – Present</p>
                      <ul className="bullet-list">
                        <li>Orchestrated a diverse team of 10 engineers effectively in developing innovative and scalable software solutions, significantly improving project delivery by 35%.</li>
                        <li>Adapted legacy systems to new, improved B2B and B2C platforms, greatly enhancing system interoperability, functionality, and overall performance.</li>
                        <li>Optimized complex data systems, resulting in a 20% increase in performance.</li>
                        <li>Led the strategic planning and execution of a company-wide cloud migration, significantly improving overall team efficiency and effective collaboration.</li>
                        <li>Spearheaded the development of a machine learning-based analytics tool, enhancing data-driven decision-making.</li>
                      </ul>
                    </div>
                    <div className="work-item">
                      <h4 className="job-title">Software Engineer</h4>
                      <p className="company-info">CloudTech Solutions | July 2018 – May 2021</p>
                      <ul className="bullet-list">
                        <li>Developed 8 cloud-based applications, improving main system reliability by 30%.</li>
                        <li>Actively participated in the entire software development lifecycle, from initial concept and deployment to maintenance, regularly delivering on-time project.</li>
                        <li>Collaborated with cross-functional teams to integrate user-friendly features.</li>
                        <li>Streamlined the deployment process effectively using advanced and cutting-edge tools (DevOps technologies), significantly reducing deployment time by 25%.</li>
                        <li>Designed and implemented robust security protocols, ensuring the integrity and confidentiality of data.</li>
                      </ul>
                    </div>
                  </>
                )}
              </section>

              <section className="projects-section">
                <h3 className="section-title-left">Projects</h3>
                {projects?.map((proj, index) => (
                   <div key={index} className="project-item">
                     <strong className="project-name">{proj.name}:</strong>
                     <span className="project-desc"> {proj.description} </span>
                     {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="project-link">[link]</a>}
                   </div>
                ))}
                {(!projects || projects.length === 0) && (
                  <>
                    <div className="project-item">
                      <strong className="project-name">E-commerce Platform:</strong>
                      <span className="project-desc"> A scalable solution for online retail. </span>
                      <a href="#" className="project-link">[link]</a>
                    </div>
                    <div className="project-item">
                      <strong className="project-name">Health Tracking App:</strong>
                      <span className="project-desc"> Complex app for monitoring daily health metrics. </span>
                      <a href="#" className="project-link">[link]</a>
                    </div>
                  </>
                )}
              </section>
            </div>

            {/* Vertical Divider */}
            <div className="vertical-divider"></div>

            {/* Right Column */}
            <div className="right-column">
              
              <img 
                src={basics?.image || 'https://i.imgur.com/example.jpg'} // Placeholder URL, replace with a real one or user's
                alt={basics?.name || 'Profile Picture'} 
                className="profile-picture"
                onError={(e) => (e.currentTarget.src = 'https://i.imgur.com/QmWd5vY.png')} // Generic placeholder
              />
              
              <section className="education-section right-section">
                <h3 className="section-title-right">Education</h3>
                {education?.map((edu, index) => (
                  <div key={index} className="education-item">
                    <h4 className="degree">{edu.studyType} {edu.area ? `in ${edu.area}` : ''}</h4>
                    <p className="institution">{edu.institution}</p>
                    <p className="education-dates">{edu.startDate} – {edu.endDate}</p>
                  </div>
                ))}
                {(!education || education.length === 0) && (
                  <div className="education-item">
                    <h4 className="degree">Master of Science in Software Engineering</h4>
                    <p className="institution">Stanford University</p>
                    <p className="education-dates">Sep 2016 - Jun 2018</p>
                  </div>
                )}
              </section>

              <section className="skills-section right-section">
                <h3 className="section-title-right">Skills</h3>
                {skills?.map((skillCat, index) => (
                  <div key={index} className="skill-category">
                    <h4 className="skill-category-title">{skillCat.category}</h4>
                    <ul className="skill-list">
                      {skillCat.skills?.map((skill, idx) => <li key={idx}>{skill}</li>)}
                    </ul>
                  </div>
                ))}
                {(!skills || skills.length === 0) && (
                  <>
                    <div className="skill-category">
                      <h4 className="skill-category-title">Technical</h4>
                      <ul className="skill-list">
                        <li>System Architecture</li>
                        <li>Java & Python</li>
                        <li>RESTful APIs</li>
                        <li>Agile & Scrum</li>
                        <li>Problem-Solving</li>
                        <li>Leadership</li>
                      </ul>
                    </div>
                    <div className="skill-category">
                      <h4 className="skill-category-title">Professional</h4>
                      <ul className="skill-list">
                        <li>Effective Communication</li>
                        <li>Strategic Planning</li>
                        <li>Decision Making</li>
                        <li>Time Management</li>
                        <li>Adaptability & Flexibility</li>
                      </ul>
                    </div>
                  </>
                )}
              </section>

              <section className="languages-section right-section">
                 <h3 className="section-title-right">Languages</h3>
                 <ul className="skill-list">
                   {languages?.map((lang, index) => (
                      <li key={index} className="language-item">
                        {lang.language}: {lang.fluency}
                      </li>
                   ))}
                   {(!languages || languages.length === 0) && (
                      <>
                        <li className="language-item">English: Fluent</li>
                        <li className="language-item">Spanish: Intermediate</li>
                      </>
                   )}
                 </ul>
              </section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
