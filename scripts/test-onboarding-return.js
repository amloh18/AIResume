#!/usr/bin/env node

/**
 * Test Onboarding Return Flow
 * 
 * This script simulates a returning user with saved progress in localStorage.
 */

console.log('🧪 Testing onboarding return flow...\n');

// Simulate saved progress data
const savedProgress = {
  step: 'registration',
  cvData: {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5+ years in full-stack development.'
    },
    experience: [
      {
        company: 'TechCorp Inc.',
        position: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2022-01-01',
        current: true,
        description: 'Lead development of microservices architecture',
        achievements: [
          'Led a team of 6 developers to deliver a critical e-commerce platform',
          'Optimized database queries, reducing page load times by 60%'
        ]
      }
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2016-09-01',
        endDate: '2020-06-01',
        gpa: 3.8
      }
    ]
  },
  formData: {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      summary: 'Experienced software engineer with 5+ years in full-stack development.'
    },
    experience: [
      {
        company: 'TechCorp Inc.',
        position: 'Senior Software Engineer',
        location: 'San Francisco, CA',
        startDate: '2022-01-01',
        current: true,
        description: 'Lead development of microservices architecture',
        achievements: [
          'Led a team of 6 developers to deliver a critical e-commerce platform',
          'Optimized database queries, reducing page load times by 60%'
        ]
      }
    ],
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        startDate: '2016-09-01',
        endDate: '2020-06-01',
        gpa: 3.8
      }
    ]
  },
  timestamp: new Date().toISOString()
};

console.log('📋 Saved Progress Data:');
console.log(JSON.stringify(savedProgress, null, 2));
console.log('\n✅ Test data prepared successfully!');
console.log('\n🔗 To test the onboarding return flow:');
console.log('1. Open your browser console on the onboarding page');
console.log('2. Run this command to set the saved progress:');
console.log(`   localStorage.setItem('cvOnboardingProgress', '${JSON.stringify(savedProgress)}');`);
console.log('3. Refresh the page');
console.log('4. The registration modal should appear automatically');
console.log('\n🧹 To clear the test data:');
console.log("   localStorage.removeItem('cvOnboardingProgress');"); 