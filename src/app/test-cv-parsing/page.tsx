'use client';

import React, { useState } from 'react';
import InteractiveCVForm from '@/components/cv-parser/InteractiveCVForm';

const TestCVParsingPage: React.FC = () => {
  const [testData, setTestData] = useState<any>(null);

  const testParsedData = {
    personalInfo: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 234 567 8900',
      location: 'San Francisco, CA',
      website: 'https://johndoe.com',
      linkedin: 'linkedin.com/in/johndoe',
      github: 'github.com/johndoe',
      summary: 'Experienced software engineer with 5+ years of experience in full-stack development.'
    },
    education: [
      {
        institution: 'Stanford University',
        degree: 'Bachelor of Science',
        field: 'Computer Science',
        location: 'Stanford, CA',
        startDate: '2016',
        endDate: '2020',
        current: false,
        gpa: '3.8',
        description: 'Graduated with honors. Focused on algorithms and data structures.'
      }
    ],
    experience: [
      {
        company: 'Google',
        position: 'Senior Software Engineer',
        location: 'Mountain View, CA',
        startDate: '2020',
        endDate: 'Present',
        current: true,
        description: 'Leading development of scalable web applications.',
        achievements: [
          'Improved application performance by 40%',
          'Led a team of 5 developers',
          'Implemented new CI/CD pipeline'
        ]
      }
    ],
    skills: [
      {
        category: 'Programming Languages',
        skills: ['JavaScript', 'TypeScript', 'Python', 'Java']
      },
      {
        category: 'Frameworks',
        skills: ['React', 'Node.js', 'Express', 'Django']
      }
    ],
    projects: [
      {
        title: 'E-commerce Platform',
        description: 'Built a full-stack e-commerce platform with React and Node.js',
        technologies: ['React', 'Node.js', 'MongoDB', 'Stripe'],
        url: 'https://ecommerce-demo.com',
        github: 'https://github.com/johndoe/ecommerce',
        startDate: '2023',
        endDate: '2024',
        current: false
      }
    ]
  };

  const handleSave = (data: any) => {
    console.log('Form saved with data:', data);
    setTestData(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-4">CV Parsing Test</h1>
          <p className="text-white/60 mb-4">
            This page tests the CV parsing and form population functionality.
          </p>
          
          <div className="space-y-4">
            <button
              onClick={() => setTestData(testParsedData)}
              className="px-6 py-3 bg-lime-400 text-black font-medium rounded-xl hover:bg-lime-300 transition-colors"
            >
              Load Test Data
            </button>
            
            <button
              onClick={() => setTestData(null)}
              className="ml-4 px-6 py-3 bg-red-400 text-white font-medium rounded-xl hover:bg-red-300 transition-colors"
            >
              Clear Data
            </button>
          </div>
          
          {testData && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl">
              <h3 className="text-white font-semibold mb-2">Loaded Data:</h3>
              <pre className="text-white/60 text-sm overflow-auto">
                {JSON.stringify(testData, null, 2)}
              </pre>
            </div>
          )}
        </div>
        
        <InteractiveCVForm
          initialData={testData}
          onSave={handleSave}
        />
      </div>
    </div>
  );
};

export default TestCVParsingPage; 