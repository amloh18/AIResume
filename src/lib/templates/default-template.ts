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
  name: 'Modern Professional',
  description: 'A clean, professional template perfect for any industry. Features a clear layout with emphasis on readability and ATS compatibility.',
  thumbnail: '/templates/modern-professional-thumb.png',
  category: 'cv',
  categories: ['Professional', 'Modern'],
  tier: 'free',
  globalStyles: {
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    primaryColor: '#1f2937',
    secondaryColor: '#4b5563',
    backgroundColor: '#ffffff',
    fontSize: '11pt',
    lineHeight: '1.5',
    spacing: '20px',
    borderRadius: '0px',
    boxShadow: 'none',
    customCSS: `
      .cv-container {
        max-width: 8.5in;
        margin: 0 auto;
        background: white;
        box-shadow: 0 0 0 1px rgba(0,0,0,.1);
        min-height: 11in;
      }
      
      .section-header {
        font-weight: 600;
        font-size: 14pt;
        color: var(--primary-color);
        margin-bottom: 12px;
        border-bottom: 2px solid var(--primary-color);
        padding-bottom: 4px;
      }
      
      .section-content {
        margin-bottom: var(--spacing);
      }
      
      .experience-item, .education-item, .project-item {
        margin-bottom: 16px;
        page-break-inside: avoid;
      }
      
      .item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 4px;
      }
      
      .item-title {
        font-weight: 600;
        font-size: 12pt;
        color: var(--primary-color);
      }
      
      .item-subtitle {
        font-size: 11pt;
        color: var(--secondary-color);
        font-style: italic;
      }
      
      .item-date {
        font-size: 10pt;
        color: var(--secondary-color);
        white-space: nowrap;
      }
      
      .item-description {
        margin-top: 6px;
        line-height: var(--line-height);
      }
      
      .highlight-list {
        margin: 8px 0;
        padding-left: 16px;
      }
      
      .highlight-list li {
        margin-bottom: 4px;
        line-height: var(--line-height);
      }
      
      .skills-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
      }
      
      .skill-category {
        margin-bottom: 8px;
      }
      
      .skill-category-title {
        font-weight: 600;
        font-size: 11pt;
        color: var(--primary-color);
        margin-bottom: 4px;
      }
      
      .skill-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      
      .skill-tag {
        background: rgba(var(--primary-color-rgb), 0.1);
        color: var(--primary-color);
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 10pt;
        border: 1px solid rgba(var(--primary-color-rgb), 0.2);
      }
      
      .contact-info {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        margin-top: 8px;
        font-size: 10pt;
        color: var(--secondary-color);
      }
      
      .contact-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .personal-summary {
        margin: 12px 0;
        line-height: var(--line-height);
        text-align: justify;
      }
      
      @media print {
        .cv-container {
          box-shadow: none;
          margin: 0;
          max-width: none;
        }
        
        .section-content {
          page-break-inside: avoid;
        }
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
