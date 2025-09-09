import { Template } from '@/lib/stores/templateStore';

export const industryTemplates: Template[] = [
    {
        id: 'modern-professional',
        name: 'Modern Professional',
        description: 'Clean and modern design perfect for corporate roles and business professionals',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Inter, system-ui, sans-serif',
            primaryColor: '#1f2937',
            secondaryColor: '#6b7280',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.6',
            spacing: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { border-bottom: 2px solid #1f2937; padding-bottom: 1rem; }
        .cv-section { margin-bottom: 1.5rem; }
        .cv-section-title { font-weight: 600; color: #1f2937; border-bottom: 1px solid #e5e7eb; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Personal Information', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Work Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'projects', displayName: 'Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: true,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'creative-designer',
        name: 'Creative Designer',
        description: 'Bold and creative layout perfect for designers, artists, and creative professionals',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Montserrat, system-ui, sans-serif',
            primaryColor: '#7c3aed',
            secondaryColor: '#a855f7',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.7',
            spacing: '28px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: white; padding: 2rem; border-radius: 12px; }
        .cv-section { margin-bottom: 2rem; }
        .cv-section-title { font-weight: 700; color: #7c3aed; font-size: 1.25rem; }
        .cv-highlight { background: linear-gradient(135deg, #7c3aed20 0%, #a855f720 100%); padding: 0.5rem; border-radius: 8px; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Personal Information', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Work Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'projects', displayName: 'Portfolio Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Skills & Tools', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'minimalist-clean',
        name: 'Minimalist Clean',
        description: 'Simple and elegant design with focus on content and readability',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Source Sans Pro, system-ui, sans-serif',
            primaryColor: '#374151',
            secondaryColor: '#6b7280',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.8',
            spacing: '20px',
            borderRadius: '4px',
            boxShadow: 'none',
            customCSS: `
        .cv-header { border-bottom: 1px solid #e5e7eb; padding-bottom: 1.5rem; }
        .cv-section { margin-bottom: 1.25rem; }
        .cv-section-title { font-weight: 500; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; font-size: 0.875rem; }
        .cv-content { font-weight: 300; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Personal Information', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'executive-premium',
        name: 'Executive Premium',
        description: 'Sophisticated design for senior-level positions and executive roles',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Playfair Display, Georgia, serif',
            primaryColor: '#1e293b',
            secondaryColor: '#475569',
            backgroundColor: '#ffffff',
            fontSize: '15px',
            lineHeight: '1.6',
            spacing: '32px',
            borderRadius: '6px',
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
            customCSS: `
        .cv-header { border-bottom: 3px solid #1e293b; padding-bottom: 2rem; text-align: center; }
        .cv-section { margin-bottom: 2.5rem; }
        .cv-section-title { font-weight: 600; color: #1e293b; font-size: 1.125rem; border-bottom: 1px solid #cbd5e1; padding-bottom: 0.5rem; }
        .cv-name { font-size: 2.5rem; font-weight: 400; }
        .cv-title { font-size: 1.25rem; color: #475569; font-style: italic; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Executive Profile', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Professional Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education & Qualifications', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Core Competencies', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'certificates', displayName: 'Certifications', componentName: 'CertificatesSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'tech-modern',
        name: 'Tech Modern',
        description: 'Contemporary design tailored for technology professionals and developers',
        category: 'cv',
        globalStyles: {
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            primaryColor: '#0ea5e9',
            secondaryColor: '#64748b',
            backgroundColor: '#ffffff',
            fontSize: '13px',
            lineHeight: '1.7',
            spacing: '24px',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.5rem; }
        .cv-section { margin-bottom: 1.5rem; }
        .cv-section-title { font-weight: 600; color: #0ea5e9; font-family: 'Inter', sans-serif; }
        .cv-tech-stack { background: #f1f5f9; padding: 0.5rem; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
        .cv-code { background: #1e293b; color: #e2e8f0; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Developer Profile', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Work Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'projects', displayName: 'Technical Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Technical Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'academic-formal',
        name: 'Academic Formal',
        description: 'Traditional format ideal for academic positions and research roles',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Times New Roman, Times, serif',
            primaryColor: '#1f2937',
            secondaryColor: '#4b5563',
            backgroundColor: '#ffffff',
            fontSize: '12px',
            lineHeight: '1.5',
            spacing: '16px',
            borderRadius: '0px',
            boxShadow: 'none',
            customCSS: `
        .cv-header { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 1rem; }
        .cv-section { margin-bottom: 1rem; }
        .cv-section-title { font-weight: bold; color: #1f2937; text-transform: uppercase; font-size: 0.875rem; }
        .cv-publication { font-style: italic; margin-bottom: 0.5rem; }
        .cv-date { font-weight: normal; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Personal Information', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'work', displayName: 'Academic Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'publications', displayName: 'Publications', componentName: 'PublicationsSection', isList: true, defaultItemContent: {} },
            { key: 'certificates', displayName: 'Honors & Awards', componentName: 'CertificatesSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'sales-dynamic',
        name: 'Sales Dynamic',
        description: 'Energetic design perfect for sales professionals and business development roles',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Roboto, system-ui, sans-serif',
            primaryColor: '#dc2626',
            secondaryColor: '#ef4444',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.6',
            spacing: '24px',
            borderRadius: '10px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 2rem; border-radius: 10px; }
        .cv-section { margin-bottom: 1.5rem; }
        .cv-section-title { font-weight: 700; color: #dc2626; }
        .cv-achievement { background: #fef2f2; border-left: 4px solid #dc2626; padding: 0.75rem; margin: 0.5rem 0; }
        .cv-metric { font-weight: bold; color: #dc2626; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Sales Profile', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Sales Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Sales Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'certificates', displayName: 'Certifications', componentName: 'CertificatesSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'healthcare-professional',
        name: 'Healthcare Professional',
        description: 'Clean and trustworthy design for medical and healthcare professionals',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Lato, system-ui, sans-serif',
            primaryColor: '#059669',
            secondaryColor: '#10b981',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.6',
            spacing: '20px',
            borderRadius: '6px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { border-bottom: 2px solid #059669; padding-bottom: 1.5rem; }
        .cv-section { margin-bottom: 1.25rem; }
        .cv-section-title { font-weight: 600; color: #059669; }
        .cv-license { background: #ecfdf5; border: 1px solid #10b981; padding: 0.5rem; border-radius: 6px; }
        .cv-certification { color: #059669; font-weight: 500; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Professional Profile', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Clinical Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Medical Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'certificates', displayName: 'Licenses & Certifications', componentName: 'CertificatesSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Clinical Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'finance-corporate',
        name: 'Finance Corporate',
        description: 'Professional and conservative design for finance and banking professionals',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Georgia, Times, serif',
            primaryColor: '#1e40af',
            secondaryColor: '#3b82f6',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.5',
            spacing: '20px',
            borderRadius: '4px',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            customCSS: `
        .cv-header { border-bottom: 3px solid #1e40af; padding-bottom: 1.5rem; text-align: center; }
        .cv-section { margin-bottom: 1.5rem; }
        .cv-section-title { font-weight: 600; color: #1e40af; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
        .cv-financial-metric { background: #eff6ff; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600; }
        .cv-achievement { color: #1e40af; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Professional Summary', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Professional Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Technical Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'certificates', displayName: 'Professional Certifications', componentName: 'CertificatesSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    },
    {
        id: 'marketing-creative',
        name: 'Marketing Creative',
        description: 'Vibrant and engaging design for marketing and communications professionals',
        category: 'cv',
        globalStyles: {
            fontFamily: 'Open Sans, system-ui, sans-serif',
            primaryColor: '#f59e0b',
            secondaryColor: '#fbbf24',
            backgroundColor: '#ffffff',
            fontSize: '14px',
            lineHeight: '1.7',
            spacing: '24px',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            customCSS: `
        .cv-header { background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%); color: white; padding: 2rem; border-radius: 12px; }
        .cv-section { margin-bottom: 1.75rem; }
        .cv-section-title { font-weight: 700; color: #f59e0b; }
        .cv-campaign { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 1rem; margin: 0.5rem 0; border-radius: 0 8px 8px 0; }
        .cv-metric { background: #f59e0b; color: white; padding: 0.25rem 0.5rem; border-radius: 20px; font-size: 0.875rem; }
      `
        },
        availableSections: [
            { key: 'basics', displayName: 'Marketing Profile', componentName: 'PersonalInfoSection', isList: false, defaultItemContent: {} },
            { key: 'work', displayName: 'Marketing Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: {} },
            { key: 'projects', displayName: 'Campaigns & Projects', componentName: 'ProjectsSection', isList: true, defaultItemContent: {} },
            { key: 'skills', displayName: 'Marketing Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: {} },
            { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: {} }
        ],
        isActive: true,
        isDefault: false,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }
];

export const getTemplateById = (id: string): Template | undefined => {
    return industryTemplates.find(template => template.id === id);
};

export const getTemplatesByCategory = (category: string): Template[] => {
    if (category === 'All') return industryTemplates;
    return industryTemplates.filter(template =>
        template.name.toLowerCase().includes(category.toLowerCase()) ||
        template.description.toLowerCase().includes(category.toLowerCase())
    );
};