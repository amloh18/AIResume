export interface CoverLetterTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: 'cover-letter';
  tier: 'free' | 'premium';
  layout: {
    headerAlignment: 'left' | 'center' | 'right';
    datePosition: 'left' | 'right';
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

export const COVER_LETTER_TEMPLATES: CoverLetterTemplate[] = [
  // Cover letter templates derived from first 6 CV templates
  {
    id: 'data-driven-pro-cover-letter',
    name: 'Data Driven Pro',
    description: 'Professional cover letter template designed for data scientists, analysts, and technical professionals',
    thumbnail: '/templates/cover-letter/data-driven-pro.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '16px',
        lineHeight: '1.4',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headerFontSize: '16px',
        bodyFontSize: '12px',
        dateFormat: 'MMM DD, YYYY',
      },
      styling: {
        headerStyle: 'underline',
        useAccentColor: true,
        primaryColor: '#1E40AF',
        secondaryColor: '#374151',
      },
    },
  },
  {
    id: 'designer-modern-cover-letter',
    name: 'Designer Modern',
    description: 'Contemporary cover letter template with modern typography and clean design aesthetics',
    thumbnail: '/templates/cover-letter/designer-modern.png',
    category: 'cover-letter',
    tier: 'premium',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '18px',
        lineHeight: '1.6',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Helvetica Neue, sans-serif',
        headerFontSize: '18px',
        bodyFontSize: '12px',
        dateFormat: 'MMMM DD, YYYY',
      },
      styling: {
        headerStyle: 'minimal',
        useAccentColor: false,
        primaryColor: '#000000',
        secondaryColor: '#666666',
      },
    },
  },
  {
    id: 'elegant-timeline-cover-letter',
    name: 'Elegant Timeline',
    description: 'Sophisticated cover letter template with elegant typography and professional layout',
    thumbnail: '/templates/cover-letter/elegant-timeline.png',
    category: 'cover-letter',
    tier: 'premium',
    layout: {
      headerAlignment: 'center',
      datePosition: 'left',
      spacing: {
        paragraphSpacing: '20px',
        lineHeight: '1.5',
        margins: {
          top: '45px',
          bottom: '45px',
          left: '45px',
          right: '45px',
        },
      },
      typography: {
        fontFamily: 'Playfair Display, serif',
        headerFontSize: '17px',
        bodyFontSize: '12px',
        dateFormat: 'MMMM DD, YYYY',
      },
      styling: {
        headerStyle: 'border',
        useAccentColor: false,
        primaryColor: '#1F2937',
        secondaryColor: '#6B7280',
      },
    },
  },
  {
    id: 'executive-professional-cover-letter',
    name: 'Executive Professional',
    description: 'Professional cover letter template designed for executive-level positions',
    thumbnail: '/templates/cover-letter/executive-professional.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '18px',
        lineHeight: '1.5',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Montserrat, Arial, sans-serif',
        headerFontSize: '17px',
        bodyFontSize: '12px',
        dateFormat: 'MMMM DD, YYYY',
      },
      styling: {
        headerStyle: 'bold',
        useAccentColor: false,
        primaryColor: '#000000',
        secondaryColor: '#666666',
      },
    },
  },
  {
    id: 'executive-standard-cover-letter',
    name: 'Executive Standard',
    description: 'Standard executive cover letter template with traditional corporate styling',
    thumbnail: '/templates/cover-letter/executive-standard.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '16px',
        lineHeight: '1.3',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Calibri, sans-serif',
        headerFontSize: '16px',
        bodyFontSize: '11px',
        dateFormat: 'MM/DD/YYYY',
      },
      styling: {
        headerStyle: 'bold',
        useAccentColor: true,
        primaryColor: '#1E3A8A',
        secondaryColor: '#334155',
      },
    },
  },
  {
    id: 'tech-pro-blue-cover-letter',
    name: 'Tech Pro Blue',
    description: 'Technical professional cover letter template with blue accent colors and modern design',
    thumbnail: '/templates/cover-letter/tech-pro-blue.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '16px',
        lineHeight: '1.4',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headerFontSize: '16px',
        bodyFontSize: '12px',
        dateFormat: 'MMM DD, YYYY',
      },
      styling: {
        headerStyle: 'underline',
        useAccentColor: true,
        primaryColor: '#2563EB',
        secondaryColor: '#374151',
      },
    },
  },
];