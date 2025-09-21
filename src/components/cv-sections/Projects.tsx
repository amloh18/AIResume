import React from 'react';
import { Calendar, ExternalLink, Github, FolderOpen } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface ProjectsProps {
  data: CVDataStructure['projects'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: CVDataStructure;
}

const Projects: React.FC<ProjectsProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  if (!data || data.length === 0) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    } catch {
      return dateString;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return `${start} - ${end}`;
  };

  const isGithubUrl = (url: string) => {
    return url && url.toLowerCase().includes('github.com');
  };

  return (
    <section className="projects-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Projects'}
      </h2>
      
      <div className="projects-list">
        {data.map((project, index) => (
          <div key={index} className="project-item">
            <div className="item-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  <FolderOpen size={16} className="project-icon" />
                  {project.name || 'Project Name'}
                </h3>
                <div className="project-links">
                  {project.url && (
                    <a 
                      href={project.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="project-link"
                      aria-label={`View ${project.name} project`}
                    >
                      {isGithubUrl(project.url) ? (
                        <Github size={14} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                      <span className="link-text">
                        {isGithubUrl(project.url) ? 'GitHub' : 'View Project'}
                      </span>
                    </a>
                  )}
                </div>
              </div>
              
              {(project.startDate || project.endDate) && (
                <div className="item-date">
                  <Calendar size={12} />
                  <span>
                    {formatDateRange(project.startDate, project.endDate)}
                  </span>
                </div>
              )}
            </div>

            {project.description && (
              <div className="project-description">
                <p>{project.description}</p>
              </div>
            )}

            {project.highlights && project.highlights.length > 0 && (
              <ul className="highlight-list">
                {project.highlights.map((highlight, highlightIndex) => (
                  <li key={highlightIndex}>
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .projects-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .project-item {
          page-break-inside: avoid;
          margin-bottom: 14px;
          border-left: 2px solid ${template.globalStyles.primaryColor}20;
          padding-left: 16px;
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          gap: 16px;
        }
        
        .item-title-group {
          flex: 1;
          min-width: 0;
        }
        
        .item-title {
          font-size: 12pt;
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
          margin: 0 0 6px 0;
          line-height: 1.3;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .project-icon {
          color: ${template.globalStyles.secondaryColor};
          opacity: 0.8;
        }
        
        .project-links {
          display: flex;
          gap: 12px;
        }
        
        .project-link {
          display: flex;
          align-items: center;
          gap: 4px;
          color: ${template.globalStyles.secondaryColor};
          text-decoration: none;
          font-size: 10pt;
          font-weight: 500;
          transition: color 0.2s ease;
        }
        
        .project-link:hover {
          color: ${template.globalStyles.primaryColor};
        }
        
        .link-text {
          font-size: 9pt;
        }
        
        .item-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
          white-space: nowrap;
          min-width: 120px;
          justify-content: flex-end;
        }
        
        .project-description {
          margin: 8px 0;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }
        
        .project-description p {
          margin: 0;
          text-align: justify;
        }
        
        .highlight-list {
          margin: 8px 0 0 16px;
          padding: 0;
        }
        
        .highlight-list li {
          margin-bottom: 4px;
          line-height: ${template.globalStyles.lineHeight};
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
        }
        
        @media (max-width: 768px) {
          .item-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          .item-date {
            text-align: left;
            min-width: auto;
            justify-content: flex-start;
          }
          
          .project-links {
            flex-wrap: wrap;
            gap: 8px;
          }
        }
        
        @media print {
          .project-link {
            color: inherit !important;
          }
          
          .project-item {
            break-inside: avoid;
            border-left: 1px solid rgba(0,0,0,0.2) !important;
          }
        }
      `}</style>
    </section>
  );
};

export default Projects;
