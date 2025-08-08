const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Template = require('../src/models/Template');

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

    // Create CV Template
    const cvTemplate = new Template({
      name: 'Modern CV',
      description: 'A clean, professional CV template with modern styling',
      category: 'cv',
      isDefault: true,
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

    // Create Portfolio Template
    const portfolioTemplate = new Template({
      name: 'Creative Portfolio',
      description: 'A modern portfolio template for showcasing your work',
      category: 'portfolio',
      isDefault: true,
      globalStyles: {
        fontFamily: 'Poppins, system-ui, sans-serif',
        primaryColor: '#7c3aed',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        fontSize: '16px',
        lineHeight: '1.7',
        spacing: '32px',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
      },
      availableSections: portfolioSections
    });

    // Create Cover Letter Template
    const coverLetterTemplate = new Template({
      name: 'Professional Cover Letter',
      description: 'A traditional cover letter template for job applications',
      category: 'cover-letter',
      isDefault: true,
      globalStyles: {
        fontFamily: 'Times New Roman, serif',
        primaryColor: '#000000',
        secondaryColor: '#374151',
        backgroundColor: '#ffffff',
        fontSize: '12pt',
        lineHeight: '1.5',
        spacing: '20px',
        borderRadius: '0px',
        boxShadow: 'none'
      },
      availableSections: coverLetterSections
    });

    // Create Minimalist CV Template
    const minimalistCvTemplate = new Template({
      name: 'Minimalist CV',
      description: 'A clean, minimalist CV template focusing on content',
      category: 'cv',
      isDefault: false,
      globalStyles: {
        fontFamily: 'Roboto, system-ui, sans-serif',
        primaryColor: '#1f2937',
        secondaryColor: '#6b7280',
        backgroundColor: '#ffffff',
        fontSize: '13px',
        lineHeight: '1.5',
        spacing: '20px',
        borderRadius: '4px',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
      },
      availableSections: cvSections.filter(section => 
        ['personal_info', 'experience', 'education', 'skills'].includes(section.key)
      )
    });

    // Save all templates
    await Promise.all([
      cvTemplate.save(),
      portfolioTemplate.save(),
      coverLetterTemplate.save(),
      minimalistCvTemplate.save()
    ]);

    console.log('Successfully created templates:');
    console.log('- Modern CV (default)');
    console.log('- Creative Portfolio (default)');
    console.log('- Professional Cover Letter (default)');
    console.log('- Minimalist CV');

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