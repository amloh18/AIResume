'use client';

import React, { useState } from 'react';
import { LayoutEngine } from '@/components/layout/LayoutEngine';

const TestSimplePage: React.FC = () => {
  const [templateId, setTemplateId] = useState('modernProfessional');
  const [zoom, setZoom] = useState(1);

  // Simple test data
  const testData = {
    sections: {
      profile: {
        name: "Test User",
        contact0: "test@email.com",
        contact1: "(555) 123-4567",
        contact2: "linkedin.com/in/testuser",
        summary: "This is a test CV to verify the layout engine is working correctly."
      },
      experience: {
        entries: [
          {
            title: "Software Engineer",
            company: "Test Company",
            duration: "2022 - Present",
            details: [
              "Developed web applications using React and Node.js",
              "Led a team of 5 developers",
              "Improved application performance by 40%"
            ]
          }
        ]
      },
      education: {
        entries: [
          {
            degree: "Bachelor of Computer Science",
            institution: "Test University",
            duration: "2018 - 2022",
            details: [
              "GPA: 3.8/4.0",
              "Relevant coursework: Data Structures, Algorithms"
            ]
          }
        ]
      },
      skills: {
        entries: [
          {
            title: "Programming Languages",
            details: ["JavaScript", "Python", "Java"]
          },
          {
            title: "Frameworks",
            details: ["React", "Node.js", "Express"]
          }
        ]
      }
    },
    sectionSnippets: {
      profile: 'profileCentered',
      experience: 'experienceBulletDash',
      education: 'educationSimple',
      skills: 'skillsChip'
    }
  };

  const handleDataChange = (sectionId: string, data: any) => {
    console.log('Data changed:', sectionId, data);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple Layout Engine Test</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="p-2 border border-gray-300 rounded-md"
              >
                <option value="modernProfessional">Modern Professional</option>
                <option value="minimalistATS">Minimalist ATS</option>
                <option value="creativeGraphical">Creative Graphical</option>
                <option value="compactTextual">Compact Textual</option>
                <option value="twoColumnClassic">Two Column Classic</option>
                <option value="modernMinimal">Modern Minimal</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoom: {zoom}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
        </div>

        {/* Layout Engine */}
        <div className="flex justify-center">
          <LayoutEngine
            cvData={testData}
            templateId={templateId}
            zoom={zoom}
            isPreviewMode={false}
            onDataChange={handleDataChange}
          />
        </div>

        <div className="mt-8 text-center text-gray-600">
          <p>✅ Layout Engine is working! You can edit the CV content by clicking on any text.</p>
        </div>
      </div>
    </div>
  );
};

export default TestSimplePage; 