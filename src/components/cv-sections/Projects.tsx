import React from 'react';
import { Calendar, ExternalLink, Github, FolderOpen } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, formatDate, formatDateRange } from '@/lib/utils/textFormatting';
import { generateEnforcedCSS } from '@/lib/templates/shared-layout-css';

interface ProjectsProps {
  data: UnifiedCVDataStructure['projects'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
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
    <section 
      className="projects-section section-content"
      data-section-id="projects"
      data-section-type="projects"
    >
      <h2 className="section-header cv-section-header">
        {sectionConfig.displayName || 'Projects'}
      </h2>
      
      <div className="projects-list entry-list">
        {data.map((project, index) => (
          <div 
            key={index} 
            className="project-item cv-entry-item entry-block"
            data-entry-index={index}
          >
            <div className="item-header entry-header">
              <div className="item-title-group">
                <h3 className="item-title">
                  {project.name || 'Project Name'}
                  {project.url && (
                    <span className="project-link">
                      {isGithubUrl(project.url) ? ' (GitHub)' : ' (Project Link)'}
                    </span>
                  )}
                </h3>
              </div>
              
              {(project.startDate || project.endDate) && (
                <div className="item-date-group">
                  <div className="item-date">
                    {formatDateRange(project.startDate, project.endDate)}
                  </div>
                </div>
              )}
            </div>

            {project.description && (
              <div className="project-description entry-content item-content">
                <div 
                  dangerouslySetInnerHTML={{ __html: parseFormattedText(project.description) }}
                />
              </div>
            )}

            {project.highlights && project.highlights.length > 0 && (
              <ul className="item-highlights">
                {project.highlights.map((highlight, hIndex) => (
                  <li key={hIndex} className="bullet-point">
                    {highlight}
                  </li>
                ))}
              </ul>
            )}

            {project.keywords && project.keywords.length > 0 && (
              <div className="project-keywords">
                <strong>Technologies: </strong>
                {project.keywords.join(' • ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
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
        
        .project-description {
          text-align: justify;
        }
        
        .project-keywords {
          margin: 8px 0;
          padding: 8px;
          background: ${template.globalStyles.primaryColor}10;
          border-radius: 6px;
          font-size: 9pt;
          color: ${template.globalStyles.primaryColor};
          line-height: 1.4;
        }
        
        .project-keywords strong {
          font-weight: 600;
          color: ${template.globalStyles.primaryColor};
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
        
        .project-description p {
          orphans: 2;
          widows: 2;
        }

        .item-highlights {
          max-width: 75%;
          margin: 4px 0;
          padding-left: 18px;
          color: ${template.globalStyles.primaryColor};
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
        }

        .bullet-point {
          orphans: 2;
          widows: 2;
        }

        @media print {
          .project-link {
            color: inherit !important;
          }
          
          .project-item,
          .cv-entry-item {
            break-inside: avoid;
            page-break-inside: avoid;
            border-left: 1px solid rgba(0,0,0,0.2) !important;
          }
          .section-header,
          .cv-section-header {
            break-after: avoid;
          }
        }

        ${generateEnforcedCSS()}
      `}</style>
    </section>
  );
};

export default Projects;
