import React from 'react';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { CVDataStructure } from '@/types/cv';
import { ISectionBlueprint, ITemplate } from '@/models/Template';

interface PersonalHeaderProps {
  data: CVDataStructure['basics'];
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: CVDataStructure;
}

const PersonalHeader: React.FC<PersonalHeaderProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  if (!data) return null;

  const { name, email, phone, location, url, summary, profiles } = data;

  // Get relevant profiles
  const linkedinProfile = profiles?.find(p => p.network.toLowerCase() === 'linkedin');
  const githubProfile = profiles?.find(p => p.network.toLowerCase() === 'github');

  const formatLocation = () => {
    if (!location) return '';
    const parts = [location.city, location.region, location.countryCode].filter(Boolean);
    return parts.join(', ');
  };

  return (
    <header className="personal-header">
      {/* Name and title */}
      <div className="header-main">
        <h1 className="person-name" style={{ 
          fontSize: 'clamp(20pt, 5vw, 24pt)',
          fontWeight: '700',
          color: template.globalStyles.primaryColor,
          margin: '0 0 4px 0',
          lineHeight: '1.2'
        }}>
          {name || 'Your Name'}
        </h1>
        
        {data.label && (
          <h2 className="person-title" style={{
            fontSize: '14pt',
            fontWeight: '400',
            color: template.globalStyles.secondaryColor,
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
            <Mail size={12} />
            <a href={`mailto:${email}`} className="contact-link">
              {email}
            </a>
          </div>
        )}
        
        {phone && (
          <div className="contact-item">
            <Phone size={12} />
            <a href={`tel:${phone}`} className="contact-link">
              {phone}
            </a>
          </div>
        )}
        
        {location && formatLocation() && (
          <div className="contact-item">
            <MapPin size={12} />
            <span>{formatLocation()}</span>
          </div>
        )}
        
        {url && (
          <div className="contact-item">
            <Globe size={12} />
            <a href={url} target="_blank" rel="noopener noreferrer" className="contact-link">
              {url.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
        
        {linkedinProfile && (
          <div className="contact-item">
            <Linkedin size={12} />
            <a href={linkedinProfile.url} target="_blank" rel="noopener noreferrer" className="contact-link">
              LinkedIn
            </a>
          </div>
        )}
        
        {githubProfile && (
          <div className="contact-item">
            <Github size={12} />
            <a href={githubProfile.url} target="_blank" rel="noopener noreferrer" className="contact-link">
              GitHub
            </a>
          </div>
        )}
      </div>

      {/* Professional summary */}
      {summary && (
        <div className="personal-summary">
          <p style={{
            margin: '0',
            fontSize: template.globalStyles.fontSize,
            lineHeight: template.globalStyles.lineHeight,
            color: template.globalStyles.primaryColor
          }}>
            {summary}
          </p>
        </div>
      )}

      <style jsx>{`
        .personal-header {
          margin-bottom: ${template.globalStyles.spacing};
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(0,0,0,0.1);
        }
        
        .contact-info {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin: 12px 0;
          font-size: 10pt;
          color: ${template.globalStyles.secondaryColor};
        }
        
        .contact-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .contact-link {
          color: inherit;
          text-decoration: none;
        }
        
        .contact-link:hover {
          color: ${template.globalStyles.primaryColor};
          text-decoration: underline;
        }
        
        .personal-summary {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(0,0,0,0.05);
        }
        
        @media (max-width: 768px) {
          .contact-info {
            flex-direction: column;
            gap: 8px;
          }
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
