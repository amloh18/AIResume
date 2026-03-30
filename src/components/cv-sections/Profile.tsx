import React from 'react';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { ISectionBlueprint, ITemplate } from '@/models/Template';
import { parseFormattedText, stripHtmlTags } from '@/lib/utils/textFormatting';
import { appendEnforcedCSS } from '@/lib/templates/shared-layout-css';

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
  let summaryText = '';
  if (typeof data === 'string') {
    summaryText = data;
  } else if (data && typeof data === 'object' && 'summary' in data) {
    summaryText = data.summary || '';
  }

  if (!summaryText && cvData.basics?.summary) {
    summaryText = cvData.basics.summary;
  }

  if (!summaryText) return null;

  return (
    <section className="profile-section section-content">
      <h2 className="section-header cv-section-header">
        {sectionConfig.displayName || 'Profile'}
      </h2>
      
      <div className="profile-summary entry-content item-content">
        <div 
          dangerouslySetInnerHTML={{ __html: parseFormattedText(stripHtmlTags(summaryText)) }}
        />
      </div>

      <style>{appendEnforcedCSS(`
        .profile-section {
          margin-bottom: ${template.globalStyles.spacing};
        }
        
        .profile-summary {
          font-size: ${template.globalStyles.fontSize};
          line-height: ${template.globalStyles.lineHeight};
          color: ${template.globalStyles.secondaryColor};
          max-width: 100%;
        }

        .profile-summary p {
          margin: 0 0 8px 0;
          orphans: 2;
          widows: 2;
        }

        .profile-summary p:last-child {
          margin-bottom: 0;
        }
        
        @media print {
          .profile-section {
            break-inside: avoid;
          }
          .section-header,
          .cv-section-header {
            break-after: avoid;
          }
        }
      `)}</style>
    </section>
  );
};

export default Profile;
