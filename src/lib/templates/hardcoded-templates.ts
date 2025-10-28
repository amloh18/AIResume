import { ITemplate } from '@/models/Template';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

// Import hardcoded template components
import { DataDrivenProTemplate } from './custom-renderers/DataDrivenProTemplate';
import { DesignerModernTemplate } from './custom-renderers/DesignerModernTemplate';
import { ElegantTimelineTemplate } from './custom-renderers/ElegantTimelineTemplate';
import { ExecutiveProfessionalLayoutTemplate } from './custom-renderers/ExecutiveProfessionalLayoutTemplate';
import { ExecutiveStandardTemplate } from './custom-renderers/ExecutiveStandardTemplate';
import { ProfessionalExtendedTemplate } from './custom-renderers/ProfessionalExtendedTemplate';
import { TechProBlueTemplate } from './custom-renderers/TechProBlueTemplate';

// Hardcoded template registry
export const CustomTemplates = {
  DataDrivenProTemplate,
  DesignerModernTemplate,
  ElegantTimelineTemplate,
  ExecutiveProfessionalLayoutTemplate,
  ExecutiveStandardTemplate,
  ProfessionalExtendedTemplate,
  TechProBlueTemplate
};

// Hardcoded template definitions
export const HARDCODED_TEMPLATES: ITemplate[] = [
  {
    _id: 'data-driven-pro-template',
    id: 'data-driven-pro-template',
    name: 'Data Driven Pro',
    description: 'Professional template designed for data scientists, analysts, and technical professionals',
    thumbnail: '/templates/IMG_0521.JPG',
    category: 'cv',
    categories: ['Professional', 'Technical'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#1E40AF',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'DataDrivenProTemplate'
  },
  {
    _id: 'designer-modern-template',
    id: 'designer-modern-template',
    name: 'Designer Modern',
    description: 'Contemporary template with modern typography and clean design aesthetics',
    thumbnail: '/templates/IMG_0524.jpg',
    category: 'cv',
    categories: ['Creative', 'Modern'],
    tier: 'premium',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Helvetica Neue, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.6',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'DesignerModernTemplate'
  },
  {
    _id: 'elegant-timeline-template',
    id: 'elegant-timeline-template',
    name: 'Elegant Timeline',
    description: 'Sophisticated template with timeline-based layout and elegant typography',
    thumbnail: '/templates/IMG_0527.jpg',
    category: 'cv',
    categories: ['Elegant', 'Professional'],
    tier: 'premium',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Playfair Display, serif',
      primaryColor: '#1F2937',
      secondaryColor: '#6B7280',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: true,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'ElegantTimelineTemplate'
  },
  {
    _id: 'executive-professional-layout-template',
    id: 'executive-professional-layout-template',
    name: 'Executive Professional',
    description: 'Professional layout designed for executive-level positions',
    thumbnail: '/CV templates/Elegant-Script-Header-Design.png',
    category: 'cv',
    categories: ['Professional', 'Executive'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Montserrat, Arial, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#666666',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.5',
      spacing: '1.5rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'ExecutiveProfessionalLayoutTemplate'
  },
  {
    _id: 'executive-standard-template',
    id: 'executive-standard-template',
    name: 'Executive Standard',
    description: 'Standard executive template with traditional corporate styling',
    thumbnail: '/templates/executive-accent-thumb.png',
    category: 'cv',
    categories: ['Executive', 'Professional'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Calibri, sans-serif',
      primaryColor: '#1E3A8A',
      secondaryColor: '#334155',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'awards', 'languages']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'ExecutiveStandardTemplate'
  },
  {
    _id: 'professional-extended-template',
    id: 'professional-extended-template',
    name: 'Professional Extended',
    description: 'Comprehensive professional template with extended sections and detailed layout',
    thumbnail: '/templates/executive-accent-thumb.png',
    category: 'cv',
    categories: ['Professional', 'Comprehensive'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Calibri, sans-serif',
      primaryColor: '#000000',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.3',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates', 'languages', 'awards']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'ProfessionalExtendedTemplate'
  },
  {
    _id: 'tech-pro-blue-template',
    id: 'tech-pro-blue-template',
    name: 'Tech Pro Blue',
    description: 'Technical professional template with blue accent colors and modern design',
    thumbnail: '/templates/modern-professional-thumb.png',
    category: 'cv',
    categories: ['Technical', 'Professional'],
    tier: 'free',
    layoutType: 'one-column',
    globalStyles: {
      fontFamily: 'Inter, sans-serif',
      primaryColor: '#2563EB',
      secondaryColor: '#374151',
      backgroundColor: '#ffffff',
      fontSize: '14px',
      lineHeight: '1.4',
      spacing: '1.2rem',
      borderRadius: '0px',
      boxShadow: 'none',
      customCSS: ''
    },
    columnLayout: {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills', 'projects', 'certificates']
      }
    },
    sectionStyling: {},
    availableSections: [],
    templateData: {},
    isActive: true,
    isDefault: false,
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    customRenderer: 'TechProBlueTemplate'
  }
];

// Generate preview data for hardcoded templates
export const generateHardcodedTemplatePreview = (templateId: string): UnifiedCVDataStructure => {
  return {
    basics: {
      name: 'John Doe',
      label: 'Software Engineer',
      image: '',
      email: 'john.doe@email.com',
      phone: '+1 (555) 123-4567',
      url: 'https://johndoe.dev',
      summary: 'Experienced software engineer with expertise in full-stack development, cloud technologies, and agile methodologies. Proven track record of delivering scalable solutions and collaborating effectively with cross-functional teams.',
      location: {
        address: '123 Main Street',
        postalCode: '12345',
        city: 'San Francisco',
        countryCode: 'US',
        region: 'CA'
      },
      profiles: [
        { network: 'LinkedIn', username: 'johndoe', url: 'https://linkedin.com/in/johndoe' },
        { network: 'GitHub', username: 'johndoe', url: 'https://github.com/johndoe' }
      ]
    },
    work: [
      {
        name: 'Tech Solutions Inc.',
        position: 'Senior Software Engineer',
        url: 'https://techsolutions.com',
        startDate: '2021-01',
        endDate: '',
        summary: 'Leading development of scalable web applications and mentoring junior developers.',
        highlights: [
          'Developed and maintained scalable backend services using Node.js and Express',
          'Implemented new features for customer-facing web application using React and Redux',
          'Collaborated with product managers and designers to define project requirements',
          'Participated in code reviews and contributed to improving code quality'
        ],
        location: 'San Francisco, CA'
      },
      {
        name: 'StartupXYZ',
        position: 'Full Stack Developer',
        url: 'https://startupxyz.com',
        startDate: '2019-06',
        endDate: '2020-12',
        summary: 'Built full-stack applications from scratch using modern web technologies.',
        highlights: [
          'Built responsive web applications using React, Node.js, and MongoDB',
          'Implemented RESTful APIs and database design',
          'Collaborated with design team to create user-friendly interfaces'
        ],
        location: 'San Francisco, CA'
      }
    ],
    volunteer: [],
    education: [
      {
        institution: 'University of California, Berkeley',
        url: 'https://berkeley.edu',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2015-09',
        endDate: '2019-05',
        score: '3.8 GPA',
        courses: [],
        location: 'Berkeley, CA'
      }
    ],
    awards: [
      {
        title: 'Employee of the Year',
        date: '2022',
        awarder: 'Tech Solutions Inc.',
        summary: 'Recognized for outstanding performance and leadership'
      }
    ],
    certificates: [],
    publications: [],
    skills: [
      {
        name: 'Programming Languages',
        level: 'Advanced',
        keywords: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++']
      },
      {
        name: 'Frameworks & Libraries',
        level: 'Advanced',
        keywords: ['React', 'Node.js', 'Express', 'Django', 'Spring Boot']
      },
      {
        name: 'Tools & Technologies',
        level: 'Intermediate',
        keywords: ['Git', 'Docker', 'AWS', 'MongoDB', 'PostgreSQL']
      }
    ],
    languages: [
      { language: 'English', fluency: 'Native' },
      { language: 'Spanish', fluency: 'Intermediate' }
    ],
    interests: [
      { name: 'Technology', keywords: ['AI', 'Machine Learning', 'Web Development'] },
      { name: 'Sports', keywords: ['Basketball', 'Running'] }
    ],
    references: [],
    projects: [
      {
        name: 'E-commerce Platform',
        startDate: '2023-01',
        endDate: '2023-03',
        description: 'Full-stack e-commerce application with user authentication, product catalog, and payment integration.',
        highlights: [
          'Built responsive frontend using React and Material-UI',
          'Developed RESTful API using Node.js and Express',
          'Implemented secure payment processing with Stripe',
          'Deployed application on AWS with CI/CD pipeline'
        ],
        url: 'https://github.com/johndoe/ecommerce-platform',
        keywords: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe', 'AWS']
      }
    ]
  };
};