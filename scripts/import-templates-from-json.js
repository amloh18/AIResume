#!/usr/bin/env node

/**
 * Import Templates from JSON Script
 * 
 * Imports the template definitions from public/CV templates/templates.json
 * into the cvcircle_admin database
 */

const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function connectAdminDB() {
  try {
    // Connect to admin database
    const adminMongoUri = process.env.ADMIN_MONGODB_URI || process.env.MONGODB_URI;
    if (!adminMongoUri) {
      throw new Error('ADMIN_MONGODB_URI or MONGODB_URI not found in environment variables');
    }
    
    await mongoose.connect(adminMongoUri);
    console.log('✅ Connected to Admin MongoDB');
    console.log('🔍 Database URL:', adminMongoUri.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
  } catch (error) {
    console.error('❌ Admin MongoDB connection failed:', error);
    process.exit(1);
  }
}

function parseTemplatesFromJSON() {
  const jsonFilePath = path.join(__dirname, '..', 'public', 'CV templates', 'templates.json');
  
  if (!fs.existsSync(jsonFilePath)) {
    throw new Error(`Templates JSON file not found at: ${jsonFilePath}`);
  }
  
  console.log('📖 Reading templates from:', jsonFilePath);
  const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
  
  // The JSON file contains multiple template objects separated by commas
  // We need to parse it as an array by wrapping it in brackets
  let cleanedContent = fileContent.trim();
  
  // Remove trailing comma if present
  if (cleanedContent.endsWith(',')) {
    cleanedContent = cleanedContent.slice(0, -1);
  }
  
  // Wrap in array brackets to make it valid JSON array
  const arrayContent = `[${cleanedContent}]`;
  
  try {
    const templates = JSON.parse(arrayContent);
    console.log(`✅ Successfully parsed ${templates.length} templates from JSON`);
    return templates;
  } catch (error) {
    console.error('❌ Error parsing JSON:', error);
    console.log('📝 Content preview:', cleanedContent.substring(0, 500) + '...');
    throw error;
  }
}

function normalizeTemplate(template, index) {
  // Generate a proper ObjectId for templates that don't have one
  const templateId = new mongoose.Types.ObjectId();
  
  // Map layoutType from JSON to our schema
  let layoutType = template.layoutType;
  if (layoutType === 'single-and-split') {
    layoutType = 'custom';
  }
  
  // Determine tier based on template characteristics
  const premiumTemplates = ['The Hybrid', 'The Infographic', 'The Bold Header'];
  const tier = premiumTemplates.includes(template.name) ? 'premium' : 'free';
  
  // Create comprehensive available sections based on column layout
  const availableSections = [];
  const allSections = new Set();
  
  // Collect all sections from columnLayout
  if (template.columnLayout) {
    Object.values(template.columnLayout).forEach(column => {
      if (column.sections) {
        column.sections.forEach(section => allSections.add(section));
      }
    });
  }
  
  // Define section mappings with proper component names
  const sectionMappings = {
    'personal_header': { displayName: 'Personal Header', componentName: 'PersonalHeaderSection', isList: false },
    'personal_info': { displayName: 'Personal Information', componentName: 'PersonalInfoSection', isList: false },
    'contact_info': { displayName: 'Contact Information', componentName: 'ContactInfoSection', isList: false },
    'summary': { displayName: 'Professional Summary', componentName: 'SummarySection', isList: false },
    'profile': { displayName: 'Profile', componentName: 'ProfileSection', isList: false },
    'work_experience': { displayName: 'Work Experience', componentName: 'WorkExperienceSection', isList: true },
    'professional_experience': { displayName: 'Professional Experience', componentName: 'WorkExperienceSection', isList: true },
    'education': { displayName: 'Education', componentName: 'EducationSection', isList: true },
    'skills': { displayName: 'Skills', componentName: 'SkillsSection', isList: true },
    'projects': { displayName: 'Projects', componentName: 'ProjectsSection', isList: true },
    'awards': { displayName: 'Awards', componentName: 'AwardsSection', isList: true },
    'languages': { displayName: 'Languages', componentName: 'LanguagesSection', isList: true }
  };
  
  // Create available sections array
  allSections.forEach(sectionKey => {
    const mapping = sectionMappings[sectionKey];
    if (mapping) {
      availableSections.push({
        key: sectionKey,
        displayName: mapping.displayName,
        componentName: mapping.componentName,
        isList: mapping.isList,
        defaultItemContent: mapping.isList ? {} : { content: '' }
      });
    }
  });
  
  // If no sections found in columnLayout, add default sections
  if (availableSections.length === 0) {
    availableSections.push(
      { key: 'personal_header', displayName: 'Personal Header', componentName: 'PersonalHeaderSection', isList: false, defaultItemContent: { name: '', label: '', email: '', phone: '', location: '' } },
      { key: 'summary', displayName: 'Professional Summary', componentName: 'SummarySection', isList: false, defaultItemContent: { summary: '' } },
      { key: 'work_experience', displayName: 'Work Experience', componentName: 'WorkExperienceSection', isList: true, defaultItemContent: { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] } },
      { key: 'education', displayName: 'Education', componentName: 'EducationSection', isList: true, defaultItemContent: { institution: '', degree: '', area: '', startDate: '', endDate: '' } },
      { key: 'skills', displayName: 'Skills', componentName: 'SkillsSection', isList: true, defaultItemContent: { name: '', level: '', keywords: [] } }
    );
  }
  
  return {
    _id: templateId,
    name: template.name,
    description: generateDescription(template.name, template.globalStyles.primaryColor),
    category: 'cv',
    categories: determineCategories(template.name, layoutType),
    tier: tier,
    layoutType: layoutType,
    globalStyles: {
      fontFamily: template.globalStyles.fontFamily || 'Inter, sans-serif',
      primaryColor: template.globalStyles.primaryColor || '#007BFF',
      secondaryColor: template.globalStyles.secondaryColor || '#212529',
      backgroundColor: template.globalStyles.backgroundColor || '#ffffff',
      fontSize: template.globalStyles.fontSize || '11pt',
      lineHeight: template.globalStyles.lineHeight || '1.5',
      spacing: template.globalStyles.spacing || '20px',
      customCSS: template.globalStyles.customCSS || ''
    },
    columnLayout: template.columnLayout || {
      main: {
        width: '100%',
        sections: ['personal_header', 'summary', 'work_experience', 'education', 'skills']
      }
    },
    sectionStyling: template.sectionStyling || {},
    availableSections: availableSections,
    pageSettings: {
      format: 'A4',
      orientation: 'portrait',
      margins: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm'
      },
      maxHeight: '277mm'
    },
    isActive: true,
    isDefault: index === 0, // Make first template default
    isPublished: true,
    globalAccess: true,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  };
}

function generateDescription(name, primaryColor) {
  const descriptions = {
    'The Modern Professional': 'Clean, professional single-column design with classic blue accents. Perfect for corporate and business roles.',
    'The Two-Column Sidebar': 'Modern two-column layout with a distinct sidebar for personal info. Features purple accents for creative professionals.',
    'The Timeline': 'Elegant timeline-based design with visual progression indicators. Perfect for showcasing career progression.',
    'The Stacked Blocks': 'Modern block-based design with distinctive sections. Each section is visually separated for clear information hierarchy.',
    'The Hybrid': 'Unique hybrid layout combining single and split sections. Perfect for tech and environmental professionals.',
    'The Minimalist': 'Clean, sophisticated design with elegant typography and minimal styling for maximum readability.',
    'The Infographic': 'Visual-focused design with skill bars and icons. Perfect for designers and creative professionals.',
    'The Classic': 'Traditional academic and corporate design with timeless typography. Classic styling for maximum professionalism.',
    'The Bubble': 'Playful design with rounded elements and bubble-style section headers. Perfect for creative and startup professionals.',
    'The Bold Header': 'Eye-catching design with a prominent colored header section. For modern professionals who want to stand out.'
  };
  
  return descriptions[name] || `Professional CV template featuring ${primaryColor} accent color and modern design elements.`;
}

function determineCategories(name, layoutType) {
  const categoryMap = {
    'The Modern Professional': ['Professional', 'Modern'],
    'The Two-Column Sidebar': ['Modern', 'Creative'],
    'The Timeline': ['Creative', 'Modern'],
    'The Stacked Blocks': ['Modern', 'Creative'],
    'The Hybrid': ['Modern', 'Creative'],
    'The Minimalist': ['Professional', 'Minimal'],
    'The Infographic': ['Creative', 'Modern'],
    'The Classic': ['Professional', 'Traditional'],
    'The Bubble': ['Creative', 'Modern'],
    'The Bold Header': ['Modern', 'Creative']
  };
  
  return categoryMap[name] || ['Professional'];
}

async function importTemplates() {
  console.log('\n🎨 Importing templates from JSON file...');
  
  const db = mongoose.connection.db;
  const templatesCollection = db.collection('templates');
  
  // Parse templates from JSON file
  const templateData = parseTemplatesFromJSON();
  
  // Normalize and prepare templates
  const templates = templateData.map((template, index) => normalizeTemplate(template, index));
  
  console.log(`\n📋 Processing ${templates.length} templates:`);
  templates.forEach((template, index) => {
    console.log(`${index + 1}. ${template.name} (${template.tier}, ${template.layoutType})`);
  });
  
  try {
    // Clear existing templates first
    console.log('\n🗑️ Clearing existing templates...');
    const deleteResult = await templatesCollection.deleteMany({});
    console.log(`✅ Removed ${deleteResult.deletedCount} existing templates`);
    
    // Insert new templates
    console.log('\n📥 Inserting new templates...');
    const insertResult = await templatesCollection.insertMany(templates);
    console.log(`✅ Inserted ${insertResult.insertedCount} templates`);
    
    // Verify insertion
    const verifyCount = await templatesCollection.countDocuments();
    console.log(`✅ Verification: ${verifyCount} templates now in database`);
    
    console.log('\n🎉 Template import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error importing templates:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting Template Import from JSON\n');
  
  try {
    await connectAdminDB();
    await importTemplates();
    
    console.log('\n📋 Templates successfully imported to cvcircle_admin database:');
    console.log('1. ✅ The Modern Professional (Classic Blue - Free)');
    console.log('2. ✅ The Two-Column Sidebar (Deep Purple - Free)');
    console.log('3. ✅ The Timeline (Crimson Red - Free)');
    console.log('4. ✅ The Stacked Blocks (Amber Yellow - Free)');
    console.log('5. ✅ The Hybrid (Forest Green - Premium)');
    console.log('6. ✅ The Minimalist (Slate Gray - Free)');
    console.log('7. ✅ The Infographic (Turquoise - Premium)');
    console.log('8. ✅ The Classic (Classic Black - Free)');
    console.log('9. ✅ The Bubble (Orange - Free)');
    console.log('10. ✅ The Bold Header (Vivid Purple - Premium)');
    
  } catch (error) {
    console.error('\n💥 Template import failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📔 Database connection closed');
  }
}

// Run import if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };

