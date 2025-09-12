'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';

export type JourneyStatus = 'onboarding' | 'job-added' | 'cv-created' | 'ats-checked' | 'cover-letter-created' | 'completed';

export interface JourneyStep {
  id: number;
  name: string;
  status: 'pending' | 'active' | 'completed';
  description: string;
}

export interface JobJourneyState {
  isJourneyActive: boolean;
  currentJobId: string | null;
  journeyStatus: JourneyStatus;
  currentStep: number;
  steps: JourneyStep[];
  jobTitle: string | null;
  company: string | null;
  atsScore: number | null;
  cvId: string | null;
  cvName: string | null;
  coverLetterId: string | null;
}

interface JobJourneyContextType {
  state: JobJourneyState;
  startJourney: (jobId: string) => void;
  endJourney: () => void;
  updateJourneyStatus: (status: JourneyStatus) => void;
  updateCurrentStep: (step: number) => void;
  updateJobInfo: (jobTitle: string, company: string) => void;
  updateCurrentJobId: (jobId: string) => void;
  updateAtsScore: (score: number) => void;
  updateCVId: (cvId: string) => void;
  updateCVName: (cvName: string) => void;
  updateCoverLetterId: (coverLetterId: string) => void;
  resetJourney: () => void;
}

const defaultSteps: JourneyStep[] = [
  {
    id: 1,
    name: 'Add Job',
    status: 'pending',
    description: 'Add a job to your tracker'
  },
  {
    id: 2,
    name: 'Create CV',
    status: 'pending',
    description: 'Create or select a CV for this job'
  },
  {
    id: 3,
    name: 'ATS Score',
    status: 'pending',
    description: 'Check and improve your ATS score'
  },
  {
    id: 4,
    name: 'Cover Letter',
    status: 'pending',
    description: 'Create a cover letter'
  },
  {
    id: 5,
    name: 'Download',
    status: 'pending',
    description: 'Download your application files'
  }
];

const initialState: JobJourneyState = {
  isJourneyActive: false,
  currentJobId: null,
  journeyStatus: 'onboarding',
  currentStep: 1,
  steps: defaultSteps,
  jobTitle: null,
  company: null,
  atsScore: null,
  cvId: null,
  cvName: null,
  coverLetterId: null,
};

const JobJourneyContext = createContext<JobJourneyContextType | undefined>(undefined);

export const useJobJourney = () => {
  const context = useContext(JobJourneyContext);
  if (context === undefined) {
    throw new Error('useJobJourney must be used within a JobJourneyProvider');
  }
  return context;
};

interface JobJourneyProviderProps {
  children: ReactNode;
}

export const JobJourneyProvider: React.FC<JobJourneyProviderProps> = ({ children }) => {
  const [state, setState] = useState<JobJourneyState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load journey state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('jobJourneyState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        console.log('🔍 JobJourneyContext - Restored state from localStorage:', parsedState);
        setState(parsedState);
      } catch (error) {
        console.error('Error parsing saved journey state:', error);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save journey state to localStorage whenever it changes (only after initialization)
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('jobJourneyState', JSON.stringify(state));
      console.log('🔍 JobJourneyContext - Saved state to localStorage:', state);
    }
  }, [state, isInitialized]);

  const startJourney = useCallback((jobId: string) => {
    console.log('🔍 JobJourneyContext - startJourney called with jobId:', jobId);
    setState(prev => {
      const newState = {
        ...prev,
        isJourneyActive: true,
        currentJobId: jobId,
        journeyStatus: 'job-added',
        currentStep: 1,
        atsScore: null, // Reset ATS score for new journey
        cvId: null, // Reset CV ID for new journey
        cvName: null, // Reset CV name for new journey
        coverLetterId: null, // Reset cover letter ID for new journey
        steps: defaultSteps.map((step, index) => ({
          ...step,
          status: index === 0 ? 'active' : 'pending'
        }))
      };
      console.log('🔍 JobJourneyContext - New state:', newState);
      return newState;
    });
  }, []);

  const endJourney = useCallback(() => {
    setState(prev => ({
      ...prev,
      isJourneyActive: false,
      currentJobId: null,
      journeyStatus: 'completed',
      currentStep: 5,
      steps: prev.steps.map(step => ({
        ...step,
        status: 'completed'
      }))
    }));
  }, []);

  const updateJourneyStatus = useCallback((status: JourneyStatus) => {
    setState(prev => {
      const newSteps = [...prev.steps];
      const statusToStepMap: Record<JourneyStatus, number> = {
        'onboarding': 1,
        'job-added': 2,
        'cv-created': 3,
        'ats-checked': 4,
        'cover-letter-created': 5,
        'completed': 5
      };

      const newStep = statusToStepMap[status];
      
      // Update step statuses
      newSteps.forEach((step, index) => {
        if (index + 1 < newStep) {
          step.status = 'completed';
        } else if (index + 1 === newStep) {
          step.status = 'active';
        } else {
          step.status = 'pending';
        }
      });

      return {
        ...prev,
        journeyStatus: status,
        currentStep: newStep,
        steps: newSteps
      };
    });
  }, []);

  const updateCurrentStep = useCallback((step: number) => {
    setState(prev => {
      const newSteps = [...prev.steps];
      newSteps.forEach((s, index) => {
        if (index + 1 < step) {
          s.status = 'completed';
        } else if (index + 1 === step) {
          s.status = 'active';
        } else {
          s.status = 'pending';
        }
      });

      return {
        ...prev,
        currentStep: step,
        steps: newSteps
      };
    });
  }, []);

  const updateJobInfo = useCallback((jobTitle: string, company: string) => {
    setState(prev => ({
      ...prev,
      jobTitle,
      company
    }));
  }, []);

  const updateCurrentJobId = useCallback((jobId: string) => {
    console.log('🔍 JobJourneyContext - updateCurrentJobId called:', jobId);
    setState(prev => ({
      ...prev,
      currentJobId: jobId,
      isJourneyActive: true
    }));
  }, []);

  const updateAtsScore = useCallback((score: number) => {
    setState(prev => ({
      ...prev,
      atsScore: score
    }));
  }, []);

  const updateCVId = useCallback((cvId: string) => {
    setState(prev => ({
      ...prev,
      cvId
    }));
  }, []);

  const updateCVName = useCallback((cvName: string) => {
    setState(prev => ({
      ...prev,
      cvName
    }));
  }, []);

  const updateCoverLetterId = useCallback((coverLetterId: string) => {
    setState(prev => ({
      ...prev,
      coverLetterId
    }));
  }, []);

  const resetJourney = useCallback(() => {
    setState(initialState);
    localStorage.removeItem('jobJourneyState');
  }, []);

  const contextValue: JobJourneyContextType = useMemo(() => ({
    state,
    startJourney,
    endJourney,
    updateJourneyStatus,
    updateCurrentStep,
    updateJobInfo,
    updateCurrentJobId,
    updateAtsScore,
    updateCVId,
    updateCVName,
    updateCoverLetterId,
    resetJourney,
  }), [
    state,
    startJourney,
    endJourney,
    updateJourneyStatus,
    updateCurrentStep,
    updateJobInfo,
    updateCurrentJobId,
    updateAtsScore,
    updateCVId,
    updateCVName,
    updateCoverLetterId,
    resetJourney,
  ]);

  return (
    <JobJourneyContext.Provider value={contextValue}>
      {children}
    </JobJourneyContext.Provider>
  );
};
