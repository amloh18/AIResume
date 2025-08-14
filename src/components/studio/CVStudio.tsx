'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StudioTopBar from './StudioTopBar';
import StructurePanel from './StructurePanel';
import PreviewPanel from './PreviewPanel';
import AIAssistantPanel from './AIAssistantPanel';
import { useCVStore } from '@/lib/stores/cvStore';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { CVService } from '@/lib/services/cvService';
import { TemplateService } from '@/lib/services/templateService';
import { JobService } from '@/lib/services/jobService';
import { debounce } from 'lodash';

interface CVStudioProps {
  jobId?: string | null;
  cvId?: string | null;
  userId: string;
}

const CVStudio: React.FC<CVStudioProps> = ({ jobId, cvId, userId }) => {
  const router = useRouter();
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [documentType, setDocumentType] = useState<'cv' | 'cover-letter'>('cv');
  const [panelStates, setPanelStates] = useState({
    left: true,
    right: true
  });
  const [zoom, setZoom] = useState(1);
  const [paperSize, setPaperSize] = useState<'A4' | 'Letter'>('A4');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobId);
  
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

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (data: any) => {
      try {
        setSaveStatus('saving');
        if (cvId) {
          await CVService.updateCV(cvId, { ...data, jobId: selectedJobId });
        } else {
          const newCV = await CVService.createCV({
            ...data,
            jobId: selectedJobId || jobId || undefined,
            templateId: selectedTemplate?.id
          });
          // Update URL with new CV ID
          router.replace(`/studio?jobId=${selectedJobId || jobId}&cvId=${newCV.id}`);
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving CV:', err);
        setSaveStatus('error');
      }
    }, 1000),
    [cvId, jobId, selectedJobId, selectedTemplate, router]
  );

  // Autosave on any change
  useEffect(() => {
    if (cvData && !isLoading) {
      debouncedSave(cvData);
    }
  }, [cvData, debouncedSave, isLoading]);

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
          setSelectedJobId(jobId);
        }

        // Load CV data
        if (cvId) {
          // Load existing CV
          const cvData = await CVService.getCV(cvId);
          setCVData(cvData);
          if (cvData.jobId) {
            setSelectedJobId(cvData.jobId);
            const jobData = await JobService.getJob(cvData.jobId);
            setCurrentJob(jobData);
          }
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

  const handleExport = async (format: 'pdf' | 'docx' | 'json') => {
    try {
      setSaveStatus('saving');
      // Implementation for export functionality
      console.log(`Exporting as ${format}`);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Error exporting:', err);
      setSaveStatus('error');
    }
  };

  const togglePanel = (panel: 'left' | 'right') => {
    setPanelStates(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }));
  };

  const handleJobSelection = async (jobId: string | null) => {
    setSelectedJobId(jobId);
    if (jobId) {
      try {
        const jobData = await JobService.getJob(jobId);
        setCurrentJob(jobData);
      } catch (err) {
        console.error('Error loading job data:', err);
      }
    } else {
      setCurrentJob(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lime-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Loading Studio...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-red-400 mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
      {/* Top App Bar */}
      <StudioTopBar
        documentType={documentType}
        setDocumentType={setDocumentType}
        saveStatus={saveStatus}
        onExport={handleExport}
        onBack={() => router.push('/dashboard')}
        panelStates={panelStates}
        onTogglePanel={togglePanel}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Structure */}
        <div className={`
          transition-all duration-300 ease-out
          ${panelStates.left ? 'w-96' : 'w-16'}
          bg-gray-800 border-r border-gray-700
          flex-shrink-0 relative
        `}>
          <StructurePanel
            cvData={cvData}
            onUpdateField={updateCVField}
            onAddSection={addSection}
            onRemoveSection={removeSection}
            selectedTemplate={selectedTemplate}
            isCollapsed={!panelStates.left}
            onTogglePanel={() => togglePanel('left')}
          />
        </div>

        {/* Center Panel - Preview */}
        <div className="flex-1 bg-gray-900 relative">
          <PreviewPanel
            cvData={cvData}
            template={selectedTemplate}
            jobData={currentJob}
            zoom={zoom}
            setZoom={setZoom}
            paperSize={paperSize}
            setPaperSize={setPaperSize}
            documentType={documentType}
          />
        </div>

        {/* Right Panel - AI Assistant */}
        <div className={`
          transition-all duration-300 ease-out
          ${panelStates.right ? 'w-96' : 'w-16'}
          bg-gray-800 border-l border-gray-700
          flex-shrink-0 relative
        `}>
          <AIAssistantPanel
            cvData={cvData}
            jobData={currentJob}
            onUpdateField={updateCVField}
            isCollapsed={!panelStates.right}
            documentType={documentType}
            selectedJobId={selectedJobId}
            onJobSelection={handleJobSelection}
            onTogglePanel={() => togglePanel('right')}
            cvId={cvId}
          />
        </div>
      </div>
    </div>
  );
};

export default CVStudio; 