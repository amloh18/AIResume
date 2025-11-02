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
  {
    id: 'professional-standard',
    name: 'Professional Standard',
    description: 'Traditional cover letter format with left-aligned header and formal styling',
    thumbnail: '/templates/cover-letter/professional-standard.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '16px',
        lineHeight: '1.6',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Times New Roman, serif',
        headerFontSize: '16px',
        bodyFontSize: '12px',
        dateFormat: 'MM/DD/YYYY',
      },
      styling: {
        headerStyle: 'bold',
        useAccentColor: false,
        primaryColor: '#000000',
        secondaryColor: '#333333',
      },
    },
  },
  {
    id: 'modern-executive',
    name: 'Modern Executive',
    description: 'Contemporary design with bold header and professional accent colors',
    thumbnail: '/templates/cover-letter/modern-executive.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '18px',
        lineHeight: '1.5',
        margins: {
          top: '35px',
          bottom: '35px',
          left: '35px',
          right: '35px',
        },
      },
      typography: {
        fontFamily: 'Calibri, sans-serif',
        headerFontSize: '18px',
        bodyFontSize: '11px',
        dateFormat: 'MMMM DD, YYYY',
      },
      styling: {
        headerStyle: 'border',
        useAccentColor: true,
        primaryColor: '#1E40AF',
        secondaryColor: '#374151',
      },
    },
  },
  {
    id: 'elegant-minimal',
    name: 'Elegant Minimal',
    description: 'Clean and sophisticated with centered header and ample white space',
    thumbnail: '/templates/cover-letter/elegant-minimal.png',
    category: 'cover-letter',
    tier: 'premium',
    layout: {
      headerAlignment: 'center',
      datePosition: 'left',
      spacing: {
        paragraphSpacing: '20px',
        lineHeight: '1.7',
        margins: {
          top: '50px',
          bottom: '50px',
          left: '50px',
          right: '50px',
        },
      },
      typography: {
        fontFamily: 'Georgia, serif',
        headerFontSize: '16px',
        bodyFontSize: '12px',
        dateFormat: 'MMMM DD, YYYY',
      },
      styling: {
        headerStyle: 'minimal',
        useAccentColor: false,
        primaryColor: '#1F2937',
        secondaryColor: '#6B7280',
      },
    },
  },
  {
    id: 'tech-modern',
    name: 'Tech Modern',
    description: 'Contemporary tech-focused design with clean lines and modern typography',
    thumbnail: '/templates/cover-letter/tech-modern.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '16px',
        lineHeight: '1.6',
        margins: {
          top: '40px',
          bottom: '40px',
          left: '45px',
          right: '45px',
        },
      },
      typography: {
        fontFamily: 'Inter, sans-serif',
        headerFontSize: '17px',
        bodyFontSize: '11px',
        dateFormat: 'DD MMM YYYY',
      },
      styling: {
        headerStyle: 'underline',
        useAccentColor: true,
        primaryColor: '#2563EB',
        secondaryColor: '#475569',
      },
    },
  },
  {
    id: 'creative-bold',
    name: 'Creative Bold',
    description: 'Stand out with bold typography and creative layout for design roles',
    thumbnail: '/templates/cover-letter/creative-bold.png',
    category: 'cover-letter',
    tier: 'premium',
    layout: {
      headerAlignment: 'left',
      datePosition: 'left',
      spacing: {
        paragraphSpacing: '18px',
        lineHeight: '1.5',
        margins: {
          top: '35px',
          bottom: '35px',
          left: '40px',
          right: '40px',
        },
      },
      typography: {
        fontFamily: 'Helvetica Neue, sans-serif',
        headerFontSize: '20px',
        bodyFontSize: '12px',
        dateFormat: 'MMMM YYYY',
      },
      styling: {
        headerStyle: 'bold',
        useAccentColor: true,
        primaryColor: '#7C3AED',
        secondaryColor: '#4B5563',
      },
    },
  },
  {
    id: 'compact-efficient',
    name: 'Compact Efficient',
    description: 'Space-efficient layout perfect for concise Cover letters',
    thumbnail: '/templates/cover-letter/compact-efficient.png',
    category: 'cover-letter',
    tier: 'free',
    layout: {
      headerAlignment: 'left',
      datePosition: 'right',
      spacing: {
        paragraphSpacing: '14px',
        lineHeight: '1.4',
        margins: {
          top: '30px',
          bottom: '30px',
          left: '35px',
          right: '35px',
        },
      },
      typography: {
        fontFamily: 'Arial, sans-serif',
        headerFontSize: '14px',
        bodyFontSize: '11px',
        dateFormat: 'MM/DD/YYYY',
      },
      styling: {
        headerStyle: 'minimal',
        useAccentColor: false,
        primaryColor: '#000000',
        secondaryColor: '#4B5563',
      },
    },
  },
];