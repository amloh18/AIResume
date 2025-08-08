const mongoose = require('mongoose');
require('dotenv').config();

// Define the Template schema directly in the script
const templateSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: [100, 'Template name cannot exceed 100 characters']
  },
  description: { 
    type: String, 
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  thumbnail: { 
    type: String, 
    trim: true 
  },
  category: { 
    type: String, 
    enum: ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'],
    default: 'cv'
  },
  globalStyles: {
    fontFamily: { 
      type: String, 
      default: 'Inter, system-ui, sans-serif' 
    },
    primaryColor: { 
      type: String, 
      default: '#2563eb' 
    },
    secondaryColor: { 
      type: String, 
      default: '#64748b' 
    },
    backgroundColor: { 
      type: String, 
      default: '#ffffff' 
    },
    fontSize: { 
      type: String, 
      default: '14px' 
    },
    lineHeight: { 
      type: String, 
      default: '1.6' 
    },
    spacing: { 
      type: String, 
      default: '24px' 
    },
    borderRadius: { 
      type: String, 
      default: '8px' 
    },
    boxShadow: { 
      type: String, 
      default: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
    },
    customCSS: { 
      type: String, 
      trim: true 
    }
  },
  availableSections: [{
    key: { 
      type: String, 
      required: true,
      trim: true
    },
    displayName: { 
      type: String, 
      required: true,
      trim: true
    },
    componentName: { 
      type: String, 
      required: true,
      trim: true
    },
    isList: { 
      type: Boolean, 
      default: false 
    },
    defaultItemContent: { 
      type: mongoose.Schema.Types.Mixed, 
      default: {} 
    },
    description: { 
      type: String, 
      trim: true 
    },
    icon: { 
      type: String, 
      trim: true 
    },
    category: { 
      type: String, 
      trim: true 
    },
    maxItems: { 
      type: Number, 
      min: 1 
    },
    minItems: { 
      type: Number, 
      min: 0 
    }
  }],
  isActive: { 
    type: Boolean, 
    default: true 
  },
  isDefault: { 
    type: Boolean, 
    default: false 
  },
  version: { 
    type: Number, 
    default: 1 
  },
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, {
  timestamps: true
});

const Template = mongoose.model('Template', templateSchema);

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
      availableSections: cvSections
    });

    // Save all templates
    await Promise.all([
      cvTemplate.save(),
      minimalistCvTemplate.save()
    ]);

    console.log('Successfully created templates:');
    console.log('- Modern CV (default)');
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