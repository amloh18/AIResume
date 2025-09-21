import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  StudioState, 
  StudioActions, 
  StudioInitParams, 
  UseStudioReturn,
  StudioEntryMode,
  DocumentType,
  StudioSessionContext,
  ApplicationJourneyData,
  JobData,
  CVData,
  CoverLetterData
} from '@/types/studio';
import { CVDataStructure } from '@/types/cv';
import { requireAuthContext } from '@/lib/user-resolution';

/**
 * Core Studio State Management Hook
 * 
 * This hook implements the intelligent Studio that adapts to different entry points:
 * 1. Journey Mode: Linked to ApplicationJourney with job context
 * 2. Standalone Mode: Direct document editing with optional job linking
 */
export function useStudio(): UseStudioReturn {
  const router = useRouter();
  
  // Core State
  const [state, setState] = useState<StudioState>({
    sessionContext: {
      mode: 'standalone',
      documentType: 'cv',
      userId: ''
    },
    isLoading: true,
    isSaving: false,
    saveStatus: 'saved',
    documentData: {} as CVDataStructure,
    documentTitle: 'Untitled Document',
    isDocumentModified: false,
    availableJobs: [],
    leftPanelVisible: true,
    rightPanelVisible: true,
    activeLeftTab: 'structure',
    selectedTemplateId: '',
    designOverrides: {},
    previewSettings: {
      zoom: 1,
      paperSize: 'A4'
    }
  });

  /**
   * Initialize Studio Session
   * Determines mode and loads appropriate data based on parameters
   */
  const initializeSession = useCallback(async (params: StudioInitParams) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: undefined }));

      // Get authenticated user context
      const authContext = await requireAuthContext();
      
      // Determine entry mode
      const mode: StudioEntryMode = params.journeyId ? 'journey' : 'standalone';
      
      console.log('🎯 Studio initializing:', { mode, ...params });

      if (mode === 'journey') {
        await initializeJourneyMode(params, authContext.mongoUserId.toString());
      } else {
        await initializeStandaloneMode(params, authContext.mongoUserId.toString());
      }

    } catch (error) {
      console.error('❌ Studio initialization failed:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: error instanceof Error ? error.message : 'Failed to initialize Studio'
      }));
    }
  }, []);

  /**
   * Initialize Journey Mode
   * Loads ApplicationJourney, Job, and linked documents
   */
  const initializeJourneyMode = async (params: StudioInitParams, userId: string) => {
    console.log('🔗 Initializing Journey Mode:', params.journeyId);

    // 1. Fetch ApplicationJourney
    const journeyResponse = await fetch(`/api/application-journeys/${params.journeyId}`);
    if (!journeyResponse.ok) {
      throw new Error('Application journey not found');
    }
    const applicationJourney: ApplicationJourneyData = await journeyResponse.json();

    // 2. Fetch linked Job data
    const jobResponse = await fetch(`/api/jobs/${applicationJourney.jobId}`);
    if (!jobResponse.ok) {
      throw new Error('Linked job not found');
    }
    const linkedJob: JobData = await jobResponse.json();

    // 3. Fetch or create document based on type
    let currentDocument: CVData | CoverLetterData | null = null;
    let documentData: CVDataStructure | string;
    let documentTitle: string;

    if (params.documentType === 'cv') {
      if (applicationJourney.cvId) {
        // Load existing CV
        const cvResponse = await fetch(`/api/cvs/${applicationJourney.cvId}`);
        if (cvResponse.ok) {
          currentDocument = await cvResponse.json();
          documentData = (currentDocument as CVData).cvData;
          documentTitle = currentDocument.title;
        } else {
          throw new Error('Linked CV not found');
        }
      } else {
        // Create new CV for this journey
        const { newCV, newDocumentData } = await createJourneyCV(applicationJourney, linkedJob, userId);
        currentDocument = newCV;
        documentData = newDocumentData;
        documentTitle = newCV.title;
      }
    } else {
      if (applicationJourney.coverLetterId) {
        // Load existing cover letter
        const clResponse = await fetch(`/api/cover-letters/${applicationJourney.coverLetterId}`);
        if (clResponse.ok) {
          currentDocument = await clResponse.json();
          documentData = (currentDocument as CoverLetterData).content;
          documentTitle = currentDocument.title;
        } else {
          throw new Error('Linked cover letter not found');
        }
      } else {
        // Create new cover letter for this journey
        const { newCoverLetter, newContent } = await createJourneyCoverLetter(applicationJourney, linkedJob, userId);
        currentDocument = newCoverLetter;
        documentData = newContent;
        documentTitle = newCoverLetter.title;
      }
    }

    // 4. Load available jobs for potential switching
    const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
    const availableJobs = jobsResponse.ok ? await jobsResponse.json() : [];

    // 5. Update state
    const sessionContext: StudioSessionContext = {
      mode: 'journey',
      documentType: params.documentType,
      journeyId: params.journeyId!,
      applicationJourney,
      linkedJob,
      userId,
      currentDocument
    };

    setState(prev => ({
      ...prev,
      sessionContext,
      documentData,
      documentTitle,
      selectedJobId: linkedJob.id,
      availableJobs,
      selectedTemplateId: params.documentType === 'cv' ? (currentDocument as CVData).templateId : '',
      isLoading: false,
      activeLeftTab: 'structure' // Start with structure for journey mode
    }));

    // 6. Run initial ATS analysis
    await runATSAnalysisInternal(documentData, linkedJob.jobDescription || '', params.documentType);

    console.log('✅ Journey mode initialized successfully');
  };

  /**
   * Initialize Standalone Mode
   * Loads document directly, no job context initially
   */
  const initializeStandaloneMode = async (params: StudioInitParams, userId: string) => {
    console.log('📄 Initializing Standalone Mode:', params.documentId);

    let currentDocument: CVData | CoverLetterData;
    let documentData: CVDataStructure | string;
    let documentTitle: string;

    if (params.documentId) {
      // Load existing document
      const endpoint = params.documentType === 'cv' ? `/api/cvs/${params.documentId}` : `/api/cover-letters/${params.documentId}`;
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error('Document not found');
      }
      
      currentDocument = await response.json();
      documentData = params.documentType === 'cv' ? (currentDocument as CVData).cvData : (currentDocument as CoverLetterData).content;
      documentTitle = currentDocument.title;
    } else {
      // Create new document
      if (params.documentType === 'cv') {
        const { newCV, newDocumentData } = await createStandaloneCV(userId);
        currentDocument = newCV;
        documentData = newDocumentData;
        documentTitle = newCV.title;
      } else {
        const { newCoverLetter, newContent } = await createStandaloneCoverLetter(userId);
        currentDocument = newCoverLetter;
        documentData = newContent;
        documentTitle = newCoverLetter.title;
      }
    }

    // Load available jobs for linking
    const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
    const availableJobs = jobsResponse.ok ? await jobsResponse.json() : [];

    // Update state
    const sessionContext: StudioSessionContext = {
      mode: 'standalone',
      documentType: params.documentType,
      userId,
      currentDocument,
      documentId: params.documentId
    };

    setState(prev => ({
      ...prev,
      sessionContext,
      documentData,
      documentTitle,
      availableJobs,
      selectedTemplateId: params.documentType === 'cv' ? (currentDocument as CVData).templateId : '',
      isLoading: false,
      activeLeftTab: 'structure' // Start with structure
    }));

    console.log('✅ Standalone mode initialized successfully');
  };

  /**
   * Update Document Data
   * Tracks modifications and triggers auto-save
   */
  const updateDocument = useCallback((data: CVDataStructure | string) => {
    setState(prev => ({
      ...prev,
      documentData: data,
      isDocumentModified: true,
      saveStatus: 'saving'
    }));

    // Debounced auto-save logic could go here
    // For now, just update the modified flag
  }, []);

  /**
   * Save Document
   * Saves to backend and updates ApplicationJourney if in journey mode
   */
  const saveDocument = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isSaving: true }));

      const { sessionContext, documentData, documentTitle } = state;
      
      let documentId: string;

      if (sessionContext.documentType === 'cv') {
        const cvData = {
          title: documentTitle,
          cvData: documentData as CVDataStructure,
          templateId: state.selectedTemplateId
        };

        if (sessionContext.currentDocument?.id) {
          // Update existing CV
          const response = await fetch(`/api/cvs/${sessionContext.currentDocument.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cvData)
          });
          
          if (!response.ok) throw new Error('Failed to save CV');
          documentId = sessionContext.currentDocument.id;
        } else {
          // Create new CV
          const response = await fetch('/api/cvs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cvData)
          });
          
          if (!response.ok) throw new Error('Failed to create CV');
          const result = await response.json();
          documentId = result.cv.id;
        }
      } else {
        const coverLetterData = {
          title: documentTitle,
          content: documentData as string
        };

        if (sessionContext.currentDocument?.id) {
          // Update existing cover letter
          const response = await fetch(`/api/cover-letters/${sessionContext.currentDocument.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coverLetterData)
          });
          
          if (!response.ok) throw new Error('Failed to save cover letter');
          documentId = sessionContext.currentDocument.id;
        } else {
          // Create new cover letter
          const response = await fetch('/api/cover-letters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(coverLetterData)
          });
          
          if (!response.ok) throw new Error('Failed to create cover letter');
          const result = await response.json();
          documentId = result.coverLetter.id;
        }
      }

      // Update ApplicationJourney if in journey mode
      if (sessionContext.mode === 'journey' && sessionContext.journeyId) {
        await updateApplicationJourneyDocument(sessionContext.journeyId, sessionContext.documentType, documentId);
      }

      setState(prev => ({
        ...prev,
        isSaving: false,
        saveStatus: 'saved',
        isDocumentModified: false,
        lastSavedAt: new Date()
      }));

      console.log('✅ Document saved successfully');

    } catch (error) {
      console.error('❌ Save failed:', error);
      setState(prev => ({
        ...prev,
        isSaving: false,
        saveStatus: 'error',
        error: error instanceof Error ? error.message : 'Save failed'
      }));
    }
  }, [state]);

  /**
   * Select Job for ATS Analysis
   * Loads job and runs ATS analysis
   */
  const selectJob = useCallback(async (jobId: string) => {
    try {
      const response = await fetch(`/api/jobs/${jobId}`);
      if (!response.ok) throw new Error('Job not found');
      
      const job: JobData = await response.json();
      
      setState(prev => ({ ...prev, selectedJobId: jobId }));
      
      // Run ATS analysis with new job
      await runATSAnalysisInternal(state.documentData, job.jobDescription || '', state.sessionContext.documentType);
      
    } catch (error) {
      console.error('❌ Job selection failed:', error);
    }
  }, [state.documentData, state.sessionContext.documentType]);

  /**
   * Run ATS Analysis
   * Analyzes document against job description
   */
  const runATSAnalysis = useCallback(async () => {
    const { selectedJobId, availableJobs, documentData, sessionContext } = state;
    
    if (!selectedJobId) return;
    
    const selectedJob = availableJobs.find(job => job.id === selectedJobId);
    if (!selectedJob?.jobDescription) return;
    
    await runATSAnalysisInternal(documentData, selectedJob.jobDescription, sessionContext.documentType);
  }, [state]);

  /**
   * Internal ATS Analysis Function
   */
  const runATSAnalysisInternal = async (
    documentData: CVDataStructure | string, 
    jobDescription: string, 
    documentType: DocumentType
  ) => {
    try {
      const response = await fetch('/api/ats/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: documentData,
          jobDescription,
          documentType
        })
      });

      if (response.ok) {
        const atsAnalysis = await response.json();
        setState(prev => ({ ...prev, atsAnalysis }));
      }
    } catch (error) {
      console.error('❌ ATS analysis failed:', error);
    }
  };

  // UI Actions
  const toggleLeftPanel = useCallback(() => {
    setState(prev => ({ ...prev, leftPanelVisible: !prev.leftPanelVisible }));
  }, []);

  const toggleRightPanel = useCallback(() => {
    setState(prev => ({ ...prev, rightPanelVisible: !prev.rightPanelVisible }));
  }, []);

  const setActiveLeftTab = useCallback((tab: 'structure' | 'design' | 'ats') => {
    setState(prev => ({ ...prev, activeLeftTab: tab }));
  }, []);

  const switchTemplate = useCallback((templateId: string) => {
    setState(prev => ({ ...prev, selectedTemplateId: templateId, isDocumentModified: true }));
  }, []);

  // Navigation Actions
  const exitStudio = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const navigateToJourney = useCallback(() => {
    if (state.sessionContext.mode === 'journey' && state.sessionContext.journeyId) {
      router.push(`/dashboard/application-journeys/${state.sessionContext.journeyId}`);
    }
  }, [state.sessionContext, router]);

  // Actions object
  const actions: StudioActions = {
    initializeSession,
    updateDocument,
    saveDocument,
    switchTemplate,
    selectJob,
    runATSAnalysis,
    toggleLeftPanel,
    toggleRightPanel,
    setActiveLeftTab,
    exitStudio,
    navigateToJourney
  };

  return { state, actions };
}

// Helper Functions

async function createJourneyCV(journey: ApplicationJourneyData, job: JobData, userId: string): Promise<{ newCV: CVData; newDocumentData: CVDataStructure }> {
  // Create CV tailored for this journey
  const cvData = {
    title: `CV for ${job.jobTitle} at ${job.company}`,
    cvData: {} as CVDataStructure, // Empty initial structure
    templateId: 'default-template-id' // Get from templates API
  };

  const response = await fetch('/api/cvs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cvData)
  });

  if (!response.ok) throw new Error('Failed to create journey CV');
  
  const result = await response.json();
  return {
    newCV: result.cv,
    newDocumentData: result.cv.cvData
  };
}

async function createJourneyCoverLetter(journey: ApplicationJourneyData, job: JobData, userId: string): Promise<{ newCoverLetter: CoverLetterData; newContent: string }> {
  const coverLetterData = {
    title: `Cover Letter for ${job.jobTitle} at ${job.company}`,
    content: `Dear Hiring Manager,\n\nI am writing to express my interest in the ${job.jobTitle} position at ${job.company}.\n\nSincerely,\n[Your Name]`
  };

  const response = await fetch('/api/cover-letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coverLetterData)
  });

  if (!response.ok) throw new Error('Failed to create journey cover letter');
  
  const result = await response.json();
  return {
    newCoverLetter: result.coverLetter,
    newContent: result.coverLetter.content
  };
}

async function createStandaloneCV(userId: string): Promise<{ newCV: CVData; newDocumentData: CVDataStructure }> {
  const cvData = {
    title: 'Untitled CV',
    cvData: {} as CVDataStructure,
    templateId: 'default-template-id'
  };

  const response = await fetch('/api/cvs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cvData)
  });

  if (!response.ok) throw new Error('Failed to create standalone CV');
  
  const result = await response.json();
  return {
    newCV: result.cv,
    newDocumentData: result.cv.cvData
  };
}

async function createStandaloneCoverLetter(userId: string): Promise<{ newCoverLetter: CoverLetterData; newContent: string }> {
  const coverLetterData = {
    title: 'Untitled Cover Letter',
    content: 'Dear Hiring Manager,\n\n\n\nSincerely,\n[Your Name]'
  };

  const response = await fetch('/api/cover-letters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coverLetterData)
  });

  if (!response.ok) throw new Error('Failed to create standalone cover letter');
  
  const result = await response.json();
  return {
    newCoverLetter: result.coverLetter,
    newContent: result.coverLetter.content
  };
}

async function updateApplicationJourneyDocument(journeyId: string, documentType: DocumentType, documentId: string) {
  const field = documentType === 'cv' ? 'cvId' : 'coverLetterId';
  
  const response = await fetch(`/api/application-journeys/${journeyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      [field]: documentId
    })
  });

  if (!response.ok) {
    throw new Error('Failed to update application journey');
  }
}
