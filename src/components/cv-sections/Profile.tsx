import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, stripHtmlTags } from '@/lib/utils/textFormatting';

interface ProfileProps {
  data: { summary?: string } | string;
  sectionConfig: ISectionBlueprint;
  template: ITemplate;
  cvData: UnifiedCVDataStructure;
}

const Profile: React.FC<ProfileProps> = ({ 
  data, 
  sectionConfig, 
  template, 
  cvData 
}) => {
  // Handle both object with summary property and direct string data
  let summaryText = '';
  if (typeof data === 'string') {
    summaryText = data;
  } else if (data && typeof data === 'object' && 'summary' in data) {
    summaryText = data.summary || '';
  }

  // Fallback to basics.summary if no direct data
  if (!summaryText && cvData.basics?.summary) {
    summaryText = cvData.basics.summary;
  }

  if (!summaryText) return null;

  return (
    <section className="profile-section">
      <h2 className="section-header">
        {sectionConfig.displayName || 'Profile'}
      </h2>
      
      <div className="profile-summary">
        <div 
          dangerouslySetInnerHTML={{ __html: parseFormattedText(stripHtmlTags(summaryText)) }}
        />
      </div>

      <style>{`
        .profile-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .profile-summary {
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
          color: ${template.globalStyles.secondaryColor};
        }

        .profile-summary p {
          margin: 0 0 8px 0;
        }

        .profile-summary p:last-child {
          margin-bottom: 0;
        }
        
        @media print {
          .profile-section {
            break-inside: avoid;
          }
        }
      `}</style>
    </section>
  );
};

export default Profile;

