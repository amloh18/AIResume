'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { CVData } from '@/lib/stores/cvStore';
import { Template } from '@/lib/stores/templateStore';
import { Job } from '@/lib/stores/jobStore';

interface PreviewPanelProps {
  cvData: CVData;
  template: Template | null;
  jobData: Job | null;
  zoom: number;
  setZoom: (zoom: number) => void;
  paperSize: 'A4' | 'Letter';
  setPaperSize: (size: 'A4' | 'Letter') => void;
  documentType: 'cv' | 'cover-letter';
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  cvData,
  template,
  jobData,
  zoom,
  setZoom,
  paperSize,
  setPaperSize,
  documentType
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [fitMode, setFitMode] = useState<'fit-height' | 'custom'>('fit-height');
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Paper dimensions in pixels (assuming 96 DPI)
  const paperDimensions = {
    A4: { width: 794, height: 1123 }, // 8.27" x 11.69"
    Letter: { width: 816, height: 1056 } // 8.5" x 11"
  };

  const currentDimensions = paperDimensions[paperSize];

  // Auto-fit to container height
  useEffect(() => {
    if (!containerRef.current || fitMode !== 'fit-height') return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight - 32; // Account for padding
    const scale = containerHeight / currentDimensions.height;
    
    // Cap zoom between 0.5x and 2x
    const clampedScale = Math.max(0.5, Math.min(scale, 2));
    setZoom(clampedScale);
  }, [fitMode, paperSize, currentDimensions.height, setZoom]);

  const handleZoomIn = () => {
    setFitMode('custom');
    setZoom(Math.min(zoom + 0.1, 2));
  };

  const handleZoomOut = () => {
    setFitMode('custom');
    setZoom(Math.max(zoom - 0.1, 0.5));
  };

  const handleResetZoom = () => {
    setFitMode('fit-height');
  };

  const handlePreviousPage = () => {
    setCurrentPage(Math.max(1, currentPage - 1));
  };

  const handleNextPage = () => {
    // For now, assume single page - extend this for multi-page support
    setCurrentPage(currentPage + 1);
  };

  const renderCVPreview = () => {
    if (!template) {
      return (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>Select a template to preview</p>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="bg-white shadow-lg mx-auto"
        style={{
          width: currentDimensions.width * zoom,
          height: currentDimensions.height * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center'
        }}
      >
        {/* CV Content */}
        <div className="p-8 h-full">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {cvData.personalInfo.firstName} {cvData.personalInfo.lastName}
            </h1>
            <p className="text-gray-600">{cvData.personalInfo.email}</p>
            <p className="text-gray-600">{cvData.personalInfo.phone}</p>
            <p className="text-gray-600">{cvData.personalInfo.location}</p>
          </div>

          {/* Summary */}
          {cvData.personalInfo.summary && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Professional Summary</h2>
              <p className="text-gray-700">{cvData.personalInfo.summary}</p>
            </div>
          )}

          {/* Experience */}
          {cvData.experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Experience</h2>
              {cvData.experience.map((exp, index) => (
                <div key={exp.id} className="mb-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900">{exp.jobTitle}</h3>
                    <span className="text-sm text-gray-600">
                      {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{exp.company}, {exp.location}</p>
                  <p className="text-gray-600 text-sm">{exp.description}</p>
                </div>
              ))}
            </div>
          )}

          {/* Education */}
          {cvData.education.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Education</h2>
              {cvData.education.map((edu, index) => (
                <div key={edu.id} className="mb-4">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900">{edu.degree}</h3>
                    <span className="text-sm text-gray-600">
                      {edu.startDate} - {edu.current ? 'Present' : edu.endDate}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-2">{edu.institution}, {edu.location}</p>
                  <p className="text-gray-600 text-sm">{edu.field}</p>
                </div>
              ))}
            </div>
          )}

          {/* Skills */}
          {cvData.skills.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Skills</h2>
              {cvData.skills.map((skill, index) => (
                <div key={skill.id} className="mb-3">
                  <h3 className="font-medium text-gray-900 mb-1">{skill.category}</h3>
                  <p className="text-gray-600 text-sm">{skill.skills.join(', ')}</p>
                </div>
              ))}
            </div>
          )}

          {/* Projects */}
          {cvData.projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Projects</h2>
              {cvData.projects.map((project, index) => (
                <div key={project.id} className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                  <p className="text-gray-600 text-sm mb-2">{project.description}</p>
                  <p className="text-gray-500 text-xs">Technologies: {project.technologies.join(', ')}</p>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {cvData.certifications.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h2>
              {cvData.certifications.map((cert, index) => (
                <div key={cert.id} className="mb-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-gray-900">{cert.name}</h3>
                    <span className="text-sm text-gray-600">{cert.date}</span>
                  </div>
                  <p className="text-gray-600 text-sm">{cert.issuer}</p>
                </div>
              ))}
            </div>
          )}

          {/* Languages */}
          {cvData.languages.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Languages</h2>
              <div className="flex flex-wrap gap-2">
                {cvData.languages.map((lang, index) => (
                  <span key={lang.id} className="text-sm text-gray-600">
                    {lang.language} ({lang.proficiency})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCoverLetterPreview = () => {
    return (
      <div 
        className="bg-white shadow-lg mx-auto"
        style={{
          width: currentDimensions.width * zoom,
          height: currentDimensions.height * zoom,
          transform: `scale(${zoom})`,
          transformOrigin: 'top center'
        }}
      >
        <div className="p-8 h-full">
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              {cvData.personalInfo.firstName} {cvData.personalInfo.lastName}<br />
              {cvData.personalInfo.email}<br />
              {cvData.personalInfo.phone}<br />
              {cvData.personalInfo.location}
            </p>
            
            <p className="text-gray-600 mb-4">
              {jobData ? (
                <>
                  Hiring Manager<br />
                  {jobData.company}<br />
                  {jobData.location}
                </>
              ) : (
                <>
                  Hiring Manager<br />
                  [Company Name]<br />
                  [Company Address]
                </>
              )}
            </p>
          </div>

          <div className="mb-4">
            <p className="text-gray-600 mb-4">Dear Hiring Manager,</p>
            
            <p className="text-gray-700 mb-4">
              [Your cover letter content will appear here. Use the AI Assistant to generate tailored content.]
            </p>
            
            <p className="text-gray-700 mb-4">
              I am writing to express my interest in the [Position] role at [Company]. With my background in [relevant experience], I am confident in my ability to contribute effectively to your team.
            </p>
            
            <p className="text-gray-700 mb-4">
              [Additional paragraphs with specific examples and achievements...]
            </p>
            
            <p className="text-gray-700 mb-4">
              Thank you for considering my application. I look forward to discussing how my skills and experience can benefit [Company].
            </p>
          </div>

          <div>
            <p className="text-gray-600 mb-2">Sincerely,</p>
            <p className="text-gray-600">{cvData.personalInfo.firstName} {cvData.personalInfo.lastName}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 relative">
      {/* Preview Area */}
      <div 
        ref={containerRef}
        className="flex-1 flex items-center justify-center overflow-auto p-8"
      >
        <div ref={previewRef}>
          {documentType === 'cv' ? renderCVPreview() : renderCoverLetterPreview()}
        </div>
      </div>

      {/* Floating Document Controls */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-3 flex items-center space-x-4">
        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <div className="w-20">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={zoom}
              onChange={(e) => {
                setFitMode('custom');
                setZoom(parseFloat(e.target.value));
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          
          <button
            onClick={handleZoomIn}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>

        {/* Page Navigator */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Previous Page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          
          <span className="text-sm text-gray-300 min-w-[3rem] text-center">
            {currentPage}
          </span>
          
          <button
            onClick={handleNextPage}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Next Page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Paper Size Toggle */}
        <div className="flex items-center space-x-1 bg-gray-700 rounded p-1">
          <button
            onClick={() => setPaperSize('A4')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paperSize === 'A4'
                ? 'bg-lime-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            A4
          </button>
          <button
            onClick={() => setPaperSize('Letter')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              paperSize === 'Letter'
                ? 'bg-lime-600 text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            Letter
          </button>
        </div>

        {/* Fit Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleResetZoom}
            className={`p-2 rounded transition-colors ${
              fitMode === 'fit-height'
                ? 'bg-lime-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            } focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800`}
            title="Fit to Height"
          >
            <Maximize className="h-4 w-4" />
          </button>
          
          <button
            onClick={handleResetZoom}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded hover:bg-gray-700 focus:ring-2 focus:ring-lime-500 focus:ring-offset-2 focus:ring-offset-gray-800"
            title="Reset Zoom"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Background Grid */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '20px 20px'
          }}
        />
      </div>
    </div>
  );
};

export default PreviewPanel;
