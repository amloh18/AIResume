const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import the Snippet model
const Snippet = require('../src/models/Snippet');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle';

// CV Templates data based on the files in public/CV templates/
const cvTemplates = [
  {
    id: 'modern-minimalist',
    name: 'Modern Minimalist',
    image: '/CV templates/ATS Minimalist Resume Template, Clean Resume, Lebenslauf Vorlage, Traditional CV minimalist resum_.jpeg',
    description: 'Clean and professional minimalist design',
    category: 'professional'
  },
  {
    id: 'creative-modern',
    name: 'Creative Modern',
    image: '/CV templates/Creative Resume Design _ Professional CV Template mockuptemplates💡_.jpeg',
    description: 'Creative and modern design with visual elements',
    category: 'creative'
  },
  {
    id: 'professional-executive',
    name: 'Professional Executive',
    image: '/CV templates/Resume Template - Professional Modern Resume Template for, Executive.jpeg',
    description: 'Executive-level professional template',
    category: 'executive'
  },
  {
    id: 'ats-friendly',
    name: 'ATS Friendly',
    image: '/CV templates/ATS friendly CV .jpeg',
    description: 'Optimized for Applicant Tracking Systems',
    category: 'professional'
  },
  {
    id: 'modern-google-docs',
    name: 'Modern Google Docs',
    image: '/CV templates/Modern Resume Template Google Docs Curriculum Vitae Resume Word Data Analyst CV Financial Advisor Resume 2 Page Executive Assistant ATS 2023 - Etsy.jpeg',
    description: 'Modern template compatible with Google Docs',
    category: 'professional'
  },
  {
    id: 'social-media-marketing',
    name: 'Social Media Marketing',
    image: '/CV templates/Modern ATS Resume Template to Download, CV Design for Social Media, Marketing an ats cv.jpeg',
    description: 'Designed for social media and marketing professionals',
    category: 'creative'
  },
  {
    id: 'engineer-skilled',
    name: 'Engineer Skilled',
    image: '/CV templates/15 Engineer Skilled Resume Template.jpeg',
    description: 'Specialized template for engineering professionals',
    category: 'technical'
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    image: '/CV templates/Modern Resume Template Google Docs Curriculum Vitae Resume Word Data Analyst CV Financial Advisor Resume 2 Page Executive Assistant ATS 2023 - Etsy.jpeg',
    description: 'Optimized for data analysis and financial roles',
    category: 'technical'
  }
];

// Section snippets data
const sectionSnippets = [
  // Personal Information Sections
  {
    name: 'Modern Header',
    description: 'Clean header with name, title, and contact information',
    category: 'section',
    sectionType: 'personal',
    layout: {
      columns: 1,
      position: 'top',
      alignment: 'center',
      spacing: 'normal'
    },
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      accentColor: '#3b82f6',
      borderStyle: 'none',
      borderColor: '#e5e7eb',
      borderRadius: 0,
      shadow: 'none',
      typography: {
        fontFamily: 'Inter',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '1.6'
      }
    },
    content: {
      title: 'Personal Information',
      fields: [
        { name: 'fullName', type: 'text', required: true, placeholder: 'Full Name' },
        { name: 'title', type: 'text', required: false, placeholder: 'Professional Title' },
        { name: 'email', type: 'email', required: true, placeholder: 'Email Address' },
        { name: 'phone', type: 'phone', required: false, placeholder: 'Phone Number' },
        { name: 'location', type: 'location', required: false, placeholder: 'City, Country' },
        { name: 'linkedin', type: 'url', required: false, placeholder: 'LinkedIn URL' }
      ]
    },
    accessLevel: 'all',
    tags: ['header', 'contact', 'modern', 'clean']
  },
  {
    name: 'Creative Header',
    description: 'Creative header with visual elements and modern typography',
    category: 'section',
    sectionType: 'personal',
    layout: {
      columns: 2,
      position: 'top',
      alignment: 'left',
      spacing: 'spacious'
    },
    styling: {
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      accentColor: '#8b5cf6',
      borderStyle: 'solid',
      borderColor: '#e2e8f0',
      borderRadius: 8,
      shadow: 'light',
      typography: {
        fontFamily: 'Poppins',
        fontSize: '18px',
        fontWeight: '500',
        lineHeight: '1.5'
      }
    },
    content: {
      title: 'Personal Information',
      fields: [
        { name: 'fullName', type: 'text', required: true, placeholder: 'Full Name' },
        { name: 'title', type: 'text', required: false, placeholder: 'Professional Title' },
        { name: 'email', type: 'email', required: true, placeholder: 'Email Address' },
        { name: 'phone', type: 'phone', required: false, placeholder: 'Phone Number' },
        { name: 'website', type: 'url', required: false, placeholder: 'Personal Website' },
        { name: 'github', type: 'url', required: false, placeholder: 'GitHub Profile' }
      ]
    },
    accessLevel: 'day-pass',
    tags: ['header', 'creative', 'modern', 'visual']
  },

  // Education Sections
  {
    name: 'Timeline Education',
    description: 'Education section with timeline layout',
    category: 'section',
    sectionType: 'education',
    layout: {
      columns: 1,
      position: 'middle',
      alignment: 'left',
      spacing: 'normal'
    },
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#374151',
      accentColor: '#10b981',
      borderStyle: 'none',
      borderColor: '#d1d5db',
      borderRadius: 0,
      shadow: 'none',
      typography: {
        fontFamily: 'Inter',
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.6'
      }
    },
    content: {
      title: 'Education',
      fields: [
        { name: 'institution', type: 'text', required: true, placeholder: 'Institution Name' },
        { name: 'degree', type: 'text', required: true, placeholder: 'Degree' },
        { name: 'field', type: 'text', required: true, placeholder: 'Field of Study' },
        { name: 'startDate', type: 'date', required: true, placeholder: 'Start Date' },
        { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' },
        { name: 'gpa', type: 'text', required: false, placeholder: 'GPA' },
        { name: 'description', type: 'paragraph', required: false, placeholder: 'Description' }
      ]
    },
    accessLevel: 'all',
    tags: ['education', 'timeline', 'academic', 'clean']
  },
  {
    name: 'Card Education',
    description: 'Education section with card-based layout',
    category: 'section',
    sectionType: 'education',
    layout: {
      columns: 2,
      position: 'middle',
      alignment: 'left',
      spacing: 'spacious'
    },
    styling: {
      backgroundColor: '#f9fafb',
      textColor: '#1f2937',
      accentColor: '#059669',
      borderStyle: 'solid',
      borderColor: '#e5e7eb',
      borderRadius: 12,
      shadow: 'medium',
      typography: {
        fontFamily: 'Inter',
        fontSize: '15px',
        fontWeight: '500',
        lineHeight: '1.5'
      }
    },
    content: {
      title: 'Education',
      fields: [
        { name: 'institution', type: 'text', required: true, placeholder: 'Institution Name' },
        { name: 'degree', type: 'text', required: true, placeholder: 'Degree' },
        { name: 'field', type: 'text', required: true, placeholder: 'Field of Study' },
        { name: 'startDate', type: 'date', required: true, placeholder: 'Start Date' },
        { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' },
        { name: 'gpa', type: 'text', required: false, placeholder: 'GPA' },
        { name: 'achievements', type: 'list', required: false, placeholder: 'Key Achievements' }
      ]
    },
    accessLevel: 'day-pass',
    tags: ['education', 'cards', 'modern', 'visual']
  },

  // Experience Sections
  {
    name: 'Traditional Experience',
    description: 'Classic experience section with company and role details',
    category: 'section',
    sectionType: 'experience',
    layout: {
      columns: 1,
      position: 'middle',
      alignment: 'left',
      spacing: 'normal'
    },
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#374151',
      accentColor: '#3b82f6',
      borderStyle: 'none',
      borderColor: '#d1d5db',
      borderRadius: 0,
      shadow: 'none',
      typography: {
        fontFamily: 'Inter',
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.6'
      }
    },
    content: {
      title: 'Professional Experience',
      fields: [
        { name: 'company', type: 'text', required: true, placeholder: 'Company Name' },
        { name: 'position', type: 'text', required: true, placeholder: 'Job Title' },
        { name: 'location', type: 'location', required: false, placeholder: 'Location' },
        { name: 'startDate', type: 'date', required: true, placeholder: 'Start Date' },
        { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' },
        { name: 'description', type: 'paragraph', required: true, placeholder: 'Job Description' },
        { name: 'achievements', type: 'list', required: false, placeholder: 'Key Achievements' }
      ]
    },
    accessLevel: 'all',
    tags: ['experience', 'traditional', 'professional', 'clean']
  },
  {
    name: 'Modern Experience',
    description: 'Modern experience section with visual elements',
    category: 'section',
    sectionType: 'experience',
    layout: {
      columns: 2,
      position: 'middle',
      alignment: 'left',
      spacing: 'spacious'
    },
    styling: {
      backgroundColor: '#f8fafc',
      textColor: '#1e293b',
      accentColor: '#6366f1',
      borderStyle: 'solid',
      borderColor: '#e2e8f0',
      borderRadius: 8,
      shadow: 'light',
      typography: {
        fontFamily: 'Inter',
        fontSize: '15px',
        fontWeight: '500',
        lineHeight: '1.5'
      }
    },
    content: {
      title: 'Professional Experience',
      fields: [
        { name: 'company', type: 'text', required: true, placeholder: 'Company Name' },
        { name: 'position', type: 'text', required: true, placeholder: 'Job Title' },
        { name: 'location', type: 'location', required: false, placeholder: 'Location' },
        { name: 'startDate', type: 'date', required: true, placeholder: 'Start Date' },
        { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' },
        { name: 'description', type: 'paragraph', required: true, placeholder: 'Job Description' },
        { name: 'technologies', type: 'list', required: false, placeholder: 'Technologies Used' }
      ]
    },
    accessLevel: 'day-pass',
    tags: ['experience', 'modern', 'visual', 'professional']
  },

  // Skills Sections
  {
    name: 'Simple Skills',
    description: 'Clean skills section with simple list layout',
    category: 'section',
    sectionType: 'skills',
    layout: {
      columns: 1,
      position: 'middle',
      alignment: 'left',
      spacing: 'normal'
    },
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#374151',
      accentColor: '#f59e0b',
      borderStyle: 'none',
      borderColor: '#d1d5db',
      borderRadius: 0,
      shadow: 'none',
      typography: {
        fontFamily: 'Inter',
        fontSize: '14px',
        fontWeight: '400',
        lineHeight: '1.6'
      }
    },
    content: {
      title: 'Skills',
      fields: [
        { name: 'category', type: 'text', required: true, placeholder: 'Skill Category' },
        { name: 'skills', type: 'list', required: true, placeholder: 'Skills (comma separated)' }
      ]
    },
    accessLevel: 'all',
    tags: ['skills', 'simple', 'clean', 'list']
  },
  {
    name: 'Visual Skills',
    description: 'Skills section with visual progress indicators',
    category: 'section',
    sectionType: 'skills',
    layout: {
      columns: 2,
      position: 'middle',
      alignment: 'left',
      spacing: 'spacious'
    },
    styling: {
      backgroundColor: '#fefefe',
      textColor: '#1f2937',
      accentColor: '#f97316',
      borderStyle: 'solid',
      borderColor: '#f3f4f6',
      borderRadius: 10,
      shadow: 'light',
      typography: {
        fontFamily: 'Inter',
        fontSize: '15px',
        fontWeight: '500',
        lineHeight: '1.5'
      }
    },
    content: {
      title: 'Technical Skills',
      fields: [
        { name: 'category', type: 'text', required: true, placeholder: 'Skill Category' },
        { name: 'skills', type: 'list', required: true, placeholder: 'Skills with proficiency levels' }
      ]
    },
    accessLevel: 'day-pass',
    tags: ['skills', 'visual', 'progress', 'modern']
  },

  // Projects Sections
  {
    name: 'Project Portfolio',
    description: 'Projects section with portfolio-style layout',
    category: 'section',
    sectionType: 'projects',
    layout: {
      columns: 2,
      position: 'middle',
      alignment: 'left',
      spacing: 'spacious'
    },
    styling: {
      backgroundColor: '#fafafa',
      textColor: '#1e293b',
      accentColor: '#8b5cf6',
      borderStyle: 'solid',
      borderColor: '#e2e8f0',
      borderRadius: 12,
      shadow: 'medium',
      typography: {
        fontFamily: 'Inter',
        fontSize: '15px',
        fontWeight: '500',
        lineHeight: '1.5'
      }
    },
    content: {
      title: 'Projects',
      fields: [
        { name: 'title', type: 'text', required: true, placeholder: 'Project Title' },
        { name: 'description', type: 'paragraph', required: true, placeholder: 'Project Description' },
        { name: 'technologies', type: 'list', required: false, placeholder: 'Technologies Used' },
        { name: 'url', type: 'url', required: false, placeholder: 'Project URL' },
        { name: 'github', type: 'url', required: false, placeholder: 'GitHub Repository' },
        { name: 'startDate', type: 'date', required: false, placeholder: 'Start Date' },
        { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' }
      ]
    },
    accessLevel: 'pro',
    tags: ['projects', 'portfolio', 'visual', 'modern']
  },

  // Summary Sections
  {
    name: 'Professional Summary',
    description: 'Professional summary section with clean typography',
    category: 'section',
    sectionType: 'summary',
    layout: {
      columns: 1,
      position: 'top',
      alignment: 'justify',
      spacing: 'normal'
    },
    styling: {
      backgroundColor: '#ffffff',
      textColor: '#374151',
      accentColor: '#3b82f6',
      borderStyle: 'none',
      borderColor: '#d1d5db',
      borderRadius: 0,
      shadow: 'none',
      typography: {
        fontFamily: 'Inter',
        fontSize: '16px',
        fontWeight: '400',
        lineHeight: '1.7'
      }
    },
    content: {
      title: 'Professional Summary',
      fields: [
        { name: 'summary', type: 'paragraph', required: true, placeholder: 'Professional summary and career objectives' }
      ]
    },
    accessLevel: 'all',
    tags: ['summary', 'professional', 'clean', 'typography']
  }
];

async function populateSnippets() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing snippets
    await Snippet.deleteMany({});
    console.log('Cleared existing snippets');

    // Create snippets for each template
    const snippets = [];

    for (const template of cvTemplates) {
      for (const sectionSnippet of sectionSnippets) {
        const snippet = new Snippet({
          ...sectionSnippet,
          templateId: template.id,
          templateName: template.name,
          templateImage: template.image,
          isPremium: sectionSnippet.accessLevel === 'pro',
          usageCount: Math.floor(Math.random() * 100),
          rating: (Math.random() * 2 + 3).toFixed(1) // Random rating between 3-5
        });
        snippets.push(snippet);
      }
    }

    // Insert all snippets
    await Snippet.insertMany(snippets);
    console.log(`Successfully created ${snippets.length} snippets`);

    // Log summary
    const totalSnippets = await Snippet.countDocuments();
    const freeSnippets = await Snippet.countDocuments({ accessLevel: 'all' });
    const dayPassSnippets = await Snippet.countDocuments({ accessLevel: 'day-pass' });
    const proSnippets = await Snippet.countDocuments({ accessLevel: 'pro' });

    console.log('\nSnippets Summary:');
    console.log(`Total snippets: ${totalSnippets}`);
    console.log(`Free snippets: ${freeSnippets}`);
    console.log(`Day Pass snippets: ${dayPassSnippets}`);
    console.log(`Pro snippets: ${proSnippets}`);

  } catch (error) {
    console.error('Error populating snippets:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  populateSnippets();
}

module.exports = { populateSnippets }; 