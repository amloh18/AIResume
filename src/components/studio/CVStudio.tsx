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
import Toast from '@/components/ui/Toast';
import { generateCVName, generateCVDescription } from '@/lib/utils/cvNamingUtils';

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
  const [justCreated, setJustCreated] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
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
      
      // Auto-update CV title when name, label, or summary changes
      if (path.startsWith('basics.') && (path.includes('name') || path.includes('label') || path.includes('summary'))) {
        const newTitle = generateCVName(newData);
        const newDescription = generateCVDescription(newData);
        
        // Update the CV title in the database if we have a CV ID
        if (cvId) {
          // Debounced update to avoid too many API calls
          const updateTitle = debounce(async () => {
            try {
              await CVService.updateCVMetadata(cvId, {
                title: newTitle,
                description: newDescription
              }, userId || undefined);
              console.log('✅ Auto-updated CV title to:', newTitle);
            } catch (error) {
              console.error('❌ Failed to auto-update CV title:', error);
            }
          }, 1000);
          
          updateTitle();
        }
      }
      
      return newData;
    });
  }, [cvId, userId]);

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

  // Manual save function
  const manualSave = useCallback(async () => {
    if (!cvData) return;
    
    try {
      console.log('🔍 Studio - Manual save triggered...');
      setSaveStatus('saving');
      
      if (cvId) {
        console.log('🔍 Studio - Manually updating existing CV:', cvId);
        await CVService.updateCV(cvId, cvData, userId || undefined);
        console.log('✅ Studio - Manual CV update successful');
        setSaveStatus('saved');
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
      } else {
        console.log('🔍 Studio - Manual save for new CV');
        // Create new CV
        const userData = localStorage.getItem('user');
        const currentUserId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : userId || '6889b151d17daa1eaee91a5c';
        
        const newCV = await CVService.createCV({
          userId: currentUserId,
          title: 'Untitled CV',
          ...cvData,
          jobId: selectedJobId || jobId || undefined
        });
        
        const newCvId = newCV.data?.cv?.id || newCV.data?.cv?._id || newCV.id || newCV._id;
        console.log('🔍 Studio - Manual CV creation with ID:', newCvId);
        
        router.replace(`/studio?cvId=${newCvId}${selectedJobId || jobId ? `&jobId=${selectedJobId || jobId}` : ''}`);
        setSaveStatus('saved');
        setShowSavedMessage(true);
        setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
        setJustCreated(true);
        setTimeout(() => setJustCreated(false), 2000);
      }
    } catch (err) {
      console.error('❌ Studio - Manual save error:', err);
      setSaveStatus('error');
    }
  }, [cvData, cvId, userId, selectedJobId, jobId, router]);

  // Debounced autosave
  const debouncedSave = useCallback(
    debounce(async (data: CVDataStructure) => {
      try {
        console.log('🔍 Studio - Starting save operation...');
        setSaveStatus('saving');
        
        // Add timeout protection
        const saveTimeout = setTimeout(() => {
          console.error('❌ Studio - Save operation timed out');
          setSaveStatus('error');
        }, 10000); // 10 second timeout
        
        if (cvId) {
          console.log('🔍 Studio - Updating existing CV:', cvId);
          await CVService.updateCV(cvId, data, userId || undefined);
          console.log('✅ Studio - CV updated successfully');
          clearTimeout(saveTimeout);
          setSaveStatus('saved');
          setShowSavedMessage(true);
          setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
        } else {
          // Create new CV
          const userData = localStorage.getItem('user');
          const currentUserId = userData ? JSON.parse(userData).id || JSON.parse(userData)._id : userId || '6889b151d17daa1eaee91a5c';
          
          console.log('🔍 Studio - Creating new CV for user:', currentUserId);
          const newCV = await CVService.createCV({
            userId: currentUserId,
            title: 'Untitled CV',
            ...data,
            jobId: selectedJobId || jobId || undefined
          });
          
          // Extract CV ID and update URL
          const newCvId = newCV.data?.cv?.id || newCV.data?.cv?._id || newCV.id || newCV._id;
          console.log('🔍 Studio - New CV created with ID:', newCvId);
          
          // Update URL to include the new CV ID
          router.replace(`/studio?cvId=${newCvId}${selectedJobId || jobId ? `&jobId=${selectedJobId || jobId}` : ''}`);
          
          // Set save status to saved since we just created the CV
          clearTimeout(saveTimeout);
          setSaveStatus('saved');
          setShowSavedMessage(true);
          setTimeout(() => setShowSavedMessage(false), 2000); // Hide after 2 seconds
          
          // Set flag to prevent immediate autosave
          setJustCreated(true);
          setTimeout(() => setJustCreated(false), 2000); // Reset after 2 seconds
        }
      } catch (err) {
        console.error('❌ Studio - Error saving CV:', err);
        setSaveStatus('error');
      }
    }, 1000),
    [cvId, jobId, selectedJobId, selectedTemplate, router, userId]
  );

  // Autosave on any change
  useEffect(() => {
    if (cvData && !isLoading && !justCreated) {
      debouncedSave(cvData);
    }
  }, [cvData, debouncedSave, isLoading, justCreated]);

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
      {/* Toast Notifications */}
      <Toast
        message="CV saved successfully!"
        type="success"
        isVisible={showSavedMessage}
        onClose={() => setShowSavedMessage(false)}
        duration={2000}
      />
      
      {/* Top App Bar */}
      <StudioTopBar
        documentType={documentType}
        setDocumentType={setDocumentType}
        saveStatus={saveStatus}
        onExport={handleExport}
        onBack={() => router.push('/dashboard')}
        onManualSave={manualSave}
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
            userId={userId}
          />
        </div>
      </div>
    </div>
  );
};

export default CVStudio; 