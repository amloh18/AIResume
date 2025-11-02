'use client';

import React from 'react';
import { Template } from '@/lib/stores/templateStore';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import EnhancedCVPreview from './EnhancedCVPreview';
import CVPreviewContent from './CVPreviewContent';

interface TemplatePreviewProps {
  template: Template;
  cvData?: UnifiedCVDataStructure | null;
  scale?: number;
  className?: string;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  template,
  cvData,
  scale = 0.3,
  className = ''
}) => {
  // Generate sample CV data if none provided
  const sampleCVData: UnifiedCVDataStructure = cvData || {
    basics: {
      name: 'John Doe',
      label: 'Software Engineer',
      email: 'john.doe@example.com',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      website: 'https://johndoe.dev',
      summary: 'Experienced software engineer with 5+ years of expertise in full-stack development, cloud architecture, and team leadership.'
    },
    work: [
      {
        name: 'Tech Corp',
        position: 'Senior Software Engineer',
        startDate: '2022-01',
        endDate: 'present',
        summary: 'Led development of microservices architecture and mentored junior developers.',
        highlights: [
          'Architected scalable microservices reducing system load by 40%',
          'Led team of 5 developers in agile environment',
          'Implemented CI/CD pipelines improving deployment efficiency'
        ]
      },
      {
        name: 'StartupXYZ',
        position: 'Full Stack Developer',
        startDate: '2020-06',
        endDate: '2021-12',
        summary: 'Developed web applications using modern technologies and best practices.',
        highlights: [
          'Built responsive web applications serving 10K+ users',
          'Collaborated with cross-functional teams',
          'Optimized database queries improving performance by 60%'
        ]
      }
    ],
    education: [
      {
        institution: 'University of California',
        area: 'Computer Science',
        studyType: 'Bachelor',
        startDate: '2016-09',
        endDate: '2020-05',
        gpa: '3.8'
      }
    ],
    skills: [
      {
        name: 'Programming Languages',
        level: 'Expert',
        keywords: ['JavaScript', 'TypeScript', 'Python', 'Java', 'Go']
      },
      {
        name: 'Frameworks & Libraries',
        level: 'Advanced',
        keywords: ['React', 'Node.js', 'Express', 'Next.js', 'Django']
      },
      {
        name: 'Cloud & DevOps',
        level: 'Intermediate',
        keywords: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Terraform']
      }
    ],
    projects: [
      {
        name: 'E-commerce Platform',
        description: 'Full-stack e-commerce solution with payment integration',
        highlights: ['Built with React and Node.js', 'Integrated Stripe payments', 'Deployed on AWS'],
        startDate: '2023-01',
        endDate: '2023-06',
        url: 'https://github.com/johndoe/ecommerce-platform'
      }
    ],
    certificates: [],
    languages: [
      {
        language: 'English',
        fluency: 'Native'
      },
      {
        language: 'Spanish',
        fluency: 'Conversational'
      }
    ]
  };

  const previewDimensions = {
    width: 300 * scale,
    height: 400 * scale
  };

  return (
    <div 
      className={`relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}
      style={{
        width: previewDimensions.width,
        height: previewDimensions.height
      }}
    >
      {/* Template Preview Content */}
      <div 
        className="absolute inset-0 transform origin-top-left"
        style={{
          transform: `scale(${scale})`,
          width: '300px',
          height: '400px'
        }}
      >
        {/* Use enhanced preview if template has availableSections */}
        {template.availableSections && template.availableSections.length > 0 ? (
          <EnhancedCVPreview
            cvData={sampleCVData}
            template={template}
            theme="light"
            showBadge={false}
            sectionOrder={['personal_header', 'work_experience', 'education', 'skills', 'projects']}
            sectionVisibility={{
              personal_header: true,
              work_experience: true,
              education: true,
              skills: true,
              projects: true,
              certificates: false,
              languages: false
            }}
            pagePadding={{ top: 20, bottom: 20 }}
          />
        ) : (
          <CVPreviewContent
            cvData={sampleCVData}
            theme="light"
            showBadge={false}
            sectionOrder={['personal_header', 'work_experience', 'education', 'skills', 'projects']}
            sectionVisibility={{
              personal_header: true,
              work_experience: true,
              education: true,
              skills: true,
              projects: true,
              certificates: false,
              languages: false
            }}
            templateStyles={template.globalStyles}
            customCSS={template.globalStyles?.customCSS}
            templateName={template.name}
            pagePadding={{ top: 20, bottom: 20 }}
          />
        )}
      </div>

      {/* Template Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
        <p className="text-white text-xs font-medium truncate">{template.name}</p>
      </div>

      {/* Tier Badge */}
      {template.tier === 'premium' && (
        <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Premium
        </div>
      )}

      {/* Default Badge */}
      {template.isDefault && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
          Default
        </div>
      )}
    </div>
  );
};

export default TemplatePreview;
