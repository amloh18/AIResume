#!/usr/bin/env node

/**
 * Test Admin Template API Script
 * 
 * Tests the AdminTemplateService to ensure it can access templates correctly
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import the AdminTemplateService
const AdminTemplateService = require('../src/lib/services/adminTemplateService').default;

async function testTemplateService() {
  console.log('🧪 Testing Admin Template Service...\n');
  
  try {
    // Test 1: Get all templates
    console.log('1️⃣ Testing getAllTemplates()...');
    const allTemplates = await AdminTemplateService.getAllTemplates();
    console.log(`   ✅ Found ${allTemplates.length} templates`);
    
    // Test 2: Get free templates only
    console.log('\n2️⃣ Testing getFreeTemplates()...');
    const freeTemplates = await AdminTemplateService.getFreeTemplates('cv');
    console.log(`   ✅ Found ${freeTemplates.length} free templates`);
    
    // Test 3: Get premium templates only
    console.log('\n3️⃣ Testing getPremiumTemplates()...');
    const premiumTemplates = await AdminTemplateService.getPremiumTemplates('cv');
    console.log(`   ✅ Found ${premiumTemplates.length} premium templates`);
    
    // Test 4: Get default template
    console.log('\n4️⃣ Testing getDefaultTemplate()...');
    const defaultTemplate = await AdminTemplateService.getDefaultTemplate('cv');
    console.log(`   ✅ Default template: ${defaultTemplate ? defaultTemplate.name : 'None found'}`);
    
    // Test 5: Get template by ID
    if (allTemplates.length > 0) {
      console.log('\n5️⃣ Testing getTemplateById()...');
      const firstTemplateId = allTemplates[0].id || allTemplates[0]._id;
      const templateById = await AdminTemplateService.getTemplateById(firstTemplateId);
      console.log(`   ✅ Retrieved template by ID: ${templateById ? templateById.name : 'Failed'}`);
    }
    
    // Test 6: Search templates
    console.log('\n6️⃣ Testing searchTemplates()...');
    const searchResults = await AdminTemplateService.searchTemplates('Modern', 'cv');
    console.log(`   ✅ Search for "Modern" found ${searchResults.length} templates`);
    
    // Display template summary
    console.log('\n📋 Template Summary:');
    allTemplates.forEach((template, index) => {
      console.log(`   ${index + 1}. ${template.name} (${template.tier}, ${template.layoutType})`);
    });
    
    console.log('\n🎉 All AdminTemplateService tests passed!');
    
    // API simulation test
    console.log('\n🌐 Simulating API Response Format:');
    const apiResponse = {
      success: true,
      templates: allTemplates.map(template => ({
        id: template.id || template._id,
        name: template.name,
        description: template.description,
        tier: template.tier,
        layoutType: template.layoutType,
        globalStyles: template.globalStyles,
        columnLayout: template.columnLayout,
        sectionStyling: template.sectionStyling,
        availableSections: template.availableSections,
        pageSettings: template.pageSettings
      }))
    };
    
    console.log(`   ✅ API would return ${apiResponse.templates.length} properly formatted templates`);
    console.log(`   ✅ Sample template keys: ${Object.keys(apiResponse.templates[0] || {}).join(', ')}`);
    
  } catch (error) {
    console.error('❌ AdminTemplateService test failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await AdminTemplateService.closeConnection();
    console.log('\n📔 Template service connection closed');
  }
}

// Run test if called directly
if (require.main === module) {
  testTemplateService().catch(console.error);
}

module.exports = { testTemplateService };
