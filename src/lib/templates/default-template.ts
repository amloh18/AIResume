import { ITemplate, ISectionBlueprint } from '@/models/Template';

// Default section blueprints for the CV template system
export const defaultSectionBlueprints: ISectionBlueprint[] = [
  {
    key: 'personal_header',
    displayName: 'Personal Information',
    componentName: 'PersonalHeader',
    isList: false,
    defaultItemContent: {
      name: '',
      email: '',
      phone: '',
      location: { city: '', region: '', country: '' },
      website: '',
      linkedin: '',
      github: '',
      summary: ''
    },
    description: 'Header section with personal contact information',
    icon: 'user',
    category: 'header',
    minItems: 1,
    maxItems: 1
  },
  {
    key: 'work_experience',
    displayName: 'Work Experience',
    componentName: 'WorkExperience',
    isList: true,
    defaultItemContent: {
      name: '',
      position: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    },
    description: 'Professional work experience with achievements',
    icon: 'briefcase',
    category: 'experience',
    minItems: 0,
    maxItems: 20
  },
  {
    key: 'education',
    displayName: 'Education',
    componentName: 'Education',
    isList: true,
    defaultItemContent: {
      institution: '',
      area: '',
      studyType: '',
      startDate: '',
      endDate: '',
      score: '',
      courses: []
    },
    description: 'Educational background and qualifications',
    icon: 'graduation-cap',
    category: 'education',
    minItems: 0,
    maxItems: 10
  },
  {
    key: 'skills',
    displayName: 'Skills',
    componentName: 'Skills',
    isList: false,
    defaultItemContent: {
      skills: []
    },
    description: 'Technical and professional skills',
    icon: 'code',
    category: 'skills',
    minItems: 1,
    maxItems: 1
  },
  {
    key: 'projects',
    displayName: 'Projects',
    componentName: 'Projects',
    isList: true,
    defaultItemContent: {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      highlights: [],
      url: ''
    },
    description: 'Notable projects and achievements',
    icon: 'folder-open',
    category: 'projects',
    minItems: 0,
    maxItems: 15
  },
  {
    key: 'certificates',
    displayName: 'Certifications',
    componentName: 'Certificates',
    isList: true,
    defaultItemContent: {
      name: '',
      issuer: '',
      date: '',
      url: ''
    },
    description: 'Professional certifications and credentials',
    icon: 'award',
    category: 'certifications',
    minItems: 0,
    maxItems: 20
  },
  {
    key: 'languages',
    displayName: 'Languages',
    componentName: 'Languages',
    isList: true,
    defaultItemContent: {
      language: '',
      fluency: 'intermediate'
    },
    description: 'Language proficiencies',
    icon: 'globe',
    category: 'languages',
    minItems: 0,
    maxItems: 10
  },
  {
    key: 'volunteer',
    displayName: 'Volunteer Experience',
    componentName: 'Volunteer',
    isList: true,
    defaultItemContent: {
      organization: '',
      position: '',
      startDate: '',
      endDate: '',
      summary: '',
      highlights: []
    },
    description: 'Volunteer work and community involvement',
    icon: 'heart',
    category: 'volunteer',
    minItems: 0,
    maxItems: 10
  },
  {
    key: 'awards',
    displayName: 'Awards & Recognition',
    componentName: 'Awards',
    isList: true,
    defaultItemContent: {
      title: '',
      date: '',
      awarder: '',
      summary: ''
    },
    description: 'Awards, honors, and recognition received',
    icon: 'trophy',
    category: 'awards',
    minItems: 0,
    maxItems: 15
  },
  {
    key: 'publications',
    displayName: 'Publications',
    componentName: 'Publications',
    isList: true,
    defaultItemContent: {
      name: '',
      publisher: '',
      releaseDate: '',
      url: '',
      summary: ''
    },
    description: 'Academic and professional publications',
    icon: 'book',
    category: 'publications',
    minItems: 0,
    maxItems: 20
  }
];

// Default professional template
export const defaultProfessionalTemplate: Omit<ITemplate, '_id' | 'createdAt' | 'updatedAt'> = {
  name: 'The Modern Professional',
  description: 'A clean, professional template perfect for any industry. Features a clear layout with emphasis on readability and ATS compatibility.',
  thumbnail: '/templates/modern-professional-thumb.png',
  category: 'cv',
  categories: ['Professional', 'Modern'],
  tier: 'free',
  globalStyles: {
    fontFamily: 'Calibri, Arial, sans-serif',
    primaryColor: '#000000',
    secondaryColor: '#000000',
    backgroundColor: '#ffffff',
    fontSize: '11pt',
    lineHeight: '1.2',
    spacing: '16px',
    borderRadius: '0px',
    boxShadow: 'none',
    customCSS: `
      .cv-container {
        max-width: 8.5in;
        margin: 0 auto;
        background: white;
        min-height: 11in;
        padding: 0.5in 0.5in;
      }
      
      .section-header {
        font-weight: 700;
        font-size: 12pt;
        color: #000000;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
        border-bottom: 1px solid #000000;
        padding-bottom: 2px;
      }
      
      .section-content {
        margin-bottom: 16px;
      }
      
      .experience-item, .education-item, .project-item {
        margin-bottom: 18px;
        page-break-inside: avoid;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-bottom: 6px;
      }
      
      .item-title {
        font-weight: 700;
        font-size: 11pt;
        color: #000000;
        flex: 1;
      }
      
      .item-subtitle {
        font-size: 11pt;
        color: #000000;
        font-weight: 400;
      }
      
      .item-date {
        font-size: 11pt;
        font-weight: 700;
        color: #000000;
        white-space: nowrap;
        text-align: right;
        margin-left: 16px;
      }
      
      .item-description {
        margin-top: 4px;
        line-height: 1.2;
        text-align: justify;
      }
      
      .highlight-list {
        margin: 4px 0;
        padding-left: 20px;
        list-style-type: disc;
      }
      
      .highlight-list li {
        margin-bottom: 3px;
        line-height: 1.2;
        font-size: 11pt;
        color: #000000;
      }
      
      .skills-grid {
        display: block;
      }
      
      .skill-category {
        margin-bottom: 6px;
        line-height: 1.2;
      }
      
      .skill-category-title {
        font-weight: 700;
        font-size: 11pt;
        color: #000000;
        display: inline;
        margin-right: 6px;
      }
      
      .skill-tags {
        display: inline;
      }
      
      .skill-tag {
        display: inline;
        font-size: 11pt;
        color: #000000;
        font-weight: 400;
      }
      
      .skill-tag:not(:last-child)::after {
        content: ', ';
      }
      
      .contact-info {
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        margin-top: 4px;
        margin-bottom: 12px;
        font-size: 10pt;
        color: #000000;
      }
      
      .contact-item {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      
      .contact-item:not(:last-child)::after {
        content: ' / ';
        margin: 0 6px;
      }
      
      .personal-summary {
        margin: 8px 0 12px 0;
        line-height: 1.5;
        text-align: justify;
        font-size: 11pt;
      }
      
      .personal-summary p {
        text-align: justify;
      }
      
      .item-summary, .item-description, .project-description, .education-description {
        text-align: justify;
      }
      
      .item-summary p, .item-description p, .project-description p, .education-description p {
        text-align: justify;
      }
      
      /* ATS-Friendly Professional Styling */
      .person-name {
        font-size: 16pt !important;
        font-weight: 700 !important;
        color: #000000 !important;
        margin: 0 0 4px 0 !important;
        line-height: 1.2 !important;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      
      .person-title {
        font-size: 11pt !important;
        font-weight: 400 !important;
        color: #000000 !important;
        margin: 0 0 8px 0 !important;
        font-style: normal !important;
      }
      
      .company-name, .institution-name {
        font-weight: 400 !important;
        font-style: normal !important;
      }
      
      .education-item .item-header {
        margin-bottom: 4px;
      }
      
      @media print {
        .cv-container {
          box-shadow: none;
          margin: 0;
          max-width: none;
          padding: 1in;
        }
        
        .section-content {
          page-break-inside: avoid;
        }
        
        .experience-item, .education-item, .project-item {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .section-header {
          page-break-after: avoid;
          break-after: avoid;
        }
        
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
      
      /* General page break rules */
      .experience-item, .education-item, .project-item {
        break-inside: avoid;
        page-break-inside: avoid;
      }
      
      .section-header {
        break-after: avoid;
        page-break-after: avoid;
      }
    `
  },
  availableSections: defaultSectionBlueprints,
  templateData: {
    // Sample data for preview
    sampleBasics: {
      name: 'John Smith',
      email: 'john.smith@email.com',
      phone: '+1 (555) 123-4567',
      location: { city: 'San Francisco', region: 'CA', country: 'US' },
      summary: 'Experienced software engineer with 5+ years developing scalable web applications. Passionate about clean code, user experience, and team collaboration.'
    },
    sampleWork: [
      {
        name: 'Tech Innovations Inc.',
        position: 'Senior Software Engineer',
        startDate: '2021-03',
        endDate: '',
        summary: 'Lead development of customer-facing web applications serving 100k+ users.',
        highlights: [
          'Reduced page load times by 40% through optimization',
          'Led team of 4 developers on major product redesign',
          'Implemented CI/CD pipeline reducing deployment time by 60%'
        ]
      },
      {
        name: 'Digital Solutions LLC',
        position: 'Full Stack Developer',
        startDate: '2019-06',
        endDate: '2021-02',
        summary: 'Developed and maintained multiple client projects using modern web technologies.',
        highlights: [
          'Built responsive web applications for 15+ clients',
          'Integrated third-party APIs and payment systems',
          'Mentored junior developers and conducted code reviews'
        ]
      }
    ],
    sampleEducation: [
      {
        institution: 'University of California, Berkeley',
        area: 'Computer Science',
        studyType: 'Bachelor of Science',
        startDate: '2015-09',
        endDate: '2019-05',
        score: '3.7 GPA'
      }
    ],
    sampleSkills: [
      {
        name: 'Programming Languages',
        keywords: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go']
      },
      {
        name: 'Frontend',
        keywords: ['React', 'Next.js', 'Vue.js', 'HTML/CSS', 'Tailwind CSS']
      },
      {
        name: 'Backend',
        keywords: ['Node.js', 'Express', 'Django', 'PostgreSQL', 'MongoDB']
      },
      {
        name: 'Tools & Technologies',
        keywords: ['Git', 'Docker', 'AWS', 'Jenkins', 'Jest']
      }
    ]
  },
  isActive: true,
  isDefault: true,
  isPublished: true,
  globalAccess: true,
  version: 1
};

// CSS variable injection for dynamic theming
export const generateTemplateCSS = (globalStyles: ITemplate['globalStyles']): string => {
  const { primaryColor, secondaryColor, backgroundColor, fontFamily, fontSize, lineHeight, spacing } = globalStyles;
  
  // Convert hex color to RGB for alpha transparency usage
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result 
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '0, 0, 0';
  };

  return `
    :root {
      --primary-color: ${primaryColor};
      --primary-color-rgb: ${hexToRgb(primaryColor)};
      --secondary-color: ${secondaryColor};
      --background-color: ${backgroundColor};
      --font-family: ${fontFamily};
      --font-size: ${fontSize};
      --line-height: ${lineHeight};
      --spacing: ${spacing};
    }
    
    body {
      font-family: var(--font-family);
      font-size: var(--font-size);
      line-height: var(--line-height);
      color: var(--primary-color);
      background-color: var(--background-color);
    }
  `;
};
