'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import StudioTopBar from './StudioTopBar';
import OnboardingFormPanel from './OnboardingFormPanel';
import PreviewPanel from './PreviewPanel';
import AIAssistantPanel from './AIAssistantPanel';
import { CVDataStructure } from '@/types/cv';
import { useTemplateStore } from '@/lib/stores/templateStore';
import { useJobStore } from '@/lib/stores/jobStore';
import { CVService } from '@/lib/services/cvService';
import { TemplateService } from '@/lib/services/templateService';
import { JobService } from '@/lib/services/jobService';
import { debounce } from 'lodash';
import { transformDatabaseToStudio } from '@/lib/utils/cvDataTransform';
import { toCVDataStructure } from '@/lib/utils/dataAdapter';

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
  const [selectedJobId, setSelectedJobId] = useState<string | null>(jobId || null);
  
  // CV Data state
  const [cvData, setCvData] = useState<CVDataStructure | null>(null);
  
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

  // Update CV field
  const updateCVField = useCallback((path: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      
      const pathArray = path.split('.');
      const newData = { ...prev };
      let current: any = newData;
      
      for (let i = 0; i < pathArray.length - 1; i++) {
        current = current[pathArray[i]];
      }
      
      current[pathArray[pathArray.length - 1]] = value;
      return newData;
    });
  }, []);

  // Add section
  const addSection = useCallback((sectionType: keyof CVDataStructure, item?: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      
      const newData = { ...prev };
      const section = newData[sectionType];
      
      if (Array.isArray(section)) {
        const defaultItem = item || getDefaultItemForSection(sectionType);
        newData[sectionType] = [...section, defaultItem] as any;
      }
      
      return newData;
    });
  }, []);

  // Remove section
  const removeSection = useCallback((sectionType: keyof CVDataStructure, id: string) => {
    setCvData(prev => {
      if (!prev) return prev;
      
      const newData = { ...prev };
      const section = newData[sectionType];
      
      if (Array.isArray(section)) {
        newData[sectionType] = section.filter((item: any) => {
          if (sectionType === 'work') return item.name !== id;
          if (sectionType === 'education') return item.institution !== id;
          if (sectionType === 'skills') return item.name !== id;
          if (sectionType === 'projects') return item.name !== id;
          if (sectionType === 'certificates') return item.name !== id;
          if (sectionType === 'languages') return item.language !== id;
          return true;
        }) as any;
      }
      
      return newData;
    });
  }, []);

  // Get default item for section
  const getDefaultItemForSection = (sectionType: keyof CVDataStructure) => {
    switch (sectionType) {
      case 'work':
        return {
          name: '',
          position: '',
          url: '',
          startDate: '',
          endDate: '',
          summary: '',
          highlights: []
        };
      case 'education':
        return {
          institution: '',
          url: '',
          area: '',
          studyType: '',
          startDate: '',
          endDate: '',
          score: '',
          courses: []
        };
      case 'skills':
        return {
          name: '',
          level: '',
          keywords: []
        };
      case 'projects':
        return {
          name: '',
          startDate: '',
          endDate: '',
          description: '',
          highlights: [],
          url: ''
        };
      case 'certificates':
        return {
          name: '',
          date: '',
          issuer: '',
          url: ''
        };
      case 'languages':
        return {
          language: '',
          fluency: ''
        };
      default:
        return {};
    }
  };

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (data: CVDataStructure) => {
      try {
        setSaveStatus('saving');
        if (cvId) {
          await CVService.updateCV(cvId, data, userId || undefined);
        } else {
          // Create new CV
          const userData = localStorage.getItem('user');
          const currentUserId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : '6889b151d17daa1eaee91a5c';
          
          const newCV = await CVService.createCV({
            userId: currentUserId,
            title: 'Untitled CV',
            ...data,
            jobId: selectedJobId || jobId || undefined
          });
          
          // Extract CV ID and update URL
          const newCvId = newCV.data?.cv?.id || newCV.id;
          router.replace(`/studio?cvId=${newCvId}${selectedJobId || jobId ? `&jobId=${selectedJobId || jobId}` : ''}`);
        }
        setSaveStatus('saved');
      } catch (err) {
        console.error('Error saving CV:', err);
        setSaveStatus('error');
      }
    }, 1000),
    [cvId, jobId, selectedJobId, selectedTemplate, router, userId]
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

        console.log('Loading initial data...', { cvId, jobId, userId });

        // Validate userId
        if (!userId) {
          throw new Error('User ID is required to load CV data');
        }

        // Load templates
        let templatesResult: any[] = [];
        try {
          templatesResult = await TemplateService.getTemplates();
          setTemplates(templatesResult);
          console.log('Templates loaded:', templatesResult.length);
        } catch (templateError) {
          console.error('Failed to load templates:', templateError);
          // Don't fail the entire load for template errors
          setTemplates([]);
        }

        // Load job data if jobId is provided
        if (jobId) {
          try {
            const jobResult = await JobService.getJob(jobId);
            setCurrentJob(jobResult);
            setSelectedJobId(jobId);
            console.log('Job data loaded:', jobResult);
          } catch (jobError) {
            console.error('Failed to load job data:', jobError);
            // Don't fail the entire load for job errors
          }
        }

        // Load CV data
        if (cvId) {
          let cvResult;
          
          // Check if CV data is in sessionStorage (for new CVs)
          const sessionCVData = sessionStorage.getItem('newCVData');
          if (sessionCVData) {
            try {
              const parsedCVData = JSON.parse(sessionCVData);
              console.log('Found CV data in sessionStorage:', parsedCVData);
              
              // Set CV data from sessionStorage
              if (parsedCVData.cvData) {
                const convertedData = toCVDataStructure(parsedCVData.cvData);
                console.log('Converted session CV data:', convertedData);
                setCvData(convertedData);
                cvResult = parsedCVData;
              } else {
                // Fallback to API call
                cvResult = await CVService.getCV(cvId, userId);
                const convertedData = toCVDataStructure(cvResult.cvData);
                console.log('Converted API CV data:', convertedData);
                setCvData(convertedData);
              }
              
              // Set template if available
              if (parsedCVData.templateId && templatesResult.length > 0) {
                const template = templatesResult.find((t: any) => t.id === parsedCVData.templateId);
                if (template) {
                  setSelectedTemplate(template);
                }
              }
              
              // Clear sessionStorage
              sessionStorage.removeItem('newCVData');
            } catch (error) {
              console.error('Error parsing session CV data:', error);
              // Fallback to API call
              cvResult = await CVService.getCV(cvId, userId);
              const convertedData = toCVDataStructure(cvResult.cvData);
              console.log('Converted fallback CV data:', convertedData);
              setCvData(convertedData);
            }
          } else {
            // Load existing CV from API
            cvResult = await CVService.getCV(cvId, userId);
            const convertedData = toCVDataStructure(cvResult.cvData);
            console.log('Converted existing CV data:', convertedData);
            setCvData(convertedData);
          }
          
          // Set template if available
          if (cvResult.templateId && templatesResult.length > 0) {
            const template = templatesResult.find((t: any) => t.id === cvResult.templateId);
            if (template) {
              setSelectedTemplate(template);
            }
          }
        } else {
          // Create default CV data structure
          const defaultCVData: CVDataStructure = {
            basics: {
              name: '',
              label: '',
              image: '',
              email: '',
              phone: '',
              url: '',
              summary: '',
              location: {
                address: '',
                postalCode: '',
                city: '',
                countryCode: '',
                region: ''
              },
              profiles: []
            },
            work: [],
            volunteer: [],
            education: [],
            awards: [],
            certificates: [],
            publications: [],
            skills: [],
            languages: [],
            interests: [],
            references: [],
            projects: []
          };
          console.log('Setting default CV data:', defaultCVData);
          setCvData(defaultCVData);
          
          // If no cvId is provided, we're creating a new CV
          // Set a default template if available
          if (templatesResult.length > 0) {
            setSelectedTemplate(templatesResult[0]);
          }
        }

        setIsLoading(false);
        console.log('Initial data loading completed');
      } catch (err) {
        console.error('Error loading initial data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load CV data');
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [cvId, jobId, userId, setTemplates, setSelectedTemplate, setCurrentJob, selectedTemplate]);

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
          ${panelStates.left ? 'w-[500px]' : 'w-12'}
          bg-gray-800 border-r border-gray-700
          flex-shrink-0 relative
        `}>
          <OnboardingFormPanel
            cvData={cvData || null}
            onUpdateField={updateCVField}
            onAddSection={addSection}
            onRemoveSection={removeSection}
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
            sectionOrder={['basics', 'experience', 'education', 'skills', 'projects', 'certificates', 'languages']}
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
            cvId={cvId || null}
          />
        </div>
      </div>
    </div>
  );
};

export default CVStudio; 