#!/usr/bin/env node

/**
 * Verify Admin Templates Script
 * 
 * Verifies that templates are correctly stored in the cvcircle_admin database
 */

const mongoose = require('mongoose');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function connectAndVerify() {
  try {
    // Connect to admin database
    const adminMongoUri = process.env.ADMIN_MONGODB_URI || process.env.MONGODB_URI;
    await mongoose.connect(adminMongoUri);
    console.log('✅ Connected to Admin MongoDB');
    
    const db = mongoose.connection.db;
    const templatesCollection = db.collection('templates');
    
    // Get all templates
    const templates = await templatesCollection.find({}).sort({ name: 1 }).toArray();
    
    console.log(`\n📊 Found ${templates.length} templates in cvcircle_admin database:\n`);
    
    templates.forEach((template, index) => {
      console.log(`${index + 1}. 📄 ${template.name}`);
      console.log(`   🎨 Layout: ${template.layoutType}`);
      console.log(`   💎 Tier: ${template.tier}`);
      console.log(`   🎯 Categories: ${template.categories ? template.categories.join(', ') : 'None'}`);
      console.log(`   🖍️ Primary Color: ${template.globalStyles?.primaryColor || 'Not set'}`);
      console.log(`   📏 Font: ${template.globalStyles?.fontFamily || 'Not set'}`);
      console.log(`   📋 Sections: ${template.availableSections?.length || 0} sections`);
      console.log(`   ✅ Active: ${template.isActive ? 'Yes' : 'No'}`);
      console.log(`   🌟 Default: ${template.isDefault ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Verify template structure
    const sampleTemplate = templates[0];
    if (sampleTemplate) {
      console.log('🔍 Sample Template Structure Verification:');
      console.log(`   ✅ Name: ${!!sampleTemplate.name}`);
      console.log(`   ✅ Layout Type: ${!!sampleTemplate.layoutType}`);
      console.log(`   ✅ Global Styles: ${!!sampleTemplate.globalStyles}`);
      console.log(`   ✅ Column Layout: ${!!sampleTemplate.columnLayout}`);
      console.log(`   ✅ Section Styling: ${!!sampleTemplate.sectionStyling}`);
      console.log(`   ✅ Available Sections: ${!!sampleTemplate.availableSections}`);
      console.log(`   ✅ Page Settings: ${!!sampleTemplate.pageSettings}`);
    }
    
    // Check tier distribution
    const freeCount = templates.filter(t => t.tier === 'free').length;
    const premiumCount = templates.filter(t => t.tier === 'premium').length;
    
    console.log('\n💎 Tier Distribution:');
    console.log(`   🆓 Free: ${freeCount} templates`);
    console.log(`   💎 Premium: ${premiumCount} templates`);
    
    // Check layout distribution
    const layoutCounts = {};
    templates.forEach(t => {
      layoutCounts[t.layoutType] = (layoutCounts[t.layoutType] || 0) + 1;
    });
    
    console.log('\n📐 Layout Distribution:');
    Object.entries(layoutCounts).forEach(([layout, count]) => {
      console.log(`   📋 ${layout}: ${count} templates`);
    });
    
    console.log('\n🎉 Template verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📔 Database connection closed');
  }
}

// Run verification if called directly
if (require.main === module) {
  connectAndVerify().catch(console.error);
}

module.exports = { connectAndVerify };
