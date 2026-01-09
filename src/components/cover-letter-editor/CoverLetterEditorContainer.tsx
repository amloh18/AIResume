'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight, FileText, Save, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import Step1Edit from './steps/Step1Edit';
import Step2Review from './steps/Step2Review';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';
import { COVER_LETTER_TEMPLATES } from '@/lib/templates/cover-letter-templates';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { extractHeaderFromContent, extractBodyFromContent } from '@/lib/utils/coverLetterUtils';
import CoverLetterTemplateContent from '@/components/cover-letter-editor/CoverLetterTemplateContent';
import TemplateSidebar from '@/components/cover-letter-editor/TemplateSidebar';


interface CoverLetterEditorContainerProps {
  userId: string;
  mode?: 'create' | 'edit' | 'journey';
  coverLetterId?: string;
  cvId?: string;
  journeyId?: string;
  jobId?: string;
}

export default function CoverLetterEditorContainer({
  userId,
  mode = 'create',
  coverLetterId,
  cvId,
  journeyId,
  jobId
}: CoverLetterEditorContainerProps) {
  const router = useRouter();
  const { state, dispatch, goToStep, nextStep, prevStep, setCVData, setJobData, loadCoverLetter, autoPopulateHeader, setTemplate } = useCoverLetterEditor();
  const [isLoading, setIsLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const initializedRef = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const coverLetterData = {
        title: state.coverLetterTitle,
        content: '', // DO NOT send merged content - store header/body/footer separately
        header: state.coverLetterData.header,
        body: state.coverLetterData.body,
        footer: state.coverLetterData.footer,
        status: state.coverLetterData.status || 'draft',
        cvId: state.coverLetterData.cvId,
        jobId: state.coverLetterData.jobId,
        journeyId: state.coverLetterData.journeyId || state.journeyId,
        templateId: state.selectedTemplate?.id
      };

      let response;
      if (state.coverLetterId) {
        // Update existing cover letter
        response = await fetch(`/api/cover-letters/${state.coverLetterId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...coverLetterData
          })
        });
      } else {
        // Create new cover letter
        response = await fetch('/api/cover-letters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            ...coverLetterData
          })
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save cover letter');
      }

      const result = await response.json();
      const savedId = result.data?.id || result.data?.coverLetter?.id || result.id;

      if (savedId && !state.coverLetterId) {
        // Optionally update context step or ID here if needed
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);

    } catch (error) {
      console.error('Error saving:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Initialize based on mode
  useEffect(() => {
    if (initializedRef.current) return;

    const initializeEditor = async () => {
      setIsLoading(true);

      try {
        // Set mode
        dispatch({ type: 'SET_MODE', payload: mode });

        // If journey mode, fetch CV and job from journey
        let effectiveCvId = cvId;
        let effectiveJobId = jobId;

        if (mode === 'journey' && journeyId) {
          try {
            const journeyResponse = await fetch(`/api/application-journey/${journeyId}?userId=${userId}`);
            if (journeyResponse.ok) {
              const journeyResult = await journeyResponse.json();
              const journey = journeyResult.data?.journey || journeyResult.journey;
              if (journey) {
                // Use CV and job from journey if not provided directly
                if (journey.cvId && !effectiveCvId) {
                  effectiveCvId = journey.cvId.toString();
                }
                if (journey.jobId && !effectiveJobId) {
                  effectiveJobId = journey.jobId.toString();
                }
              }
            }
          } catch (error) {
            console.error('Failed to load journey:', error);
          }
        }

        // Load CV data if cvId provided (from direct prop or journey)
        let loadedCVData: UnifiedCVDataStructure | null = null;
        if (effectiveCvId) {
          try {
            const cvResponse = await fetch(`/api/cvs/${effectiveCvId}?userId=${userId}`);
            if (cvResponse.ok) {
              const cvResult = await cvResponse.json();
              const cv = cvResult.data?.cv || cvResult.cv;
              if (cv?.cvData) {
                loadedCVData = cv.cvData as UnifiedCVDataStructure;
                setCVData(loadedCVData);
              }
            }
          } catch (error) {
            console.error('Failed to load CV:', error);
          }
        }

        // Load job data if jobId provided (from direct prop or journey)
        if (effectiveJobId) {
          try {
            const jobResponse = await fetch(`/api/jobs/${effectiveJobId}?userId=${userId}`);
            if (jobResponse.ok) {
              const jobResult = await jobResponse.json();
              const job = jobResult.data?.job || jobResult.job;
              if (job) {
                setJobData(job);
              }
            }
          } catch (error) {
            console.error('Failed to load job:', error);
          }
        }

        // Load existing cover letter if editing
        if (mode === 'edit' && coverLetterId) {
          try {
            const clResponse = await fetch(`/api/cover-letters/${coverLetterId}?userId=${userId}`);
            if (clResponse.ok) {
              const clResult = await clResponse.json();
              const coverLetter = clResult.coverLetter || clResult.data?.coverLetter;

              if (coverLetter) {
                // Extract header and body if not present
                let header = coverLetter.header;
                let body = coverLetter.body;

                if (!header || !body) {
                  header = header || extractHeaderFromContent(coverLetter.content || '');
                  body = body || extractBodyFromContent(coverLetter.content || '');
                }

                // Find template if templateId exists
                let template: CoverLetterTemplate | undefined;
                if (coverLetter.templateId || coverLetter.metadata?.templateId) {
                  const templateId = coverLetter.templateId || coverLetter.metadata?.templateId;
                  template = COVER_LETTER_TEMPLATES.find(t => t.id === templateId);
                }

                // Load CV data if cvId exists in cover letter (or from journey if not set)
                let loadedCVDataForCL: UnifiedCVDataStructure | null = null;
                const cvIdToLoad = coverLetter.cvId || effectiveCvId;
                if (cvIdToLoad && !loadedCVData) {
                  try {
                    const cvResponse = await fetch(`/api/cvs/${cvIdToLoad}?userId=${userId}`);
                    if (cvResponse.ok) {
                      const cvResult = await cvResponse.json();
                      const cv = cvResult.data?.cv || cvResult.cv;
                      if (cv?.cvData) {
                        loadedCVDataForCL = cv.cvData as UnifiedCVDataStructure;
                        setCVData(loadedCVDataForCL);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to load CV for cover letter:', error);
                  }
                }

                // Load job data if jobId exists in cover letter (or from journey if not set)
                let loadedJobDataForCL: any = null;
                const jobIdToLoad = coverLetter.jobId || effectiveJobId;
                if (jobIdToLoad && !state.jobData) {
                  try {
                    const jobResponse = await fetch(`/api/jobs/${jobIdToLoad}?userId=${userId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      const job = jobResult.data?.job || jobResult.job;
                      if (job) {
                        loadedJobDataForCL = job;
                        setJobData(loadedJobDataForCL);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to load job for cover letter:', error);
                  }
                }

                loadCoverLetter({
                  coverLetterId: coverLetter.id || coverLetter._id,
                  coverLetterData: {
                    id: coverLetter.id || coverLetter._id,
                    title: coverLetter.title,
                    content: coverLetter.content || '',
                    header: header,
                    body: body,
                    status: coverLetter.status,
                    cvId: coverLetter.cvId,
                    jobId: coverLetter.jobId,
                    journeyId: coverLetter.journeyId,
                    templateId: coverLetter.templateId || coverLetter.metadata?.templateId
                  },
                  template,
                  cvData: loadedCVDataForCL || state.cvData || undefined,
                  jobData: loadedJobDataForCL || state.jobData || undefined,
                  journeyId: journeyId || coverLetter.journeyId
                });

                setCompletedSteps([1]); // Editor step completed
              }
            }
          } catch (error) {
            console.error('Failed to load cover letter:', error);
          }
        } else if (mode === 'journey' && journeyId) {
          // Journey mode - check if cover letter exists
          try {
            const clResponse = await fetch(`/api/cover-letters?userId=${userId}&journeyId=${journeyId}`);
            if (clResponse.ok) {
              const clResult = await clResponse.json();
              const coverLetters = clResult.data?.coverLetters || [];
              const existingCL = coverLetters.find((cl: any) => cl.journeyId === journeyId);

              if (existingCL) {
                // Load existing cover letter
                let header = existingCL.header;
                let body = existingCL.body;

                if (!header || !body) {
                  header = header || extractHeaderFromContent(existingCL.content || '');
                  body = body || extractBodyFromContent(existingCL.content || '');
                }

                let template: CoverLetterTemplate | undefined | null = null;
                if (existingCL.templateId || existingCL.metadata?.templateId) {
                  const templateId = existingCL.templateId || existingCL.metadata?.templateId;
                  template = COVER_LETTER_TEMPLATES.find(t => t.id === templateId) || undefined;
                }

                // Load CV data if cvId exists (prefer journey's CV if available)
                let loadedCVDataForJourney: UnifiedCVDataStructure | null = null;
                const cvIdToLoadForJourney = effectiveCvId || existingCL.cvId;
                if (cvIdToLoadForJourney && !loadedCVData) {
                  try {
                    const cvResponse = await fetch(`/api/cvs/${cvIdToLoadForJourney}?userId=${userId}`);
                    if (cvResponse.ok) {
                      const cvResult = await cvResponse.json();
                      const cv = cvResult.data?.cv || cvResult.cv;
                      if (cv?.cvData) {
                        loadedCVDataForJourney = cv.cvData as UnifiedCVDataStructure;
                        setCVData(loadedCVDataForJourney);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to load CV for journey cover letter:', error);
                  }
                }

                // Load job data if jobId exists (prefer journey's job if available)
                let loadedJobDataForJourney: any = null;
                const jobIdToLoadForJourney = effectiveJobId || existingCL.jobId;
                if (jobIdToLoadForJourney && !state.jobData) {
                  try {
                    const jobResponse = await fetch(`/api/jobs/${jobIdToLoadForJourney}?userId=${userId}`);
                    if (jobResponse.ok) {
                      const jobResult = await jobResponse.json();
                      const job = jobResult.data?.job || jobResult.job;
                      if (job) {
                        loadedJobDataForJourney = job;
                        setJobData(loadedJobDataForJourney);
                      }
                    }
                  } catch (error) {
                    console.error('Failed to load job for journey cover letter:', error);
                  }
                }

                loadCoverLetter({
                  coverLetterId: existingCL.id || existingCL._id,
                  coverLetterData: {
                    id: existingCL.id || existingCL._id,
                    title: existingCL.title,
                    content: existingCL.content || '',
                    header: header,
                    body: body,
                    status: existingCL.status,
                    cvId: existingCL.cvId,
                    jobId: existingCL.jobId,
                    journeyId: existingCL.journeyId,
                    templateId: existingCL.templateId || existingCL.metadata?.templateId
                  },
                  template: template || undefined,
                  cvData: loadedCVDataForJourney || state.cvData || undefined,
                  jobData: loadedJobDataForJourney || state.jobData || undefined,
                  journeyId: journeyId
                });

                setCompletedSteps([1]);
              } else {
                // Create new cover letter for journey
                dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
                dispatch({ type: 'SET_COVER_LETTER_TITLE', payload: `Cover Letter - ${new Date().toLocaleDateString()}` });

                // Auto-populate header if CV data available
                if (loadedCVData) {
                  setCVData(loadedCVData);
                  // Auto-populate will happen in Step2Edit when CV data is set
                }
              }
            }
          } catch (error) {
            console.error('Failed to check for existing cover letter:', error);
          }
        } else {
          // Create mode - set title
          dispatch({ type: 'SET_COVER_LETTER_TITLE', payload: 'Untitled Cover Letter' });
          // Auto-populate will happen in Step2Edit when CV data is set
        }

        // Set journey ID if provided
        if (journeyId) {
          dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
        }

        // Set CV and job IDs in cover letter data
        if (cvId) {
          dispatch({ type: 'UPDATE_COVER_LETTER_DATA', payload: { cvId } });
        }
        if (jobId) {
          dispatch({ type: 'UPDATE_COVER_LETTER_DATA', payload: { jobId } });
        }
        if (journeyId) {
          dispatch({ type: 'UPDATE_COVER_LETTER_DATA', payload: { journeyId } });
        }

        initializedRef.current = true;
      } catch (error) {
        console.error('Failed to initialize editor:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEditor();
  }, [mode, coverLetterId, cvId, journeyId, jobId, userId]);

  const handleExit = () => {
    if (confirm('Are you sure you want to exit? Unsaved changes will be lost.')) {
      if (state.journeyId) {
        router.push(`/dashboard/tracker?journeyId=${state.journeyId}`);
      } else {
        router.push('/dashboard/canvas');
      }
    }
  };

  const handleStepComplete = () => {
    if (!completedSteps.includes(state.currentStep)) {
      setCompletedSteps([...completedSteps, state.currentStep]);
    }
    nextStep();
  };

  const canGoToNextStep = () => {
    if (state.currentStep === 1) {
      return state.coverLetterData.content.trim().length > 0;
    }
    return true;
  };

  const handleTemplateSelect = (template: CoverLetterTemplate) => {
    setTemplate(template);
    setShowTemplateModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-[#1a230f]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-500 dark:border-[#99FF00] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-200">Loading cover letter editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page cover-letter-editor-page h-screen flex flex-col bg-gray-50 dark:bg-[#1a230f] text-gray-900 dark:text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-[#141810] border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="p-2 hover:bg-gray-100 dark:hover:bg-[#313a28] rounded-lg transition-colors text-gray-700 dark:text-gray-200"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Cover Letter Editor
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                {state.coverLetterTitle}
              </p>
            </div>
          </div>

          {/* Center Actions: Save & Review */}
          <div className="flex items-center gap-3 mx-4">
            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${saveStatus === 'success'
                ? 'bg-green-500 text-white'
                : saveStatus === 'error'
                  ? 'bg-red-500 text-white'
                  : 'bg-lime-500 dark:bg-[#99FF00] hover:bg-lime-600 dark:hover:bg-[#88e600] text-black'
                }`}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saveStatus === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : saveStatus === 'error' ? (
                <XCircle className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : saveStatus === 'success' ? 'Saved' : saveStatus === 'error' ? 'Error' : 'Save'}
            </button>

            {/* Review Button (Moved from Right) */}
            {state.currentStep === 1 && (
              <button
                onClick={handleStepComplete}
                disabled={!canGoToNextStep()}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${!canGoToNextStep()
                  ? 'opacity-50 cursor-not-allowed bg-gray-200 dark:bg-gray-800 text-gray-500'
                  : 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-900 dark:bg-[#1a1a1a] dark:border-gray-700 dark:text-white dark:hover:bg-[#252525]'
                  }`}
              >
                Review
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Right Actions: Template & Nav */}
          <div className="flex items-center gap-4">
            {/* Template Button */}
            {state.currentStep === 1 && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-3 py-2 bg-gray-100 dark:bg-[#313a28] hover:bg-gray-200 dark:hover:bg-[#3a4530] text-gray-900 dark:text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FileText className="w-4 h-4" />
                {state.selectedTemplate ? state.selectedTemplate.name : 'Choose Template'}
              </button>
            )}

            {/* Previous Button (Only for Step 2) */}
            {state.currentStep === 2 && (
              <button
                onClick={prevStep}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-gray-100 dark:bg-[#313a28] hover:bg-gray-200 dark:hover:bg-[#3a4530] text-gray-900 dark:text-white"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full max-w-7xl mx-auto px-6 py-6">
          {state.currentStep === 1 && <Step1Edit />}
          {state.currentStep === 2 && <Step2Review userId={userId} />}
        </div>
      </div>

      {/* Template Sidebar */}
      <TemplateSidebar
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        selectedTemplate={state.selectedTemplate}
        onTemplateSelect={handleTemplateSelect}
      />

    </div>
  );
}

