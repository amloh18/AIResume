'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CVFormPanel from './CVFormPanel';
import CVPreviewPanel from './CVPreviewPanel';
import CVSidePanel from './CVSidePanel';
import { PDFService } from '@/lib/services/pdfService';
import { useCVStore } from '@/lib/stores/cvStore';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { CVService } from '@/lib/services/cvService';
import { TemplateService } from '@/lib/services/templateService';
import { JobService } from '@/lib/services/jobService';

interface CVStudioProps {
  jobId?: string | null;
  cvId?: string | null;
  userId: string;
}

const CVStudio: React.FC<CVStudioProps> = ({ jobId, cvId, userId }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store hooks
  const { 
    cvData, 
    setCVData, 
    updateCVField, 
    addSection, 
    removeSection,
    resetCV 
  } = useCVStore();
  
  const { 
    templates, 
    selectedTemplate, 
    setTemplates, 
    setSelectedTemplate 
  } = useTemplateStore();
  
  const { 
    currentJob, 
    setCurrentJob 
  } = useJobStore();

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load templates
        const templatesData = await TemplateService.getTemplates();
        setTemplates(templatesData);
        
        // Set default template if none selected
        if (!selectedTemplate && templatesData.length > 0) {
          const defaultTemplate = templatesData.find(t => t.isDefault) || templatesData[0];
          setSelectedTemplate(defaultTemplate);
        }

        // Load job data if jobId provided
        if (jobId) {
          const jobData = await JobService.getJob(jobId);
          setCurrentJob(jobData);
        }

        // Load CV data
        if (cvId) {
          // Load existing CV
          const cvData = await CVService.getCV(cvId);
          setCVData(cvData);
        } else {
          // Create new CV with default data
          const defaultCVData = {
            personalInfo: {
              firstName: '',
              lastName: '',
              email: '',
              phone: '',
              location: '',
              website: '',
              linkedin: '',
              github: '',
              summary: ''
            },
            experience: [],
            education: [],
            skills: [],
            projects: [],
            certifications: [],
            languages: [],
            customSections: []
          };
          setCVData(defaultCVData);
        }

      } catch (err) {
        console.error('Error loading initial data:', err);
        setError('Failed to load CV data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [jobId, cvId, userId]);

  const handleSave = async () => {
    try {
      if (cvId) {
        await CVService.updateCV(cvId, cvData);
      } else {
        const newCV = await CVService.createCV({
          ...cvData,
          jobId: jobId || undefined,
          templateId: selectedTemplate?.id
        });
        // Update URL with new CV ID
        router.replace(`/studio?jobId=${jobId}&cvId=${newCV.id}`);
      }
    } catch (err) {
      console.error('Error saving CV:', err);
      setError('Failed to save CV. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedTemplate) {
      setError('Please select a template first');
      return;
    }
    
    try {
      const blob = await PDFService.generatePDF(cvData, selectedTemplate);
      const filename = `${cvData.personalInfo.firstName}_${cvData.personalInfo.lastName}_CV.pdf`;
      PDFService.downloadPDF(blob, filename);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      setError('Failed to download PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CV Studio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-gray-900">CV Studio</h1>
            {currentJob && (
              <span className="text-sm text-gray-500">
                Tailoring for: {currentJob.title} at {currentJob.company}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Save CV
            </button>
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - CV Form */}
        <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
          <CVFormPanel 
            cvData={cvData}
            onUpdateField={updateCVField}
            onAddSection={addSection}
            onRemoveSection={removeSection}
            selectedTemplate={selectedTemplate}
          />
        </div>

        {/* Center Panel - Live Preview */}
        <div className="flex-1 bg-gray-50 overflow-y-auto">
          <CVPreviewPanel 
            cvData={cvData}
            template={selectedTemplate}
            jobData={currentJob}
          />
        </div>

        {/* Right Panel - Templates & AI */}
        <div className="w-1/3 bg-white border-l border-gray-200 overflow-y-auto">
          <CVSidePanel 
            templates={templates}
            selectedTemplate={selectedTemplate}
            onTemplateChange={setSelectedTemplate}
            cvData={cvData}
            jobData={currentJob}
            onUpdateField={updateCVField}
          />
        </div>
      </div>
    </div>
  );
};

export default CVStudio; 