'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import Step1Template from './steps/Step1Template';
import Step2Edit from './steps/Step2Edit';
import Step3Preview from './steps/Step3Preview';
import { CoverLetterTemplate } from '@/lib/templates/cover-letter-templates';
import { COVER_LETTER_TEMPLATES } from '@/lib/templates/cover-letter-templates';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { extractHeaderFromContent, extractBodyFromContent } from '@/lib/utils/coverLetterUtils';

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
  const { state, dispatch, goToStep, nextStep, prevStep, setCVData, setJobData, loadCoverLetter, autoPopulateHeader } = useCoverLetterEditor();
  const [isLoading, setIsLoading] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const initializedRef = useRef(false);

  // Initialize based on mode
  useEffect(() => {
    if (initializedRef.current) return;
    
    const initializeEditor = async () => {
      setIsLoading(true);
      
      try {
        // Set mode
        dispatch({ type: 'SET_MODE', payload: mode });
        
        // Load CV data if cvId provided
        let loadedCVData: UnifiedCVDataStructure | null = null;
        if (cvId) {
          try {
            const cvResponse = await fetch(`/api/cvs/${cvId}`);
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
        
        // Load job data if jobId provided
        if (jobId) {
          try {
            const jobResponse = await fetch(`/api/jobs/${jobId}`);
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
            const clResponse = await fetch(`/api/cover-letters/${coverLetterId}`);
            if (clResponse.ok) {
              const clResult = await clResponse.json();
              const coverLetter = clResult.data?.coverLetter || clResult.coverLetter;
              
              if (coverLetter) {
                // Extract header and body if not present
                let header = coverLetter.header;
                let body = coverLetter.body;
                
                if (!header || !body) {
                  header = header || extractHeaderFromContent(coverLetter.content || '');
                  body = body || extractBodyFromContent(coverLetter.content || '');
                }
                
                // Find template if templateId exists
                let template: CoverLetterTemplate | null = null;
                if (coverLetter.templateId || coverLetter.metadata?.templateId) {
                  const templateId = coverLetter.templateId || coverLetter.metadata?.templateId;
                  template = COVER_LETTER_TEMPLATES.find(t => t.id === templateId) || null;
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
                  cvData: state.cvData || undefined,
                  jobData: state.jobData || undefined,
                  journeyId: journeyId || coverLetter.journeyId
                });
                
                setCompletedSteps([1, 2]); // Assume template and edit steps completed
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
                
                let template: CoverLetterTemplate | null = null;
                if (existingCL.templateId || existingCL.metadata?.templateId) {
                  const templateId = existingCL.templateId || existingCL.metadata?.templateId;
                  template = COVER_LETTER_TEMPLATES.find(t => t.id === templateId) || null;
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
                  template,
                  cvData: state.cvData || undefined,
                  jobData: state.jobData || undefined,
                  journeyId: journeyId
                });
                
                setCompletedSteps([1, 2]);
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
      return state.selectedTemplate !== null;
    }
    if (state.currentStep === 2) {
      return state.coverLetterData.content.trim().length > 0;
    }
    return true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)] mx-auto mb-4"></div>
          <p className="text-[color:var(--text-secondary)]">Loading cover letter editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[color:var(--text-primary)]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[var(--bg-primary)] border-b border-[color:var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleExit}
              className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-[color:var(--text-primary)]">
                Cover Letter Editor
              </h1>
              <p className="text-sm text-[color:var(--text-secondary)]">
                {state.coverLetterTitle}
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => {
              const isActive = state.currentStep === step;
              const isCompleted = completedSteps.includes(step);
              
              return (
                <React.Fragment key={step}>
                  <div
                    className={`
                      w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                      ${isCompleted ? 'bg-[#80FF00] text-black' : ''}
                      ${isActive && !isCompleted ? 'bg-[var(--bg-tertiary)] text-[color:var(--text-primary)]' : ''}
                      ${!isActive && !isCompleted ? 'bg-[var(--bg-tertiary)] text-[color:var(--text-tertiary)]' : ''}
                    `}
                  >
                    {isCompleted ? '✓' : step}
                  </div>
                  {step < 3 && (
                    <div className={`w-8 h-[2px] ${isCompleted ? 'bg-[#80FF00]' : 'bg-[var(--bg-tertiary)]'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 h-[calc(100vh-80px)]">
        {state.currentStep === 1 && <Step1Template />}
        {state.currentStep === 2 && <Step2Edit />}
        {state.currentStep === 3 && <Step3Preview userId={userId} />}
      </div>

      {/* Navigation Footer */}
      <div className="sticky bottom-0 z-10 bg-[var(--bg-primary)] border-t border-[color:var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={prevStep}
            disabled={state.currentStep === 1}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              state.currentStep === 1
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)]'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="text-sm text-[color:var(--text-secondary)]">
            Step {state.currentStep} of 3
          </div>

          <button
            onClick={handleStepComplete}
            disabled={!canGoToNextStep() || state.currentStep === 3}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
              !canGoToNextStep() || state.currentStep === 3
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black'
            }`}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

