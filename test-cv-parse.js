const fs = require('fs');
const path = require('path');

// Test the parsing libraries directly
async function testLibraries() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing PDF and DOCX parsing libraries...');
  console.log('═══════════════════════════════════════════════════════\n');

  // Test pdf-parse
  try {
    const pdfParse = require('pdf-parse');
    console.log('✅ pdf-parse: Successfully loaded');
    
    // Create a minimal test PDF buffer (just to verify import works)
    console.log('   Module type:', typeof pdfParse);
    console.log('   Has function:', typeof pdfParse === 'function');
  } catch (error) {
    console.error('❌ pdf-parse: Failed to load');
    console.error('   Error:', error.message);
  }

  // Test mammoth
  try {
    const mammoth = require('mammoth');
    console.log('✅ mammoth: Successfully loaded');
    console.log('   Has extractRawText:', typeof mammoth.extractRawText === 'function');
  } catch (error) {
    console.error('❌ mammoth: Failed to load');
    console.error('   Error:', error.message);
  }

  // Test pdf2pic
  try {
    const pdf2pic = require('pdf2pic');
    console.log('✅ pdf2pic: Successfully loaded');
    console.log('   Has fromPath:', typeof pdf2pic.fromPath === 'function');
  } catch (error) {
    console.error('❌ pdf2pic: Failed to load (optional - requires ImageMagick/Ghostscript)');
    console.error('   Error:', error.message);
  }

  // Test tesseract.js
  try {
    const Tesseract = require('tesseract.js');
    console.log('✅ tesseract.js: Successfully loaded');
    console.log('   Has createWorker:', typeof Tesseract.createWorker === 'function');
  } catch (error) {
    console.error('❌ tesseract.js: Failed to load');
    console.error('   Error:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Library test complete!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Test API endpoint (requires server to be running)
async function testAPIEndpoint() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing API endpoint...');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    const response = await fetch('http://localhost:3000/api/cv/parse', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint is accessible');
      console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200) + '...');
    } else {
      console.log('⚠️  API endpoint returned:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('⚠️  API endpoint not accessible (server may not be running)');
    console.log('   Start server with: npm run dev');
    console.log('   Error:', error.message);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('API test complete!');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run tests
async function runTests() {
  console.log('\n🚀 CV Parsing Test Suite\n');
  
  await testLibraries();
  await testAPIEndpoint();
  
  console.log('\n✨ All tests completed!\n');
  console.log('Next steps:');
  console.log('1. If server is not running: npm run dev');
  console.log('2. Upload a PDF/DOCX file through the UI');
  console.log('3. Check the console for parsing logs\n');
}

runTests().catch(console.error);