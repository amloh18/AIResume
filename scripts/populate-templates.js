const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// Import models
const Template = require('../src/models/Template.ts').default;

// Default CV template sections
const cvSections = [
  {
    key: 'personal_info',
    displayName: 'Personal Information',
    componentName: 'PersonalInfoSection',
    isList: false,
    defaultItemContent: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      location: '',
      website: '',
      linkedin: '',
      github: '',
      summary: ''
    },
    description: 'Your basic contact information and professional summary',
    icon: 'user',
    category: 'basic'
  },
  {
    key: 'experience',
    displayName: 'Work Experience',
    componentName: 'ExperienceSection',
    isList: true,
    defaultItemContent: {
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: '',
      achievements: []
    },
    description: 'Your professional work history',
    icon: 'briefcase',
    category: 'professional',
    minItems: 1
  },
  {
    key: 'education',
    displayName: 'Education',
    componentName: 'EducationSection',
    isList: true,
    defaultItemContent: {
      degree: '',
      institution: '',
      field: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      gpa: '',
      description: ''
    },
    description: 'Your educational background',
    icon: 'graduation-cap',
    category: 'professional'
  },
  {
    key: 'skills',
    displayName: 'Skills',
    componentName: 'SkillsSection',
    isList: true,
    defaultItemContent: {
      category: '',
      skills: []
    },
    description: 'Your technical and soft skills',
    icon: 'code',
    category: 'professional'
  },
  {
    key: 'projects',
    displayName: 'Projects',
    componentName: 'ProjectsSection',
    isList: true,
    defaultItemContent: {
      title: '',
      description: '',
      technologies: [],
      url: '',
      github: '',
      startDate: '',
      endDate: '',
      current: false
    },
    description: 'Your portfolio projects',
    icon: 'folder',
    category: 'portfolio'
  },
  {
    key: 'certifications',
    displayName: 'Certifications',
    componentName: 'CertificationsSection',
    isList: true,
    defaultItemContent: {
      name: '',
      issuer: '',
      date: '',
      expiryDate: '',
      url: ''
    },
    description: 'Your professional certifications',
    icon: 'certificate',
    category: 'professional'
  },
  {
    key: 'languages',
    displayName: 'Languages',
    componentName: 'LanguagesSection',
    isList: true,
    defaultItemContent: {
      language: '',
      proficiency: 'intermediate'
    },
    description: 'Languages you speak',
    icon: 'globe',
    category: 'additional'
  },
  {
    key: 'custom_section',
    displayName: 'Custom Section',
    componentName: 'CustomSection',
    isList: false,
    defaultItemContent: {
      title: '',
      content: ''
    },
    description: 'Add any custom content section',
    icon: 'plus',
    category: 'custom'
  }
];

// Portfolio template sections
const portfolioSections = [
  {
    key: 'hero',
    displayName: 'Hero Section',
    componentName: 'HeroSection',
    isList: false,
    defaultItemContent: {
      title: '',
      subtitle: '',
      description: '',
      image: '',
      ctaText: '',
      ctaLink: ''
    },
    description: 'Main introduction section',
    icon: 'star',
    category: 'basic'
  },
  {
    key: 'about',
    displayName: 'About Me',
    componentName: 'AboutSection',
    isList: false,
    defaultItemContent: {
      title: '',
      content: '',
      image: '',
      skills: []
    },
    description: 'Personal introduction and background',
    icon: 'user',
    category: 'basic'
  },
  {
    key: 'projects',
    displayName: 'Projects',
    componentName: 'ProjectsSection',
    isList: true,
    defaultItemContent: {
      title: '',
      description: '',
      technologies: [],
      image: '',
      url: '',
      github: '',
      featured: false
    },
    description: 'Showcase your projects',
    icon: 'folder',
    category: 'portfolio',
    minItems: 1
  },
  {
    key: 'experience',
    displayName: 'Experience',
    componentName: 'ExperienceSection',
    isList: true,
    defaultItemContent: {
      jobTitle: '',
      company: '',
      period: '',
      description: '',
      achievements: []
    },
    description: 'Your work experience',
    icon: 'briefcase',
    category: 'professional'
  },
  {
    key: 'contact',
    displayName: 'Contact',
    componentName: 'ContactSection',
    isList: false,
    defaultItemContent: {
      title: '',
      email: '',
      phone: '',
      linkedin: '',
      github: '',
      twitter: ''
    },
    description: 'Contact information',
    icon: 'envelope',
    category: 'basic'
  }
];

// Cover letter template sections
const coverLetterSections = [
  {
    key: 'header',
    displayName: 'Header',
    componentName: 'HeaderSection',
    isList: false,
    defaultItemContent: {
      name: '',
      email: '',
      phone: '',
      address: '',
      date: '',
      recipientName: '',
      recipientTitle: '',
      companyName: '',
      companyAddress: ''
    },
    description: 'Contact information and recipient details',
    icon: 'file-text',
    category: 'basic'
  },
  {
    key: 'opening',
    displayName: 'Opening Paragraph',
    componentName: 'OpeningSection',
    isList: false,
    defaultItemContent: {
      content: ''
    },
    description: 'Introduction and position you\'re applying for',
    icon: 'edit',
    category: 'content'
  },
  {
    key: 'body',
    displayName: 'Body Paragraphs',
    componentName: 'BodySection',
    isList: true,
    defaultItemContent: {
      content: ''
    },
    description: 'Main content paragraphs',
    icon: 'align-left',
    category: 'content',
    minItems: 1
  },
  {
    key: 'closing',
    displayName: 'Closing Paragraph',
    componentName: 'ClosingSection',
    isList: false,
    defaultItemContent: {
      content: ''
    },
    description: 'Conclusion and call to action',
    icon: 'check',
    category: 'content'
  }
];

async function populateTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing templates
    await Template.deleteMany({});
    console.log('Cleared existing templates');

    // Create Modern Professional Template
    const modernProfessionalTemplate = new Template({
      name: 'Modern Professional',
      description: 'A clean, modern professional CV template with contemporary styling',
      category: 'cv',
      categories: ['Professional', 'Modern'],
      tier: 'free',
      isDefault: true,
      isActive: true,
      isPublished: true,
      globalAccess: true,
      globalStyles: {
        fontFamily: 'Inter, system-ui, sans-serif',
        primaryColor: '#2563eb',
        secondaryColor: '#64748b',
        backgroundColor: '#ffffff',
        fontSize: '14px',
        lineHeight: '1.6',
        spacing: '24px',
        borderRadius: '8px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      },
      availableSections: cvSections
    });

    // Create Tech Modern Template
    const techModernTemplate = new Template({
      name: 'Tech Modern',
      description: 'A modern tech-focused CV template with sleek design for technology professionals',
      category: 'cv',
      categories: ['Professional', 'Modern'],
      tier: 'free',
      isDefault: false,
      isActive: true,
      isPublished: true,
      globalAccess: true,
      globalStyles: {
        fontFamily: 'JetBrains Mono, Consolas, monospace',
        primaryColor: '#10b981',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        fontSize: '13px',
        lineHeight: '1.5',
        spacing: '20px',
        borderRadius: '6px',
        boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.1)'
      },
      availableSections: cvSections
    });

    // Save templates
    await Promise.all([
      modernProfessionalTemplate.save(),
      techModernTemplate.save()
    ]);

    console.log('Successfully created templates:');
    console.log('- Modern Professional (default)');
    console.log('- Tech Modern');

    // Display template details
    const templates = await Template.find({});
    templates.forEach(template => {
      console.log(`\n${template.name} (${template.category}):`);
      console.log(`  Sections: ${template.availableSections.length}`);
      console.log(`  Default: ${template.isDefault}`);
      console.log(`  ID: ${template._id}`);
    });

  } catch (error) {
    console.error('Error populating templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  populateTemplates();
}

module.exports = { populateTemplates }; 