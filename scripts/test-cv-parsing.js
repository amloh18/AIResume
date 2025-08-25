const fs = require('fs');
const path = require('path');

// Test CV parsing with a simple text file
async function testCVParsing() {
  console.log('🧪 Testing CV Parsing API...\n');

  // Create a simple test CV content
  const testCVContent = `
John Doe
Software Engineer
john.doe@email.com
+1 (555) 123-4567
LinkedIn: linkedin.com/in/johndoe

SUMMARY
Experienced software engineer with 5+ years in web development, specializing in React, Node.js, and cloud technologies.

WORK EXPERIENCE
Senior Software Engineer | TechCorp | 2022-01 - Present
- Led development of microservices architecture
- Mentored junior developers
- Improved system performance by 40%

Software Engineer | StartupXYZ | 2020-03 - 2021-12
- Built RESTful APIs using Node.js
- Implemented CI/CD pipelines
- Collaborated with cross-functional teams

EDUCATION
Bachelor of Science in Computer Science | University of Technology | 2016-09 - 2020-05
GPA: 3.8/4.0

SKILLS
Programming Languages: JavaScript, TypeScript, Python, Java
Frameworks: React, Node.js, Express, Django
Databases: MongoDB, PostgreSQL, Redis
Tools: Git, Docker, AWS, Jenkins
  `;

  try {
    // Test the API endpoint
    const response = await fetch('http://localhost:3001/api/ai/parse-cv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        plainText: testCVContent
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ CV Parsing Test PASSED');
      console.log('📄 Parsed CV Data:');
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      console.log('❌ CV Parsing Test FAILED');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ CV Parsing Test FAILED');
    console.log('Network Error:', error.message);
  }
}

// Test library availability
async function testLibraries() {
  console.log('📚 Testing Library Availability...\n');

  const libraries = [
    { name: 'pdf-parse', import: () => import('pdf-parse') },
    { name: 'mammoth', import: () => import('mammoth') },
    { name: 'tesseract.js', import: () => import('tesseract.js') }
  ];

  for (const lib of libraries) {
    try {
      const module = await lib.import();
      console.log(`✅ ${lib.name} - Available`);
    } catch (error) {
      console.log(`❌ ${lib.name} - Not available: ${error.message}`);
    }
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting CV Parsing Tests...\n');
  
  await testLibraries();
  console.log('\n' + '='.repeat(50) + '\n');
  await testCVParsing();
  
  console.log('\n✨ Tests completed!');
}

runTests().catch(console.error); 