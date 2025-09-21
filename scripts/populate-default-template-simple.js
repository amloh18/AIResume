#!/usr/bin/env node

/**
 * Simple script to populate the default template in the database
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Default section blueprints
const defaultSectionBlueprints = [
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
  }
];

// Default professional template
const defaultProfessionalTemplate = {
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
    `
  },
  availableSections: defaultSectionBlueprints,
  templateData: {},
  isActive: true,
  isDefault: true,
  isPublished: true,
  globalAccess: true,
  version: 1
};

// Template schema
const templateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  thumbnail: String,
  category: {
    type: String,
    enum: ['cv', 'portfolio', 'cover-letter', 'resume', 'custom'],
    default: 'cv'
  },
  categories: [String],
  tier: {
    type: String,
    enum: ['free', 'premium'],
    default: 'free'
  },
  globalStyles: {
    fontFamily: String,
    primaryColor: String,
    secondaryColor: String,
    backgroundColor: String,
    fontSize: String,
    lineHeight: String,
    spacing: String,
    borderRadius: String,
    boxShadow: String,
    customCSS: String
  },
  availableSections: [{
    key: String,
    displayName: String,
    componentName: String,
    isList: Boolean,
    defaultItemContent: mongoose.Schema.Types.Mixed,
    description: String,
    icon: String,
    category: String,
    maxItems: Number,
    minItems: Number
  }],
  templateData: mongoose.Schema.Types.Mixed,
  isActive: { type: Boolean, default: true },
  isDefault: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false },
  globalAccess: { type: Boolean, default: true },
  version: { type: Number, default: 1 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Ensure only one default template per category
templateSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('Template').updateMany(
      { 
        category: this.category, 
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    );
  }
  next();
});

async function main() {
  console.log('🚀 Starting Default Template Population Script');
  console.log('═'.repeat(60));
  
  try {
    // Connect to database
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    
    const Template = mongoose.model('Template', templateSchema);
    
    // Check if default template already exists
    const existingTemplate = await Template.findOne({ 
      isDefault: true, 
      category: 'cv' 
    });
    
    if (existingTemplate) {
      console.log('⚠️  Default CV template already exists:', existingTemplate.name);
      console.log('   Updating existing template with latest configuration...');
      
      // Update the existing template
      const updatedTemplate = await Template.findByIdAndUpdate(
        existingTemplate._id,
        {
          ...defaultProfessionalTemplate,
          version: existingTemplate.version + 1
        },
        { new: true }
      );
      
      console.log('✅ Updated default template:', updatedTemplate.name);
    } else {
      console.log('📝 Creating new default template...');
      
      // Create new default template
      const template = new Template(defaultProfessionalTemplate);
      const savedTemplate = await template.save();
      
      console.log('✅ Created default template:', savedTemplate.name);
      console.log('   Template ID:', savedTemplate._id);
      console.log('   Available sections:', savedTemplate.availableSections.length);
    }
    
    console.log('\n✅ Default template population completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Test the template in the CV studio');
    console.log('   2. Verify all section components render correctly');
    console.log('   3. Check template selection in the UI');
    
  } catch (error) {
    console.error('\n❌ Script failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
