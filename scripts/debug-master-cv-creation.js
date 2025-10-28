#!/usr/bin/env node

/**
 * Debug script for Master CV creation issues
 * 
 * This script helps debug the "Analysis Failed" error when saving master CVs
 * by testing the API endpoint with sample data and checking for common issues.
 */

const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'user@cvcircle.io';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'user123';

// Sample CV data structure
const sampleCVData = {
  basics: {
    name: 'John Doe',
    label: 'Software Engineer',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    url: 'https://johndoe.dev',
    summary: 'Experienced software engineer with 5+ years of experience in full-stack development.',
    location: {
      address: '123 Main St',
      city: 'San Francisco',
      region: 'CA',
      postalCode: '94105',
      countryCode: 'US'
    },
    profiles: [
      {
        network: 'LinkedIn',
        username: 'johndoe',
        url: 'https://linkedin.com/in/johndoe'
      },
      {
        network: 'GitHub',
        username: 'johndoe',
        url: 'https://github.com/johndoe'
      }
    ]
  },
  work: [
    {
      name: 'Tech Corp',
      position: 'Senior Software Engineer',
      url: 'https://techcorp.com',
      startDate: '2022-01',
      endDate: 'present',
      summary: 'Led development of microservices architecture',
      highlights: [
        'Improved system performance by 40%',
        'Mentored 3 junior developers',
        'Implemented CI/CD pipeline'
      ]
    },
    {
      name: 'StartupXYZ',
      position: 'Full Stack Developer',
      url: 'https://startupxyz.com',
      startDate: '2020-06',
      endDate: '2021-12',
      summary: 'Developed web applications using React and Node.js',
      highlights: [
        'Built responsive web applications',
        'Integrated third-party APIs',
        'Optimized database queries'
      ]
    }
  ],
  education: [
    {
      institution: 'University of California',
      url: 'https://uc.edu',
      area: 'Computer Science',
      studyType: 'Bachelor',
      startDate: '2016-09',
      endDate: '2020-05',
      score: '3.8 GPA'
    }
  ],
  skills: [
    {
      category: 'Programming Languages',
      skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
    },
    {
      category: 'Frameworks',
      skills: ['React', 'Node.js', 'Express', 'Next.js']
    },
    {
      category: 'Tools',
      skills: ['Git', 'Docker', 'AWS', 'MongoDB']
    }
  ],
  projects: [
    {
      name: 'E-commerce Platform',
      startDate: '2023-01',
      endDate: '2023-06',
      description: 'Built a full-stack e-commerce platform with React and Node.js',
      highlights: [
        'Implemented payment processing',
        'Added real-time inventory tracking',
        'Created admin dashboard'
      ],
      url: 'https://github.com/johndoe/ecommerce-platform'
    }
  ]
};

// Sample AI analysis data
const sampleAIAnalysis = {
  strengths: [
    'Strong technical background in full-stack development',
    'Experience with modern frameworks and tools',
    'Good mix of startup and corporate experience'
  ],
  improvements: [
    'Consider adding more specific metrics to achievements',
    'Include more details about team size and project scope',
    'Add relevant certifications or courses'
  ],
  recommendations: [
    'Tailor CV for specific job applications',
    'Highlight leadership and mentoring experience',
    'Include quantifiable achievements where possible'
  ],
  atsScore: 85,
  generatedAt: new Date().toISOString()
};

async function testAuthentication() {
  console.log('🔐 Testing authentication...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        callbackUrl: '/'
      })
    });

    if (response.ok) {
      console.log('✅ Authentication test passed');
      return true;
    } else {
      console.log('❌ Authentication test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Authentication test error:', error.message);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('🗄️ Testing database connection...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Database connection test passed:', data);
      return true;
    } else {
      console.log('❌ Database connection test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Database connection test error:', error.message);
    return false;
  }
}

async function testTemplateService() {
  console.log('📋 Testing template service...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/templates`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Template service test passed:', data.templates?.length || 0, 'templates found');
      return true;
    } else {
      console.log('❌ Template service test failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.log('❌ Template service test error:', error.message);
    return false;
  }
}

async function testMasterCVCreation() {
  console.log('📝 Testing master CV creation...');
  
  const requestData = {
    title: 'Test Master CV',
    cvData: sampleCVData,
    metadata: {
      isMaster: true,
      tags: ['master-cv', 'test'],
      isPublic: false,
      aiAnalysis: sampleAIAnalysis,
      createdVia: 'debug-script',
      lastModified: new Date().toISOString()
    },
    authProviderId: 'test-user-id',
    authProvider: 'nextauth'
  };

  try {
    console.log('📤 Sending request to create Master CV...');
    console.log('📊 Request data:', {
      title: requestData.title,
      hasCVData: !!requestData.cvData,
      hasAIAnalysis: !!requestData.metadata.aiAnalysis,
      authProviderId: requestData.authProviderId
    });

    const response = await fetch(`${API_BASE_URL}/api/cvs/onboarding`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    });

    console.log('📡 Master CV creation response status:', response.status);
    
    if (!response.ok) {
      let errorMessage = `Master CV creation failed: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        console.error('❌ Master CV creation failed with details:', errorData);
        
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        if (errorData.details) {
          console.error('❌ Detailed error:', errorData.details);
        }
      } catch (parseError) {
        const errorText = await response.text();
        console.error('❌ Master CV creation failed (text response):', errorText);
        errorMessage = errorText || errorMessage;
      }
      
      console.log('❌ Master CV creation test failed:', errorMessage);
      return false;
    }

    const result = await response.json();
    console.log('📥 Master CV creation result:', result);

    if (result.success) {
      console.log('✅ Master CV creation test passed');
      console.log('📋 Created CV ID:', result.data?.cv?.id);
      return true;
    } else {
      console.log('❌ Master CV creation test failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Master CV creation test error:', error.message);
    return false;
  }
}

async function runDiagnostics() {
  console.log('🚀 Starting Master CV creation diagnostics...\n');
  
  const results = {
    authentication: await testAuthentication(),
    database: await testDatabaseConnection(),
    templates: await testTemplateService(),
    masterCV: await testMasterCVCreation()
  };
  
  console.log('\n📊 Diagnostic Results:');
  console.log('====================');
  console.log(`Authentication: ${results.authentication ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Database: ${results.database ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Templates: ${results.templates ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Master CV Creation: ${results.masterCV ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Master CV creation should work correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Check the logs above for details.');
    console.log('\n💡 Common fixes:');
    console.log('- Ensure MongoDB is running and accessible');
    console.log('- Check that templates exist in the database');
    console.log('- Verify authentication is working correctly');
    console.log('- Check environment variables (MONGODB_URI, NEXTAUTH_SECRET, etc.)');
  }
  
  return allPassed;
}

// Run diagnostics if this script is executed directly
if (require.main === module) {
  runDiagnostics()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Diagnostic script failed:', error);
      process.exit(1);
    });
}

module.exports = {
  runDiagnostics,
  testAuthentication,
  testDatabaseConnection,
  testTemplateService,
  testMasterCVCreation
};
