const mongoose = require('mongoose');

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cvcircle';

// Define Template Schema
const TemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: [{
    type: String,
    enum: ['professional', 'ats-friendly', 'executive', 'creative', 'minimalist', 'modern', 'traditional'],
    required: true
  }],
  thumbnail: {
    type: String,
    required: true
  },
  previewImage: {
    type: String,
    required: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isATS: {
    type: Boolean,
    default: true
  },
  // Template structure with precise snippet positioning
  structure: {
    sections: [{
      id: String,
      name: String,
      type: String, // 'personal', 'summary', 'experience', 'education', 'skills', 'projects', 'contact'
      position: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      },
      layout: {
        columns: Number,
        alignment: String, // 'left', 'center', 'right', 'justify'
        spacing: String // 'compact', 'normal', 'spacious'
      },
      styling: {
        backgroundColor: String,
        textColor: String,
        accentColor: String,
        borderStyle: String,
        borderColor: String,
        borderRadius: Number,
        shadow: String,
        typography: {
          fontFamily: String,
          fontSize: String,
          fontWeight: String,
          lineHeight: String
        }
      },
      content: {
        title: String,
        fields: [{
          name: String,
          type: String,
          required: Boolean,
          placeholder: String
        }]
      }
    }],
    pageSettings: {
      pageSize: String, // 'A4', 'Letter'
      orientation: String, // 'portrait', 'landscape'
      margins: {
        top: Number,
        bottom: Number,
        left: Number,
        right: Number
      },
      spacing: {
        sectionGap: Number,
        itemSpacing: Number,
        lineSpacing: Number
      }
    }
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

// ATS Professional Templates based on actual files
const atsTemplates = [
  {
    name: 'ATS Minimalist Professional',
    description: 'Clean, minimalist ATS-optimized template with perfect readability and structure',
    category: ['professional', 'ats-friendly', 'minimalist'],
    thumbnail: '/CV templates/ATS Minimalist Resume Template, Clean Resume, Lebenslauf Vorlage, Traditional CV minimalist resum_.jpeg',
    previewImage: '/CV templates/ATS Minimalist Resume Template, Clean Resume, Lebenslauf Vorlage, Traditional CV minimalist resum_.jpeg',
    isPremium: false,
    isDefault: true,
    isATS: true,
    structure: {
      sections: [
        {
          id: 'header',
          name: 'Professional Header',
          type: 'personal',
          position: { x: 0, y: 0, width: 100, height: 15 },
          layout: { columns: 1, alignment: 'center', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            accentColor: '#3b82f6',
            borderStyle: 'none',
            borderColor: '#e5e7eb',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Arial, sans-serif',
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
              { name: 'location', type: 'location', required: false, placeholder: 'City, State' },
              { name: 'linkedin', type: 'url', required: false, placeholder: 'LinkedIn URL' }
            ]
          }
        },
        {
          id: 'summary',
          name: 'Professional Summary',
          type: 'summary',
          position: { x: 0, y: 15, width: 100, height: 12 },
          layout: { columns: 1, alignment: 'justify', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#3b82f6',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: '1.6'
            }
          },
          content: {
            title: 'Professional Summary',
            fields: [
              { name: 'summary', type: 'paragraph', required: true, placeholder: 'Professional summary and career objectives' }
            ]
          }
        },
        {
          id: 'experience',
          name: 'Professional Experience',
          type: 'experience',
          position: { x: 0, y: 27, width: 100, height: 35 },
          layout: { columns: 1, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#3b82f6',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Arial, sans-serif',
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
          }
        },
        {
          id: 'education',
          name: 'Education',
          type: 'education',
          position: { x: 0, y: 62, width: 100, height: 20 },
          layout: { columns: 1, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#10b981',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Arial, sans-serif',
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
              { name: 'gpa', type: 'text', required: false, placeholder: 'GPA' }
            ]
          }
        },
        {
          id: 'skills',
          name: 'Skills',
          type: 'skills',
          position: { x: 0, y: 82, width: 100, height: 18 },
          layout: { columns: 2, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#f59e0b',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Arial, sans-serif',
              fontSize: '14px',
              fontWeight: '400',
              lineHeight: '1.6'
            }
          },
          content: {
            title: 'Skills',
            fields: [
              { name: 'technicalSkills', type: 'list', required: false, placeholder: 'Technical Skills' },
              { name: 'softSkills', type: 'list', required: false, placeholder: 'Soft Skills' },
              { name: 'languages', type: 'list', required: false, placeholder: 'Languages' }
            ]
          }
        }
      ],
      pageSettings: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
        spacing: { sectionGap: 12, itemSpacing: 4, lineSpacing: 1.2 }
      }
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
    category: ['professional', 'ats-friendly', 'modern'],
    thumbnail: '/CV templates/Modern ATS Resume Template to Download, CV Design for Social Media, Marketing an ats cv.jpeg',
    previewImage: '/CV templates/Modern ATS Resume Template to Download, CV Design for Social Media, Marketing an ats cv.jpeg',
    isPremium: false,
    isDefault: false,
    isATS: true,
    structure: {
      sections: [
        {
          id: 'header',
          name: 'Modern Header',
          type: 'personal',
          position: { x: 0, y: 0, width: 100, height: 18 },
          layout: { columns: 2, alignment: 'left', spacing: 'spacious' },
          styling: {
            backgroundColor: '#f8fafc',
            textColor: '#1e293b',
            accentColor: '#6366f1',
            borderStyle: 'solid',
            borderColor: '#e2e8f0',
            borderRadius: 8,
            shadow: 'light',
            typography: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
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
          }
        },
        {
          id: 'summary',
          name: 'Professional Summary',
          type: 'summary',
          position: { x: 0, y: 18, width: 100, height: 12 },
          layout: { columns: 1, alignment: 'justify', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#6366f1',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              fontWeight: '400',
              lineHeight: '1.6'
            }
          },
          content: {
            title: 'Professional Summary',
            fields: [
              { name: 'summary', type: 'paragraph', required: true, placeholder: 'Professional summary and career objectives' }
            ]
          }
        },
        {
          id: 'experience',
          name: 'Professional Experience',
          type: 'experience',
          position: { x: 0, y: 30, width: 100, height: 32 },
          layout: { columns: 1, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#6366f1',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Inter, sans-serif',
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
              { name: 'technologies', type: 'list', required: false, placeholder: 'Technologies Used' }
            ]
          }
        },
        {
          id: 'education',
          name: 'Education',
          type: 'education',
          position: { x: 0, y: 62, width: 100, height: 18 },
          layout: { columns: 1, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#10b981',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Inter, sans-serif',
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
              { name: 'gpa', type: 'text', required: false, placeholder: 'GPA' }
            ]
          }
        },
        {
          id: 'skills',
          name: 'Technical Skills',
          type: 'skills',
          position: { x: 0, y: 80, width: 100, height: 20 },
          layout: { columns: 2, alignment: 'left', spacing: 'spacious' },
          styling: {
            backgroundColor: '#fefefe',
            textColor: '#1f2937',
            accentColor: '#f97316',
            borderStyle: 'solid',
            borderColor: '#f3f4f6',
            borderRadius: 10,
            shadow: 'light',
            typography: {
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: '500',
              lineHeight: '1.5'
            }
          },
          content: {
            title: 'Technical Skills',
            fields: [
              { name: 'programmingLanguages', type: 'list', required: false, placeholder: 'Programming Languages' },
              { name: 'frameworks', type: 'list', required: false, placeholder: 'Frameworks & Libraries' },
              { name: 'tools', type: 'list', required: false, placeholder: 'Tools & Technologies' },
              { name: 'softSkills', type: 'list', required: false, placeholder: 'Soft Skills' }
            ]
          }
        }
      ],
      pageSettings: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 25, bottom: 25, left: 25, right: 25 },
        spacing: { sectionGap: 15, itemSpacing: 6, lineSpacing: 1.3 }
      }
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
    category: ['professional', 'ats-friendly', 'executive'],
    thumbnail: '/CV templates/Resume Template - Professional Modern Resume Template for, Executive.jpeg',
    previewImage: '/CV templates/Resume Template - Professional Modern Resume Template for, Executive.jpeg',
    isPremium: true,
    isDefault: false,
    isATS: true,
    structure: {
      sections: [
        {
          id: 'header',
          name: 'Executive Header',
          type: 'personal',
          position: { x: 0, y: 0, width: 100, height: 20 },
          layout: { columns: 1, alignment: 'center', spacing: 'spacious' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#1f2937',
            accentColor: '#1e40af',
            borderStyle: 'solid',
            borderColor: '#1e40af',
            borderRadius: 0,
            shadow: 'medium',
            typography: {
              fontFamily: 'Times New Roman, serif',
              fontSize: '18px',
              fontWeight: '600',
              lineHeight: '1.4'
            }
          },
          content: {
            title: 'Executive Information',
            fields: [
              { name: 'fullName', type: 'text', required: true, placeholder: 'Full Name' },
              { name: 'title', type: 'text', required: true, placeholder: 'Executive Title' },
              { name: 'email', type: 'email', required: true, placeholder: 'Email Address' },
              { name: 'phone', type: 'phone', required: true, placeholder: 'Phone Number' },
              { name: 'location', type: 'location', required: false, placeholder: 'City, State' },
              { name: 'linkedin', type: 'url', required: true, placeholder: 'LinkedIn URL' }
            ]
          }
        },
        {
          id: 'summary',
          name: 'Executive Summary',
          type: 'summary',
          position: { x: 0, y: 20, width: 100, height: 15 },
          layout: { columns: 1, alignment: 'justify', spacing: 'spacious' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#1e40af',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Times New Roman, serif',
              fontSize: '16px',
              fontWeight: '400',
              lineHeight: '1.7'
            }
          },
          content: {
            title: 'Executive Summary',
            fields: [
              { name: 'summary', type: 'paragraph', required: true, placeholder: 'Executive summary and leadership objectives' }
            ]
          }
        },
        {
          id: 'experience',
          name: 'Executive Experience',
          type: 'experience',
          position: { x: 0, y: 35, width: 100, height: 30 },
          layout: { columns: 1, alignment: 'left', spacing: 'spacious' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#1e40af',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Times New Roman, serif',
              fontSize: '15px',
              fontWeight: '400',
              lineHeight: '1.6'
            }
          },
          content: {
            title: 'Executive Experience',
            fields: [
              { name: 'company', type: 'text', required: true, placeholder: 'Company Name' },
              { name: 'position', type: 'text', required: true, placeholder: 'Executive Title' },
              { name: 'location', type: 'location', required: false, placeholder: 'Location' },
              { name: 'startDate', type: 'date', required: true, placeholder: 'Start Date' },
              { name: 'endDate', type: 'date', required: false, placeholder: 'End Date' },
              { name: 'description', type: 'paragraph', required: true, placeholder: 'Executive responsibilities and achievements' },
              { name: 'leadership', type: 'list', required: false, placeholder: 'Leadership achievements' }
            ]
          }
        },
        {
          id: 'education',
          name: 'Education',
          type: 'education',
          position: { x: 0, y: 65, width: 100, height: 15 },
          layout: { columns: 1, alignment: 'left', spacing: 'normal' },
          styling: {
            backgroundColor: '#ffffff',
            textColor: '#374151',
            accentColor: '#059669',
            borderStyle: 'none',
            borderColor: '#d1d5db',
            borderRadius: 0,
            shadow: 'none',
            typography: {
              fontFamily: 'Times New Roman, serif',
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
              { name: 'gpa', type: 'text', required: false, placeholder: 'GPA' }
            ]
          }
        },
        {
          id: 'skills',
          name: 'Leadership Skills',
          type: 'skills',
          position: { x: 0, y: 80, width: 100, height: 20 },
          layout: { columns: 2, alignment: 'left', spacing: 'spacious' },
          styling: {
            backgroundColor: '#f9fafb',
            textColor: '#1f2937',
            accentColor: '#dc2626',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
            borderRadius: 12,
            shadow: 'medium',
            typography: {
              fontFamily: 'Times New Roman, serif',
              fontSize: '14px',
              fontWeight: '500',
              lineHeight: '1.5'
            }
          },
          content: {
            title: 'Leadership Skills',
            fields: [
              { name: 'strategicSkills', type: 'list', required: false, placeholder: 'Strategic Planning' },
              { name: 'leadershipSkills', type: 'list', required: false, placeholder: 'Leadership & Management' },
              { name: 'technicalSkills', type: 'list', required: false, placeholder: 'Technical Expertise' },
              { name: 'softSkills', type: 'list', required: false, placeholder: 'Interpersonal Skills' }
            ]
          }
        }
      ],
      pageSettings: {
        pageSize: 'A4',
        orientation: 'portrait',
        margins: { top: 30, bottom: 30, left: 30, right: 30 },
        spacing: { sectionGap: 18, itemSpacing: 8, lineSpacing: 1.4 }
      }
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
    const atsTemplatesCount = await Template.countDocuments({ isATS: true });

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