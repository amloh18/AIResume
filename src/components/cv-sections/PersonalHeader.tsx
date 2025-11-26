import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, stripHtmlTags } from '@/lib/utils/textFormatting';

interface PersonalHeaderProps {
  data: UnifiedCVDataStructure['basics'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const PersonalHeader: React.FC<PersonalHeaderProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  if (!data) return null;

  const { name, email, phone, location, url, summary, profiles, image } = data;

  // Get relevant profiles
  const linkedinProfile = profiles?.find(p => p.network.toLowerCase() === 'linkedin');
  const githubProfile = profiles?.find(p => p.network.toLowerCase() === 'github');

  const formatLocation = () => {
    if (!location) return '';
    const parts = [location.city, location.region, location.countryCode].filter(Boolean);
    return parts.join(', ');
  };

  // Check if this template uses the header-section layout (like The Executive Accent)
  const usesHeaderSection = template?.globalStyles?.customCSS?.includes('.header-section');

  // If template uses header-section layout with image on right
  if (usesHeaderSection) {
    return (
      <header className="personal-header">
        <div className="header-section">
          {/* Left side: Personal info */}
          <div className="header-content">
            <h1 className="person-name">
              {name || 'Your Name'}
            </h1>
            
            {data.label && (
              <h2 className="person-title">
                {data.label}
              </h2>
            )}

            {/* Contact information - vertical layout */}
            <div className="contact-info">
              {email && (
                <div className="contact-item">
                  <span>Email: </span>
                  <a href={`mailto:${email}`} className="contact-link">
                    {email}
                  </a>
                </div>
              )}
              
              {phone && (
                <div className="contact-item">
                  <span>Phone: </span>
                  <a href={`tel:${phone}`} className="contact-link">
                    {phone}
                  </a>
                </div>
              )}
              
              {linkedinProfile && (
                <div className="contact-item">
                  <span>LinkedIn: </span>
                  <a href={linkedinProfile.url} target="_blank" rel="noopener noreferrer" className="contact-link">
                    {linkedinProfile.url.replace(/^https?:\/\/(www\.)?/, '')}
                  </a>
                </div>
              )}
              
              {location && formatLocation() && (
                <div className="contact-item">
                  <span>Location: </span>
                  <span>{formatLocation()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right side: Profile image */}
          {image && (
            <div className="header-image">
              <img src={image} alt={name || 'Profile'} className="profile-image" />
            </div>
          )}
        </div>

        {/* Professional summary is rendered separately as a section in this layout */}
        <style>{`
          .personal-header {
            margin-bottom: ${template?.globalStyles?.spacing || '16px'};
          }
        `}</style>
      </header>
    );
  }

  // Default layout (original)
  return (
    <header className="personal-header">
      {/* Name and title */}
      <div className="header-main">
        <h1 className="person-name" style={{ 
          fontSize: 'clamp(20pt, 5vw, 24pt)',
          fontWeight: '700',
          color: template?.globalStyles?.primaryColor || '#1f2937',
          margin: '0 0 4px 0',
          lineHeight: '1.2'
        }}>
          {name || 'Your Name'}
        </h1>
        
        {data.label && (
          <h2 className="person-title" style={{
            fontSize: '14pt',
            fontWeight: '400',
            color: template?.globalStyles?.secondaryColor || '#6b7280',
            margin: '0 0 12px 0',
            fontStyle: 'italic'
          }}>
            {data.label}
          </h2>
        )}
      </div>

      {/* Contact information */}
      <div className="contact-info">
        {email && (
          <div className="contact-item">
            <a href={`mailto:${email}`} className="contact-link">
              {email}
            </a>
          </div>
        )}
        
        {phone && (
          <div className="contact-item">
            <a href={`tel:${phone}`} className="contact-link">
              {phone}
            </a>
          </div>
        )}
        
        {location && formatLocation() && (
          <div className="contact-item">
            <span>{formatLocation()}</span>
          </div>
        )}
        
        {url && (
          <div className="contact-item">
            <a href={url} target="_blank" rel="noopener noreferrer" className="contact-link">
              {url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        
        {linkedinProfile && (
          <div className="contact-item">
            <a href={linkedinProfile.url} target="_blank" rel="noopener noreferrer" className="contact-link">
              LinkedIn
            </a>
          </div>
        )}
        
        {githubProfile && (
          <div className="contact-item">
            <a href={githubProfile.url} target="_blank" rel="noopener noreferrer" className="contact-link">
              GitHub
            </a>
          </div>
        )}
      </div>

      {/* Professional summary */}
      {summary && (
        <div className="personal-summary">
          <div 
            style={{
              margin: '0',
              fontSize: template?.globalStyles?.fontSize || '14px',
              lineHeight: template?.globalStyles?.lineHeight || '1.6',
              color: template?.globalStyles?.primaryColor || '#1f2937',
              textAlign: 'justify'
            }}
            dangerouslySetInnerHTML={{ __html: parseFormattedText(stripHtmlTags(summary)) }}
          />
        </div>
      )}

      <style>{`
        .personal-header {
          margin-bottom: ${template?.globalStyles?.spacing || '16px'};
          padding-bottom: 0;
          border-bottom: none;
        }
        
        .contact-info {
          display: flex;
          flex-wrap: wrap;
          gap: 0;
          margin: 4px 0 12px 0;
          font-size: 10pt;
          color: ${template?.globalStyles?.primaryColor || '#1f2937'};
        }
        
        .contact-item {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        
        .contact-item:not(:last-child)::after {
          content: ' / ';
          margin: 0 6px;
          color: ${template?.globalStyles?.primaryColor || '#1f2937'};
        }
        
        .contact-link {
          color: inherit;
          text-decoration: none;
        }
        
        .contact-link:hover {
          color: inherit;
          text-decoration: none;
        }
        
        .personal-summary {
          margin-top: 12px;
          margin-bottom: 20px;
          padding-top: 0;
          border-top: none;
          line-height: 1.5;
        }
        
        .personal-summary p {
          text-align: justify;
        }
        
        @media print {
          .contact-link {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>
    </header>
  );
};

export default PersonalHeader;
