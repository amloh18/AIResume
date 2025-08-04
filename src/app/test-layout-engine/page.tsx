'use client';

import React, { useState } from 'react';
import { LayoutEngine } from '@/components/layout/LayoutEngine';
import { TEMPLATE_REGISTRY } from '@/components/templates/TemplateRegistry';
import { SNIPPET_REGISTRY } from '@/components/snippets/SnippetRegistry';

const TestLayoutEnginePage: React.FC = () => {
  const [selectedTemplate, setSelectedTemplate] = useState('modernProfessional');
  const [zoom, setZoom] = useState(1);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Sample CV data for testing
  const testCVData = {
    sections: {
      profile: {
        name: "John Doe",
        contact0: "(555) 123-4567",
        contact1: "john.doe@email.com",
        contact2: "linkedin.com/in/johndoe",
        summary: "Experienced software engineer with 5+ years in full-stack development. Passionate about creating scalable web applications and leading technical teams."
      },
      experience: {
        entries: [
          {
            title: "Senior Software Engineer",
            company: "Tech Corp",
            duration: "2022 - Present",
            details: [
              "Led development of microservices architecture serving 1M+ users",
              "Mentored 5 junior developers and improved team productivity by 30%",
              "Implemented CI/CD pipeline reducing deployment time by 60%"
            ]
          },
          {
            title: "Full Stack Developer",
            company: "Startup Inc",
            duration: "2020 - 2022",
            details: [
              "Built React/Node.js application from scratch",
              "Optimized database queries improving performance by 40%",
              "Collaborated with design team to implement responsive UI"
            ]
          }
        ]
      },
      education: {
        entries: [
          {
            degree: "Bachelor of Computer Science",
            institution: "University of Technology",
            duration: "2016 - 2020",
            details: [
              "GPA: 3.8/4.0",
              "Relevant coursework: Data Structures, Algorithms, Database Systems",
              "Senior Project: Machine Learning-based Recommendation System"
            ]
          }
        ]
      },
      skills: {
        entries: [
          {
            title: "Programming Languages",
            details: ["JavaScript", "Python", "Java", "TypeScript"]
          },
          {
            title: "Frameworks & Tools",
            details: ["React", "Node.js", "Docker", "AWS", "Git"]
          },
          {
            title: "Databases",
            details: ["PostgreSQL", "MongoDB", "Redis"]
          }
        ]
      },
      languages: {
        entries: [
          { title: "English", level: "Native" },
          { title: "Spanish", level: "Fluent" },
          { title: "French", level: "Intermediate" }
        ]
      },
      projects: {
        entries: [
          {
            title: "E-commerce Platform",
            duration: "2023",
            details: [
              "Built full-stack e-commerce platform with React and Node.js",
              "Integrated payment processing with Stripe API",
              "Deployed on AWS with Docker containers"
            ]
          }
        ]
      }
    },
    sectionSnippets: {
      profile: 'profileCentered',
      experience: 'experienceBulletDash',
      education: 'educationSimple',
      skills: 'skillsChip',
      languages: 'languagesDot',
      projects: 'projectsList'
    }
  };

  const handleDataChange = (sectionId: string, data: any) => {
    console.log('Data changed:', sectionId, data);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Layout Engine Test</h1>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Controls</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Template Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {Object.values(TEMPLATE_REGISTRY).map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Zoom Control */}
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
                className="w-full"
              />
            </div>

            {/* Preview Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview Mode
              </label>
              <button
                onClick={() => setIsPreviewMode(!isPreviewMode)}
                className={`px-4 py-2 rounded-md font-medium ${
                  isPreviewMode
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-500 text-white hover:bg-gray-600'
                }`}
              >
                {isPreviewMode ? 'Preview On' : 'Preview Off'}
              </button>
            </div>
          </div>

          {/* Template Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Current Template: {TEMPLATE_REGISTRY[selectedTemplate]?.name}</h3>
            <div className="text-sm text-gray-600">
              <p><strong>Layout:</strong> {TEMPLATE_REGISTRY[selectedTemplate]?.layout.columns} column(s)</p>
              <p><strong>Fonts:</strong> {TEMPLATE_REGISTRY[selectedTemplate]?.fonts.heading} / {TEMPLATE_REGISTRY[selectedTemplate]?.fonts.body}</p>
              <p><strong>Sections:</strong> {Object.keys(TEMPLATE_REGISTRY[selectedTemplate]?.sections || {}).join(', ')}</p>
            </div>
          </div>
        </div>

        {/* Layout Engine */}
        <div className="flex justify-center">
          <LayoutEngine
            cvData={testCVData}
            templateId={selectedTemplate}
            zoom={zoom}
            isPreviewMode={isPreviewMode}
            onDataChange={handleDataChange}
          />
        </div>

        {/* Snippet Registry Info */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Available Snippets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(SNIPPET_REGISTRY).map((snippet) => (
              <div key={snippet.id} className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-sm">{snippet.title}</h3>
                <p className="text-xs text-gray-600 mb-2">{snippet.description}</p>
                <div className="text-xs text-gray-500">
                  <p><strong>Section:</strong> {snippet.section}</p>
                  <p><strong>Usage:</strong> {snippet.usageCount || 0}</p>
                  <p><strong>Compatible:</strong> {snippet.compatibleTemplates.slice(0, 2).join(', ')}...</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestLayoutEnginePage; 