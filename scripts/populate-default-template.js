#!/usr/bin/env node

/**
 * Script to populate the default template in the database
 * This creates the default "Modern Professional" template with all section blueprints
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '../.env.local') });

// Import the default template data
import { defaultProfessionalTemplate, defaultSectionBlueprints } from '../src/lib/templates/default-template.js';

// Template schema (simplified for script usage)
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

const Template = mongoose.model('Template', templateSchema);

async function connectToDatabase() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error);
    return false;
  }
}

async function populateDefaultTemplate() {
  try {
    console.log('🔍 Checking for existing default template...');
    
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
          availableSections: defaultSectionBlueprints,
          version: existingTemplate.version + 1
        },
        { new: true }
      );
      
      console.log('✅ Updated default template:', updatedTemplate.name);
      return updatedTemplate;
    }

    console.log('📝 Creating new default template...');
    
    // Create new default template
    const template = new Template({
      ...defaultProfessionalTemplate,
      availableSections: defaultSectionBlueprints
    });

    const savedTemplate = await template.save();
    console.log('✅ Created default template:', savedTemplate.name);
    console.log('   Template ID:', savedTemplate._id);
    console.log('   Available sections:', savedTemplate.availableSections.length);
    
    return savedTemplate;

  } catch (error) {
    console.error('❌ Error populating default template:', error);
    throw error;
  }
}

async function validateTemplate(template) {
  console.log('🔍 Validating template structure...');
  
  const requiredFields = ['name', 'category', 'globalStyles', 'availableSections'];
  const missingFields = requiredFields.filter(field => !template[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Template missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Validate section blueprints
  const sectionIssues = [];
  template.availableSections.forEach((section, index) => {
    if (!section.key) sectionIssues.push(`Section ${index} missing key`);
    if (!section.displayName) sectionIssues.push(`Section ${index} missing displayName`);
    if (!section.componentName) sectionIssues.push(`Section ${index} missing componentName`);
  });
  
  if (sectionIssues.length > 0) {
    throw new Error(`Section blueprint issues: ${sectionIssues.join(', ')}`);
  }
  
  console.log('✅ Template validation passed');
  console.log(`   - ${template.availableSections.length} section blueprints defined`);
  console.log(`   - Global styles configured`);
  console.log(`   - Template metadata complete`);
}

async function displayTemplateSummary(template) {
  console.log('\n📋 Template Summary:');
  console.log('═'.repeat(50));
  console.log(`Name: ${template.name}`);
  console.log(`Category: ${template.category}`);
  console.log(`Tier: ${template.tier}`);
  console.log(`Version: ${template.version}`);
  console.log(`Is Default: ${template.isDefault}`);
  console.log(`Is Published: ${template.isPublished}`);
  console.log('\n📝 Available Sections:');
  
  template.availableSections.forEach((section, index) => {
    console.log(`   ${index + 1}. ${section.displayName} (${section.key})`);
    console.log(`      Component: ${section.componentName}`);
    console.log(`      Type: ${section.isList ? 'List' : 'Single'}`);
    if (section.description) {
      console.log(`      Description: ${section.description}`);
    }
    console.log('');
  });
  
  console.log('🎨 Template Styles:');
  console.log(`   Font: ${template.globalStyles.fontFamily}`);
  console.log(`   Primary Color: ${template.globalStyles.primaryColor}`);
  console.log(`   Secondary Color: ${template.globalStyles.secondaryColor}`);
  console.log(`   Font Size: ${template.globalStyles.fontSize}`);
  console.log(`   Line Height: ${template.globalStyles.lineHeight}`);
  console.log('═'.repeat(50));
}

async function main() {
  console.log('🚀 Starting Default Template Population Script');
  console.log('═'.repeat(60));
  
  try {
    // Connect to database
    const connected = await connectToDatabase();
    if (!connected) {
      process.exit(1);
    }
    
    // Populate the default template
    const template = await populateDefaultTemplate();
    
    // Validate the template
    await validateTemplate(template);
    
    // Display summary
    await displayTemplateSummary(template);
    
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

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { populateDefaultTemplate, Template };
