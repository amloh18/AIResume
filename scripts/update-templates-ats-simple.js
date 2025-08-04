const mongoose = require('mongoose');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle';

// Define Template Schema (matching existing model)
const cvSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['header', 'section'], 
    required: true 
  },
  title: { type: String },
  content: {
    name: { type: String },
    contact: [{ type: String }],
    summary: { type: String }
  },
  entries: [{
    degree: { type: String },
    institution: { type: String },
    duration: { type: String },
    details: [{ type: String }],
    title: { type: String },
    company: { type: String },
    organization: { type: String }
  }],
  details: [{ type: String }],
  styleSnippetId: { type: String, required: true }
});

const styleSnippetSchema = new mongoose.Schema({
  id: { type: String, required: true },
  category: { type: String, required: true },
  style: {
    fontWeight: { type: String },
    fontSize: { type: String },
    color: { type: String },
    marginBottom: { type: String },
    titleFontSize: { type: String },
    entrySpacing: { type: String },
    bulletIndent: { type: String },
    entryBorderLeft: { type: String },
    paddingLeft: { type: String },
    lineSpacing: { type: String },
    entryHighlightColor: { type: String },
    titleFontWeight: { type: String },
    entryBackground: { type: String },
    padding: { type: String },
    columns: { type: Number },
    fontStyle: { type: String }
  }
});

const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  category: [{
    type: String,
    required: true,
    enum: ['ATS-Friendly', 'Professional', 'Minimalist', 'Modern', 'Two-Column', 'Photo', 'Dark', 'Timeline', 'Creative', 'Engineer', 'Single-Column', 'Sidebar', 'Colored Sidebar', 'Clean', 'Bold', 'Web Developer', 'Finance']
  }],
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  thumbnail: {
    type: String,
    required: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  display: {
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'absolute'],
      default: 'single-column'
    },
    padding: { type: String, default: '32px' },
    fontFamily: { type: String, default: 'Segoe UI, Roboto, sans-serif' },
    sectionSpacing: { type: String, default: '24px' }
  },
  sections: [cvSectionSchema],
  snippetStyles: [styleSnippetSchema],
  styles: {
    layout: {
      type: String,
      enum: ['single-column', 'two-column', 'absolute'],
      required: true
    },
    paddingX: { type: Number, default: 96 },
    paddingY: { type: Number, default: 96 },
    lineHeight: { type: Number, default: 1.0 },
    sectionGap: { type: Number, default: 10 },
    subsectionGap: { type: Number, default: 5 },
    itemSpacing: { type: Number, default: 2 },
    titleBottomMargin: { type: Number, default: 4 },
    highlightColor: { type: String, default: '#171717' },
    baseFontSize: { type: Number, default: 11 },
    nameFontSize: { type: Number, default: 20 },
    sectionTitleFontSize: { type: Number, default: 15 },
    showSectionLine: { type: Boolean, default: true },
    paperSize: {
      type: String,
      enum: ['A4', 'US Letter'],
      default: 'A4'
    },
    fontFamily: { type: String, default: 'Arial' },
    baseFontSize: { type: Number, default: 11.5 },
    contactAlignment: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'left'
    },
    showProfilePicture: { type: Boolean, default: false },
    itemStyle: { type: String, default: 'simple-list' },
    sectionTitleStyle: { type: mongoose.Schema.Types.Mixed },
    leftColumnWidth: { type: Number },
    leftColumnSections: [{ type: String }],
    rightColumnSections: [{ type: String }],
    sections: [{
      key: { type: String, required: true },
      box: {
        x: { type: Number, required: true },
        y: { type: Number, required: true },
        w: { type: Number, required: true },
        h: { type: Number, required: true }
      },
      zIndex: { type: Number, required: true },
      mask: { type: String },
      styles: { type: mongoose.Schema.Types.Mixed }
    }],
    elements: [{
      type: { type: String, required: true },
      x: { type: Number },
      y: { type: Number },
      w: { type: Number },
      h: { type: Number },
      x1: { type: Number },
      y1: { type: Number },
      x2: { type: Number },
      y2: { type: Number },
      fill: { type: String },
      strokeWidth: { type: Number },
      color: { type: String },
      zIndex: { type: Number, required: true },
      content: { type: String },
      fontSize: { type: Number },
      fontWeight: { type: String },
      src: { type: String },
      opacity: { type: Number },
      radius: { type: Number },
      rotation: { type: Number }
    }]
  },
  sectionTitles: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  metadata: {
    usageCount: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    tags: [{ type: String, trim: true }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

// Create model
const Template = mongoose.model('Template', TemplateSchema);

// ATS Professional Templates
const atsTemplates = [
  {
    name: 'ATS Minimalist Professional',
    description: 'Clean, minimalist ATS-optimized template with perfect readability and structure',
    category: ['ATS-Friendly', 'Professional', 'Minimalist'],
    thumbnail: '/CV templates/ATS Minimalist Resume Template, Clean Resume, Lebenslauf Vorlage, Traditional CV minimalist resum_.jpeg',
    isPremium: false,
    isDefault: true,
    display: {
      layout: 'single-column',
      padding: '32px',
      fontFamily: 'Arial, sans-serif',
      sectionSpacing: '24px'
    },
    sections: [
      {
        id: 'header',
        type: 'header',
        title: 'Personal Information',
        content: {
          name: 'John Doe',
          contact: ['john.doe@email.com', '+1 (555) 123-4567', 'New York, NY', 'linkedin.com/in/johndoe']
        },
        styleSnippetId: 'header-minimalist'
      },
      {
        id: 'summary',
        type: 'section',
        title: 'Professional Summary',
        content: {
          summary: 'Experienced professional with 5+ years in software development...'
        },
        styleSnippetId: 'summary-minimalist'
      },
      {
        id: 'experience',
        type: 'section',
        title: 'Professional Experience',
        entries: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Company Inc.',
            duration: '2020 - Present',
            details: [
              'Led development of key features',
              'Mentored junior developers',
              'Improved system performance by 40%'
            ]
          }
        ],
        styleSnippetId: 'experience-minimalist'
      },
      {
        id: 'education',
        type: 'section',
        title: 'Education',
        entries: [
          {
            degree: 'Bachelor of Science',
            institution: 'University of Technology',
            duration: '2016 - 2020',
            details: ['Computer Science', 'GPA: 3.8/4.0']
          }
        ],
        styleSnippetId: 'education-minimalist'
      },
      {
        id: 'skills',
        type: 'section',
        title: 'Skills',
        details: [
          'JavaScript, React, Node.js',
          'Python, Django, PostgreSQL',
          'AWS, Docker, Git',
          'Agile, Scrum, Team Leadership'
        ],
        styleSnippetId: 'skills-minimalist'
      }
    ],
    snippetStyles: [
      {
        id: 'header-minimalist',
        category: 'header',
        style: {
          fontWeight: 'bold',
          fontSize: '20px',
          color: '#1f2937',
          marginBottom: '16px',
          titleFontSize: '24px',
          entrySpacing: '8px',
          lineSpacing: '1.6',
          titleFontWeight: 'bold',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'summary-minimalist',
        category: 'summary',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '16px',
          titleFontSize: '16px',
          entrySpacing: '8px',
          lineSpacing: '1.6',
          titleFontWeight: 'bold',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'experience-minimalist',
        category: 'experience',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '16px',
          titleFontSize: '16px',
          entrySpacing: '12px',
          bulletIndent: '16px',
          lineSpacing: '1.6',
          titleFontWeight: 'bold',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'education-minimalist',
        category: 'education',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '16px',
          titleFontSize: '16px',
          entrySpacing: '12px',
          lineSpacing: '1.6',
          titleFontWeight: 'bold',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'skills-minimalist',
        category: 'skills',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '16px',
          titleFontSize: '16px',
          entrySpacing: '8px',
          lineSpacing: '1.6',
          titleFontWeight: 'bold',
          padding: '0',
          columns: 2
        }
      }
    ],
    styles: {
      layout: 'single-column',
      paddingX: 96,
      paddingY: 96,
      lineHeight: 1.2,
      sectionGap: 16,
      subsectionGap: 8,
      itemSpacing: 4,
      titleBottomMargin: 8,
      highlightColor: '#3b82f6',
      baseFontSize: 11,
      nameFontSize: 20,
      sectionTitleFontSize: 15,
      showSectionLine: false,
      paperSize: 'A4',
      fontFamily: 'Arial',
      contactAlignment: 'center',
      showProfilePicture: false,
      itemStyle: 'simple-list',
      sections: [
        { key: 'header', box: { x: 0, y: 0, w: 100, h: 15 }, zIndex: 1 },
        { key: 'summary', box: { x: 0, y: 15, w: 100, h: 12 }, zIndex: 2 },
        { key: 'experience', box: { x: 0, y: 27, w: 100, h: 35 }, zIndex: 3 },
        { key: 'education', box: { x: 0, y: 62, w: 100, h: 20 }, zIndex: 4 },
        { key: 'skills', box: { x: 0, y: 82, w: 100, h: 18 }, zIndex: 5 }
      ]
    },
    sectionTitles: {
      header: 'Personal Information',
      summary: 'Professional Summary',
      experience: 'Professional Experience',
      education: 'Education',
      skills: 'Skills'
    },
    metadata: {
      usageCount: 1250,
      rating: 4.8,
      tags: ['ats-friendly', 'minimalist', 'professional', 'clean', 'readable']
    }
  },
  {
    name: 'ATS Modern Professional',
    description: 'Modern ATS-optimized template with clean typography and professional layout',
    category: ['ATS-Friendly', 'Professional', 'Modern'],
    thumbnail: '/CV templates/Modern ATS Resume Template to Download, CV Design for Social Media, Marketing an ats cv.jpeg',
    isPremium: false,
    isDefault: false,
    display: {
      layout: 'single-column',
      padding: '32px',
      fontFamily: 'Inter, sans-serif',
      sectionSpacing: '24px'
    },
    sections: [
      {
        id: 'header',
        type: 'header',
        title: 'Personal Information',
        content: {
          name: 'John Doe',
          contact: ['john.doe@email.com', '+1 (555) 123-4567', 'New York, NY', 'linkedin.com/in/johndoe']
        },
        styleSnippetId: 'header-modern'
      },
      {
        id: 'summary',
        type: 'section',
        title: 'Professional Summary',
        content: {
          summary: 'Experienced professional with 5+ years in software development...'
        },
        styleSnippetId: 'summary-modern'
      },
      {
        id: 'experience',
        type: 'section',
        title: 'Professional Experience',
        entries: [
          {
            title: 'Senior Software Engineer',
            company: 'Tech Company Inc.',
            duration: '2020 - Present',
            details: [
              'Led development of key features',
              'Mentored junior developers',
              'Improved system performance by 40%'
            ]
          }
        ],
        styleSnippetId: 'experience-modern'
      },
      {
        id: 'education',
        type: 'section',
        title: 'Education',
        entries: [
          {
            degree: 'Bachelor of Science',
            institution: 'University of Technology',
            duration: '2016 - 2020',
            details: ['Computer Science', 'GPA: 3.8/4.0']
          }
        ],
        styleSnippetId: 'education-modern'
      },
      {
        id: 'skills',
        type: 'section',
        title: 'Technical Skills',
        details: [
          'Programming Languages: JavaScript, Python, Java',
          'Frameworks: React, Node.js, Django',
          'Tools: AWS, Docker, Git',
          'Soft Skills: Leadership, Communication, Problem Solving'
        ],
        styleSnippetId: 'skills-modern'
      }
    ],
    snippetStyles: [
      {
        id: 'header-modern',
        category: 'header',
        style: {
          fontWeight: '600',
          fontSize: '16px',
          color: '#1e293b',
          marginBottom: '20px',
          titleFontSize: '22px',
          entrySpacing: '12px',
          lineSpacing: '1.5',
          titleFontWeight: '600',
          padding: '16px',
          columns: 2
        }
      },
      {
        id: 'summary-modern',
        category: 'summary',
        style: {
          fontWeight: 'normal',
          fontSize: '15px',
          color: '#374151',
          marginBottom: '20px',
          titleFontSize: '18px',
          entrySpacing: '12px',
          lineSpacing: '1.6',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'experience-modern',
        category: 'experience',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '20px',
          titleFontSize: '18px',
          entrySpacing: '16px',
          bulletIndent: '20px',
          lineSpacing: '1.6',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'education-modern',
        category: 'education',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '20px',
          titleFontSize: '18px',
          entrySpacing: '16px',
          lineSpacing: '1.6',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'skills-modern',
        category: 'skills',
        style: {
          fontWeight: '500',
          fontSize: '14px',
          color: '#1f2937',
          marginBottom: '20px',
          titleFontSize: '18px',
          entrySpacing: '12px',
          lineSpacing: '1.5',
          titleFontWeight: '600',
          padding: '16px',
          columns: 2
        }
      }
    ],
    styles: {
      layout: 'single-column',
      paddingX: 96,
      paddingY: 96,
      lineHeight: 1.3,
      sectionGap: 20,
      subsectionGap: 12,
      itemSpacing: 6,
      titleBottomMargin: 12,
      highlightColor: '#6366f1',
      baseFontSize: 11,
      nameFontSize: 20,
      sectionTitleFontSize: 15,
      showSectionLine: false,
      paperSize: 'A4',
      fontFamily: 'Inter',
      contactAlignment: 'left',
      showProfilePicture: false,
      itemStyle: 'modern-list',
      sections: [
        { key: 'header', box: { x: 0, y: 0, w: 100, h: 18 }, zIndex: 1 },
        { key: 'summary', box: { x: 0, y: 18, w: 100, h: 12 }, zIndex: 2 },
        { key: 'experience', box: { x: 0, y: 30, w: 100, h: 32 }, zIndex: 3 },
        { key: 'education', box: { x: 0, y: 62, w: 100, h: 18 }, zIndex: 4 },
        { key: 'skills', box: { x: 0, y: 80, w: 100, h: 20 }, zIndex: 5 }
      ]
    },
    sectionTitles: {
      header: 'Personal Information',
      summary: 'Professional Summary',
      experience: 'Professional Experience',
      education: 'Education',
      skills: 'Technical Skills'
    },
    metadata: {
      usageCount: 890,
      rating: 4.6,
      tags: ['ats-friendly', 'modern', 'professional', 'clean', 'interactive']
    }
  },
  {
    name: 'ATS Executive Professional',
    description: 'Executive-level ATS template with sophisticated layout and professional styling',
         category: ['ATS-Friendly', 'Professional', 'Bold'],
    thumbnail: '/CV templates/Resume Template - Professional Modern Resume Template for, Executive.jpeg',
    isPremium: true,
    isDefault: false,
    display: {
      layout: 'single-column',
      padding: '32px',
      fontFamily: 'Times New Roman, serif',
      sectionSpacing: '24px'
    },
    sections: [
      {
        id: 'header',
        type: 'header',
        title: 'Executive Information',
        content: {
          name: 'John Doe',
          contact: ['john.doe@email.com', '+1 (555) 123-4567', 'New York, NY', 'linkedin.com/in/johndoe']
        },
        styleSnippetId: 'header-executive'
      },
      {
        id: 'summary',
        type: 'section',
        title: 'Executive Summary',
        content: {
          summary: 'Senior executive with 15+ years of leadership experience...'
        },
        styleSnippetId: 'summary-executive'
      },
      {
        id: 'experience',
        type: 'section',
        title: 'Executive Experience',
        entries: [
          {
            title: 'Chief Technology Officer',
            company: 'Tech Company Inc.',
            duration: '2018 - Present',
            details: [
              'Led technology strategy and innovation',
              'Managed team of 50+ engineers',
              'Increased company revenue by 200%'
            ]
          }
        ],
        styleSnippetId: 'experience-executive'
      },
      {
        id: 'education',
        type: 'section',
        title: 'Education',
        entries: [
          {
            degree: 'Master of Business Administration',
            institution: 'Harvard Business School',
            duration: '2010 - 2012',
            details: ['Business Administration', 'GPA: 3.9/4.0']
          }
        ],
        styleSnippetId: 'education-executive'
      },
      {
        id: 'skills',
        type: 'section',
        title: 'Leadership Skills',
        details: [
          'Strategic Planning & Execution',
          'Team Leadership & Management',
          'Financial Management',
          'Stakeholder Communication'
        ],
        styleSnippetId: 'skills-executive'
      }
    ],
    snippetStyles: [
      {
        id: 'header-executive',
        category: 'header',
        style: {
          fontWeight: '600',
          fontSize: '18px',
          color: '#1f2937',
          marginBottom: '24px',
          titleFontSize: '26px',
          entrySpacing: '16px',
          lineSpacing: '1.4',
          titleFontWeight: '600',
          padding: '20px',
          columns: 1
        }
      },
      {
        id: 'summary-executive',
        category: 'summary',
        style: {
          fontWeight: 'normal',
          fontSize: '16px',
          color: '#374151',
          marginBottom: '24px',
          titleFontSize: '20px',
          entrySpacing: '16px',
          lineSpacing: '1.7',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'experience-executive',
        category: 'experience',
        style: {
          fontWeight: 'normal',
          fontSize: '15px',
          color: '#374151',
          marginBottom: '24px',
          titleFontSize: '20px',
          entrySpacing: '20px',
          bulletIndent: '24px',
          lineSpacing: '1.6',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'education-executive',
        category: 'education',
        style: {
          fontWeight: 'normal',
          fontSize: '14px',
          color: '#374151',
          marginBottom: '24px',
          titleFontSize: '20px',
          entrySpacing: '20px',
          lineSpacing: '1.6',
          titleFontWeight: '600',
          padding: '0',
          columns: 1
        }
      },
      {
        id: 'skills-executive',
        category: 'skills',
        style: {
          fontWeight: '500',
          fontSize: '14px',
          color: '#1f2937',
          marginBottom: '24px',
          titleFontSize: '20px',
          entrySpacing: '16px',
          lineSpacing: '1.5',
          titleFontWeight: '600',
          padding: '20px',
          columns: 2
        }
      }
    ],
    styles: {
      layout: 'single-column',
      paddingX: 120,
      paddingY: 120,
      lineHeight: 1.4,
      sectionGap: 24,
      subsectionGap: 16,
      itemSpacing: 8,
      titleBottomMargin: 16,
      highlightColor: '#1e40af',
      baseFontSize: 11,
      nameFontSize: 22,
      sectionTitleFontSize: 16,
      showSectionLine: false,
      paperSize: 'A4',
      fontFamily: 'Times New Roman',
      contactAlignment: 'center',
      showProfilePicture: false,
      itemStyle: 'executive-list',
      sections: [
        { key: 'header', box: { x: 0, y: 0, w: 100, h: 20 }, zIndex: 1 },
        { key: 'summary', box: { x: 0, y: 20, w: 100, h: 15 }, zIndex: 2 },
        { key: 'experience', box: { x: 0, y: 35, w: 100, h: 30 }, zIndex: 3 },
        { key: 'education', box: { x: 0, y: 65, w: 100, h: 15 }, zIndex: 4 },
        { key: 'skills', box: { x: 0, y: 80, w: 100, h: 20 }, zIndex: 5 }
      ]
    },
    sectionTitles: {
      header: 'Executive Information',
      summary: 'Executive Summary',
      experience: 'Executive Experience',
      education: 'Education',
      skills: 'Leadership Skills'
    },
    metadata: {
      usageCount: 450,
      rating: 4.9,
      tags: ['ats-friendly', 'executive', 'professional', 'leadership', 'premium']
    }
  }
];

async function updateTemplates() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing templates
    await Template.deleteMany({});
    console.log('Cleared existing templates');

    // Insert new ATS templates
    const templates = atsTemplates.map(template => new Template(template));
    await Template.insertMany(templates);
    console.log(`Successfully created ${templates.length} ATS templates`);

    // Log summary
    const totalTemplates = await Template.countDocuments();
    const premiumTemplates = await Template.countDocuments({ isPremium: true });
    const defaultTemplates = await Template.countDocuments({ isDefault: true });
    const atsTemplatesCount = await Template.countDocuments({ category: 'ATS-Friendly' });

    console.log('\nTemplates Summary:');
    console.log(`Total templates: ${totalTemplates}`);
    console.log(`Premium templates: ${premiumTemplates}`);
    console.log(`Default templates: ${defaultTemplates}`);
    console.log(`ATS-friendly templates: ${atsTemplatesCount}`);

    // Log template details
    console.log('\nTemplate Details:');
    const allTemplates = await Template.find({}).lean();
    allTemplates.forEach(template => {
      console.log(`- ${template.name}: ${template.category.join(', ')} (${template.isPremium ? 'Premium' : 'Free'})`);
    });

  } catch (error) {
    console.error('Error updating templates:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  updateTemplates();
}

module.exports = { updateTemplates }; 