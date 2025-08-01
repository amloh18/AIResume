const fs = require('fs');
const path = require('path');

async function testCVParsing() {
  console.log('🧪 Testing CV Parsing API...\n');

  try {
    // Test 1: Check if API endpoint is accessible
    console.log('1. Testing API endpoint accessibility...');
    const testResponse = await fetch('http://localhost:3000/api/cv/parse');
    
    if (testResponse.ok) {
      const testData = await testResponse.json();
      console.log('✅ API endpoint is accessible');
      console.log('Test response:', testData);
    } else {
      console.log('❌ API endpoint is not accessible');
      console.log('Status:', testResponse.status);
    }

    // Test 2: Test with a simple text file
    console.log('\n2. Testing with a simple text file...');
    
    // Create a simple test CV content
    const testCVContent = `
John Doe
Software Engineer
john.doe@email.com
+1 (555) 123-4567
San Francisco, CA

EDUCATION
Bachelor of Science in Computer Science
Stanford University
2018-2022

EXPERIENCE
Software Engineer
Tech Company Inc.
2022-Present
- Developed web applications using React and Node.js
- Collaborated with cross-functional teams
- Improved application performance by 30%

SKILLS
JavaScript, React, Node.js, Python, SQL
    `;

    // Create a temporary test file
    const testFilePath = path.join(__dirname, 'test-cv.txt');
    fs.writeFileSync(testFilePath, testCVContent);

    // Read the file and create FormData
    const fileBuffer = fs.readFileSync(testFilePath);
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    formData.append('file', blob, 'test-cv.txt');

    const parseResponse = await fetch('http://localhost:3000/api/cv/parse', {
      method: 'POST',
      body: formData
    });

    if (parseResponse.ok) {
      const parsedData = await parseResponse.json();
      console.log('✅ File parsing successful');
      console.log('Parsed data:', JSON.stringify(parsedData, null, 2));
    } else {
      console.log('❌ File parsing failed');
      console.log('Status:', parseResponse.status);
      const errorText = await parseResponse.text();
      console.log('Error:', errorText);
    }

    // Clean up test file
    fs.unlinkSync(testFilePath);

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testCVParsing().then(() => {
  console.log('\n🏁 CV parsing test completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
}); 