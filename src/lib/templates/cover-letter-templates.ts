export interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: 'cover-letter';
  tier: 'free' | 'premium';
  className?: string; // CSS class for the new hardcoded templates
  layout: {
    headerAlignment: 'left' | 'center' | 'right';
    datePosition: 'left' | 'right' | 'center';
    spacing: {
      paragraphSpacing: string;
      lineHeight: string;
      margins: {
        top: string;
        bottom: string;
        left: string;
        right: string;
      };
    };
    typography: {
      fontFamily: string;
      headerFontSize: string;
      bodyFontSize: string;
      dateFormat: string;
    };
    styling: {
      headerStyle: 'bold' | 'underline' | 'border' | 'minimal';
      useAccentColor: boolean;
      primaryColor: string;
      secondaryColor: string;
    };
  };
}

// Mapping from cover letter template IDs to CV template IDs
export const COVER_LETTER_TO_CV_TEMPLATE_MAP: Record<string, string> = {
  'data-driven-pro-cover-letter': 'data-driven-pro-template',
  'designer-modern-cover-letter': 'designer-modern-template',
  'elegant-timeline-cover-letter': 'elegant-timeline-template',
  'executive-professional-cover-letter': 'executive-professional-layout-template',
  'executive-standard-cover-letter': 'executive-standard-template',
  'tech-pro-blue-cover-letter': 'tech-pro-blue-template',
};

// CV template styling data (matching hardcoded-templates.ts)
const CV_TEMPLATE_STYLES: Record<string, {
  fontFamily: string;
  primaryColor: string;
  secondaryColor: string;
  fontSize: string;
  lineHeight: string;
}> = {
  'data-driven-pro-template': {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#1E40AF',
    secondaryColor: '#374151',
    fontSize: '14px',
    lineHeight: '1.4',
  },
  'designer-modern-template': {
    fontFamily: 'Helvetica Neue, sans-serif',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    fontSize: '14px',
    lineHeight: '1.6',
  },
  'elegant-timeline-template': {
    fontFamily: 'Playfair Display, serif',
    primaryColor: '#1F2937',
    secondaryColor: '#6B7280',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  'executive-professional-layout-template': {
    fontFamily: 'Montserrat, Arial, sans-serif',
    primaryColor: '#000000',
    secondaryColor: '#666666',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  'executive-standard-template': {
    fontFamily: 'Calibri, sans-serif',
    primaryColor: '#1E3A8A',
    secondaryColor: '#334155',
    fontSize: '14px',
    lineHeight: '1.3',
  },
  'tech-pro-blue-template': {
    fontFamily: 'Inter, sans-serif',
    primaryColor: '#2563EB',
    secondaryColor: '#374151',
    fontSize: '14px',
    lineHeight: '1.4',
  },
};

/**
 * Get CV template styling for a cover letter template
 */
export function getCVTemplateStyleForCoverLetter(coverLetterTemplateId: string) {
  const cvTemplateId = COVER_LETTER_TO_CV_TEMPLATE_MAP[coverLetterTemplateId];
  return cvTemplateId ? CV_TEMPLATE_STYLES[cvTemplateId] : null;
}

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  // 1. The "Zurich Minimalist"
  {
    id: 'zurich-minimalist',
    name: 'Zurich Minimalist',
    description: 'Clean, Swiss design. Pure black and white. Efficient and confident.',
    thumbnail: '/coverletter_templates_thumbnails/Zurich_Minimalist.png',
    category: 'cover-letter',
    tier: 'free',
    className: 'template-zurich',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.6', margins: { top: '40px', bottom: '40px', left: '40px', right: '40px' } },
      typography: { fontFamily: "'Inter', sans-serif", headerFontSize: '1.8rem', bodyFontSize: '0.9rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: false, primaryColor: '#222222', secondaryColor: '#555555' }
    }
  },
  // 2. The "Oxford Traditional"
  {
    id: 'oxford-traditional',
    name: 'Oxford Traditional',
    description: 'Academic, prestigious, trustworthy. Classic serif font with navy blue accent.',
    thumbnail: '/coverletter_templates_thumbnails/Oxford_Traditional.png',
    category: 'cover-letter',
    tier: 'free',
    className: 'template-oxford',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.7', margins: { top: '40px', bottom: '40px', left: '40px', right: '40px' } },
      typography: { fontFamily: "'Merriweather', Georgia, serif", headerFontSize: '2rem', bodyFontSize: '1.05rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'border', useAccentColor: true, primaryColor: '#333333', secondaryColor: '#003366' }
    }
  },
  // 3. The "Kyoto Sidebar"
  {
    id: 'kyoto-sidebar',
    name: 'Kyoto Sidebar',
    description: 'Organized, modern structure with a subtle grey left sidebar.',
    thumbnail: '/coverletter_templates_thumbnails/Kyoto_Sidebar.png',
    category: 'cover-letter',
    tier: 'premium',
    className: 'template-kyoto',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.7', margins: { top: '0', bottom: '0', left: '0', right: '0' } }, // Margins handled by CSS flex
      typography: { fontFamily: 'sans-serif', headerFontSize: '1.4rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: false, primaryColor: '#333333', secondaryColor: '#888888' }
    }
  },
  // 4. The "Stockholm Accent"
  {
    id: 'stockholm-accent',
    name: 'Stockholm Accent',
    description: 'Fresh, Scandinavian. Clean design with a distinct, muted colored bar.',
    thumbnail: '/coverletter_templates_thumbnails/Stockholm_Accent.png',
    category: 'cover-letter',
    tier: 'premium',
    className: 'template-stockholm',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '24px', lineHeight: '1.6', margins: { top: '50px', bottom: '50px', left: '50px', right: '50px' } },
      typography: { fontFamily: 'sans-serif', headerFontSize: '2.2rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: true, primaryColor: '#000000', secondaryColor: '#5F9EA0' }
    }
  },
  // 5. The "New York Bold"
  {
    id: 'new-york-bold',
    name: 'New York Bold',
    description: 'Confident, attention-grabbing. Heavy font weights for strong hierarchy.',
    thumbnail: '/coverletter_templates_thumbnails/New_York_Bold.png',
    category: 'cover-letter',
    tier: 'free',
    className: 'template-newyork',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.5', margins: { top: '40px', bottom: '40px', left: '40px', right: '40px' } },
      typography: { fontFamily: "'Roboto', sans-serif", headerFontSize: '2.5rem', bodyFontSize: '1.05rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'border', useAccentColor: false, primaryColor: '#1a1a1a', secondaryColor: '#1a1a1a' }
    }
  },
  // 6. The "Austin Warmth"
  {
    id: 'austin-warmth',
    name: 'Austin Warmth',
    description: 'Approachable, organic, friendly. Off-white background and charcoal text.',
    thumbnail: '/coverletter_templates_thumbnails/Austin_Warmth.png',
    category: 'cover-letter',
    tier: 'free',
    className: 'template-austin',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.8', margins: { top: '50px', bottom: '50px', left: '50px', right: '50px' } },
      typography: { fontFamily: 'Georgia, serif', headerFontSize: '1.8rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: true, primaryColor: '#3E3B36', secondaryColor: '#A0522D' }
    }
  },
  // 7. The "Berlin Structure"
  {
    id: 'berlin-structure',
    name: 'Berlin Structure',
    description: 'Industrial, disciplined, highly organized with distinct horizontal lines.',
    thumbnail: '/coverletter_templates_thumbnails/Berlin_Structure.png',
    category: 'cover-letter',
    tier: 'free',
    className: 'template-berlin',
    layout: {
      headerAlignment: 'center',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.6', margins: { top: '40px', bottom: '40px', left: '40px', right: '40px' } },
      typography: { fontFamily: "'Open Sans', sans-serif", headerFontSize: '1.4rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'border', useAccentColor: false, primaryColor: '#333333', secondaryColor: '#555555' }
    }
  },
  // 8. The "Vancouver Offset"
  {
    id: 'vancouver-offset',
    name: 'Vancouver Offset',
    description: 'Modern, tech-forward. Body content indented with a vertical guide.',
    thumbnail: '/coverletter_templates_thumbnails/Vancouver_Offset.png',
    category: 'cover-letter',
    tier: 'premium',
    className: 'template-vancouver',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '25px', lineHeight: '1.6', margins: { top: '50px', bottom: '50px', left: '50px', right: '50px' } },
      typography: { fontFamily: 'sans-serif', headerFontSize: '1.6rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: true, primaryColor: '#444444', secondaryColor: '#0056b3' }
    }
  },
  // 9. The "Milan Elegant"
  {
    id: 'milan-elegant',
    name: 'Milan Elegant',
    description: 'High-end, sophisticated. Centered content with subtle background gradient.',
    thumbnail: '/coverletter_templates_thumbnails/Milan_Elegant.png',
    category: 'cover-letter',
    tier: 'premium',
    className: 'template-milan',
    layout: {
      headerAlignment: 'center',
      datePosition: 'center',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.6', margins: { top: '60px', bottom: '60px', left: '60px', right: '60px' } },
      typography: { fontFamily: 'sans-serif', headerFontSize: '2rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: false, primaryColor: '#333333', secondaryColor: '#777777' }
    }
  },
  // 10. The "Seattle Geometric"
  {
    id: 'seattle-geometric',
    name: 'Seattle Geometric',
    description: 'Creative but professional. Subtle geometric background shape.',
    thumbnail: '/coverletter_templates_thumbnails/Seattle_Geometric.png',
    category: 'cover-letter',
    tier: 'premium',
    className: 'template-seattle',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: { paragraphSpacing: '20px', lineHeight: '1.6', margins: { top: '20px', bottom: '50px', left: '50px', right: '50px' } },
      typography: { fontFamily: 'sans-serif', headerFontSize: '2rem', bodyFontSize: '1rem', dateFormat: 'MM/DD/YYYY' },
      styling: { headerStyle: 'minimal', useAccentColor: true, primaryColor: '#2a2a2a', secondaryColor: '#4a90e2' }
    }
  }
];