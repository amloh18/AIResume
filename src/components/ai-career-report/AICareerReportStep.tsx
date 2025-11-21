'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  TrendingUp, 
  Lightbulb, 
  FileText, 
  ArrowRight, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Sparkles,
  X,
  Eye
} from 'lucide-react';
import { useAICareerReport } from '@/contexts/AICareerReportContext';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import CVPreviewModal from './CVPreviewModal';
import SignInModal from './SignInModal';
import CareerTrajectoryGraph from '@/components/career-report/CareerTrajectoryGraph';

interface AICareerReportStepProps {
  onComplete: () => void;
  onBack: () => void;
  session?: any;
}

export default function AICareerReportStep({ onComplete, onBack, session: propSession }: AICareerReportStepProps) {
  const { state, dispatch } = useAICareerReport();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Use prop session if provided, otherwise use hook session
  const currentSession = propSession || session;
  const authStatus = propSession ? 'authenticated' : sessionStatus;
  
  // Flow Detection: Check if this is Flow 3 (Master CV Edit)
  const editMaster = searchParams?.get('editMaster') === 'true';
  const masterCVId = searchParams?.get('masterCVId') || (typeof window !== 'undefined' ? sessionStorage.getItem('masterCVId') : null);
  const isEditingMasterCV = editMaster && masterCVId;

  // Wait for authentication to complete before initializing data
  useEffect(() => {
    // Only proceed if auth status is determined (not loading)
    if (authStatus === 'loading') {
      console.log('⏳ Step 3: Waiting for authentication to complete...');
      return;
    }

    // Auth is ready (authenticated or unauthenticated)
    console.log('✅ Step 3: Authentication ready, initializing data from memory...', {
      authStatus,
      hasSession: !!currentSession?.user,
      hasAiAnalysis: !!state.aiAnalysis,
      hasCvData: !!(state.cvData?.work?.length || state.cvData?.education?.length)
    });

    // Load data from localStorage if available (only once)
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedData = localStorage.getItem('ai-career-report-data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);
          console.log('📦 Step 3: Loading saved data from localStorage:', {
            hasCvData: !!parsed.cvData,
            hasAiAnalysis: !!parsed.aiAnalysis,
            currentStep: parsed.currentStep,
            workCount: parsed.cvData?.work?.length || 0,
            educationCount: parsed.cvData?.education?.length || 0
          });

          // Restore CV data if available and state is empty
          if (parsed.cvData && (!state.cvData?.work?.length && !state.cvData?.education?.length)) {
            console.log('📥 Step 3: Restoring CV data from localStorage');
            dispatch({ type: 'SET_CV_DATA', payload: parsed.cvData });
          }

          // Restore AI analysis if available
          if (parsed.aiAnalysis && !state.aiAnalysis) {
            console.log('📊 Step 3: Restoring AI analysis from localStorage');
            dispatch({ type: 'SET_AI_ANALYSIS', payload: parsed.aiAnalysis });
          }
        } catch (e) {
          console.warn('⚠️ Step 3: Failed to parse saved data:', e);
        }
      }
      setIsInitialized(true);
    }
  }, [authStatus, currentSession, isInitialized, state.cvData, state.aiAnalysis, dispatch]);

  // Generate AI analysis after auth is ready, data is initialized, AND we have CV data
  useEffect(() => {
    // Verify we have meaningful CV data before attempting analysis
    const hasMeaningfulCvData = !!(
      state.cvData && (
        state.cvData.work?.length > 0 || 
        state.cvData.education?.length > 0 || 
        state.cvData.projects?.length > 0 ||
        state.cvData.basics?.name
      )
    );

    console.log('🔍 Step 3: AI Analysis check:', {
      authStatus,
      isInitialized,
      hasAiAnalysis: !!state.aiAnalysis,
      isGenerating,
      hasMeaningfulCvData,
      workCount: state.cvData?.work?.length || 0,
      educationCount: state.cvData?.education?.length || 0
    });

    if (authStatus !== 'loading' && isInitialized && !state.aiAnalysis && !isGenerating && hasMeaningfulCvData) {
      console.log('🚀 Step 3: Starting AI analysis with CV data');
      generateAIAnalysis();
    } else if (authStatus !== 'loading' && isInitialized && !state.aiAnalysis && !isGenerating && !hasMeaningfulCvData) {
      console.warn('⚠️ Step 3: Cannot generate AI analysis - no meaningful CV data found');
      // Still show the UI with a fallback or error message
    }
  }, [authStatus, isInitialized, state.aiAnalysis, isGenerating, state.cvData]);

  // Removed: autoSaveAttempted ref - no longer needed since auto-save is disabled

  const generateAIAnalysis = async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    setIsGenerating(true);
    setError(null);

    try {
      // Validate CV data before making API call
      const hasMeaningfulData = !!(
        state.cvData && (
          state.cvData.work?.length > 0 || 
          state.cvData.education?.length > 0 || 
          state.cvData.projects?.length > 0 ||
          state.cvData.basics?.name
        )
      );

      if (!hasMeaningfulData) {
        console.error('❌ Cannot generate AI analysis: No meaningful CV data');
        setError('No CV data found. Please go back and complete your CV information.');
        setIsGenerating(false);
        return;
      }

      console.log('🚀 Starting AI analysis...', isRetry ? `(Retry ${retryCount + 1})` : '');
      console.log('📊 CV Data:', {
        hasBasics: !!state.cvData.basics,
        name: state.cvData.basics?.name,
        workCount: state.cvData.work?.length || 0,
        educationCount: state.cvData.education?.length || 0,
        projectsCount: state.cvData.projects?.length || 0
      });
      console.log('💼 Job Data:', state.jobData);

      // Ensure cvData is properly structured for API
      const cvDataPayload = {
        ...state.cvData,
        basics: state.cvData.basics || {},
        work: state.cvData.work || [],
        education: state.cvData.education || [],
        projects: state.cvData.projects || [],
        skills: state.cvData.skills || [],
        volunteer: state.cvData.volunteer || [],
        awards: state.cvData.awards || [],
        certificates: state.cvData.certificates || [],
        publications: state.cvData.publications || [],
        languages: state.cvData.languages || [],
        interests: state.cvData.interests || [],
        references: state.cvData.references || []
      };
      
      console.log('📤 Sending payload to API:', {
        cvDataSize: JSON.stringify(cvDataPayload).length,
        hasJobData: !!state.jobData,
        jobId: state.jobId
      });
      
      const response = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          cvData: cvDataPayload,
          jobData: state.jobData || null,
          jobId: state.jobId || null
        })
      });

      console.log('📡 AI Analysis response status:', response.status, response.statusText);
      
      let result;
      if (!response.ok) {
        // Try to parse error response
        try {
          const errorText = await response.text();
          console.error('❌ AI Analysis failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText: errorText.substring(0, 500) // Log first 500 chars
          });
          
          try {
            const errorData = JSON.parse(errorText);
            console.error('❌ Error details:', errorData);
            
            // If it's a 400 error about missing CV data, show specific error
            if (response.status === 400 && errorData.error) {
              if (errorData.error.includes('CV data')) {
                setError('Invalid CV data. Please go back and complete your CV information.');
              } else if (errorData.error.includes('JSON')) {
                setError('Failed to process CV data. Please try again.');
              } else {
                setError(`AI Analysis failed: ${errorData.error}`);
              }
              setIsGenerating(false);
              return;
            }
            
            result = errorData;
          } catch {
            // If parsing fails, show error with status
            setError(`AI Analysis failed: ${response.status} ${response.statusText}`);
            setIsGenerating(false);
            return;
          }
        } catch {
          setError('AI Analysis failed. Please try again.');
          setIsGenerating(false);
          return;
        }
      } else {
        result = await response.json();
      }

      console.log('📥 AI Analysis result:', result);

      if (result.success && result.analysis) {
        dispatch({ type: 'SET_AI_ANALYSIS', payload: result.analysis });
        dispatch({ type: 'SET_COMPLETED_STEP', payload: 3 });
        setRetryCount(0); // Reset retry count on success
      } else {
        // Use fallback analysis if AI fails or returns no analysis
        console.log('🔄 Using fallback analysis');
        const fallbackAnalysis = {
          experienceLevel: {
            level: 'Mid-Level',
            rationale: 'Based on your experience, you appear to be at a mid-level position with room for growth.'
          },
          careerPath: {
            step1: { title: 'Enhance Technical Skills', reasoning: 'Focus on deepening your technical expertise in your current domain.' },
            step2: { title: 'Take on Leadership Roles', reasoning: 'Seek opportunities to lead projects or mentor junior team members.' },
            step3: { title: 'Build Industry Network', reasoning: 'Connect with professionals in your field to open new opportunities.' }
          },
          strategicSuggestions: {
            hardSkill: { skill: 'Advanced Technical Skills', rationale: 'Consider learning advanced technologies relevant to your field.' },
            softSkill: { skill: 'Communication', rationale: 'Strong communication skills are essential for career advancement.' },
            experienceReframe: {
              original: 'Worked on projects',
              improved: 'Led and delivered projects that resulted in measurable business impact',
              rationale: 'Reframe experiences to highlight leadership and impact.'
            }
          }
        };
        dispatch({ type: 'SET_AI_ANALYSIS', payload: fallbackAnalysis });
        dispatch({ type: 'SET_COMPLETED_STEP', payload: 3 });
        setRetryCount(0);
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Use fallback analysis instead of showing error
      console.log('🔄 Using fallback analysis due to error');
      const fallbackAnalysis = {
        experienceLevel: {
          level: 'Mid-Level',
          rationale: 'Based on your experience, you appear to be at a mid-level position with room for growth.'
        },
        careerPath: {
          step1: { title: 'Enhance Technical Skills', reasoning: 'Focus on deepening your technical expertise in your current domain.' },
          step2: { title: 'Take on Leadership Roles', reasoning: 'Seek opportunities to lead projects or mentor junior team members.' },
          step3: { title: 'Build Industry Network', reasoning: 'Connect with professionals in your field to open new opportunities.' }
        },
        strategicSuggestions: {
          hardSkill: { skill: 'Advanced Technical Skills', rationale: 'Consider learning advanced technologies relevant to your field.' },
          softSkill: { skill: 'Communication', rationale: 'Strong communication skills are essential for career advancement.' },
          experienceReframe: {
            original: 'Worked on projects',
            improved: 'Led and delivered projects that resulted in measurable business impact',
            rationale: 'Reframe experiences to highlight leadership and impact.'
          }
        }
      };
      dispatch({ type: 'SET_AI_ANALYSIS', payload: fallbackAnalysis });
      dispatch({ type: 'SET_COMPLETED_STEP', payload: 3 });
      setRetryCount(0);
      // Don't set error - just use fallback silently
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMasterCV = useCallback(async () => {
    // CRITICAL SECURITY: Check if user is authenticated before saving
    // Verify both session object and auth status to prevent race conditions
    if (authStatus === 'loading') {
      setError('Please wait while we verify your authentication...');
      return;
    }

    if (authStatus !== 'authenticated' || !currentSession?.user?.id) {
      setError('Please sign in to save your Master CV');
      return;
    }

    try {
      console.log('🚀 Starting Master CV creation from database draft...');

      // First, ensure latest data is saved to database
      const saveResponse = await fetch('/api/cv-draft/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: state.cvData,
          aiAnalysis: state.aiAnalysis,
          currentStep: state.currentStep,
          jobId: state.jobId,
          jobData: state.jobData,
          completedSteps: state.completedSteps,
          activeSection: state.activeSection,
          availableSections: state.availableSections
        })
      });

      if (!saveResponse.ok) {
        console.warn('⚠️ Failed to save draft before creating Master CV, continuing anyway...');
      }

      // Convert draft to Master CV
      // Flow 3: Pass explicit masterCVId for guaranteed UPDATE operation
      const requestBody: any = {};
      if (isEditingMasterCV && masterCVId) {
        requestBody.masterCVId = masterCVId;
        console.log('🔄 Flow 3: Passing explicit masterCVId for update:', masterCVId);
      }
      
      const response = await fetch('/api/cv-draft/convert-to-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      console.log('📡 Master CV creation response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `Master CV creation failed: ${response.status} ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          console.error('❌ Master CV creation failed with details:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Master CV creation failed (text response):', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        setError(errorMessage);
        return;
      }

      const result = await response.json();
      console.log('📥 Master CV creation result:', result);

      if (result.success) {
        const actionVerb = isEditingMasterCV ? 'updated' : 'created';
        console.log(`✅ Master CV ${actionVerb} successfully:`, result.cv?.id);
        
        // Mark as created/updated
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('masterCVCreated', 'true');
          sessionStorage.setItem('fromAICareerReport', 'true');
          
          // Clear masterCVId from sessionStorage after successful update
          if (isEditingMasterCV) {
            sessionStorage.removeItem('masterCVId');
          }
          
          // Clear localStorage since data is now in database
          try {
            localStorage.removeItem('ai-career-report-data');
            sessionStorage.removeItem('ai-career-report-backup');
            console.log('✅ Cleared localStorage after saving Master CV');
          } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
          }
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('masterCVCreated'));
        }

        // CRITICAL SECURITY: Only trigger completion if user is still authenticated
        // Double-check authentication before redirecting to prevent security flaw
        if (authStatus === 'authenticated' && currentSession?.user?.id) {
          console.log('✅ Master CV saved, user authenticated, calling onComplete');
          onComplete();
        } else {
          console.warn('🚫 Security: User not authenticated after save, preventing dashboard redirect');
          setError('Please sign in to complete the process');
          // Don't call onComplete() - user should sign in first
        }
      } else {
        throw new Error(result.error || result.message || 'Failed to save Master CV');
      }

    } catch (error: any) {
      console.error('❌ Save Master CV error:', error);
      
      // CRITICAL: Never call onComplete() on error - this prevents unauthenticated redirects
      if (error.message) {
        setError(error.message);
      } else if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to server. Please check your internet connection and try again.');
      } else {
        setError('Failed to save Master CV. Please try again.');
      }
      // Do NOT call onComplete() on error - user should fix the error first
    }
  }, [currentSession, authStatus, state, onComplete]);

  // REMOVED: Auto-save Master CV when user becomes authenticated
  // Step 3 should only proceed when the user explicitly clicks the "Create Master CV" button
  // This prevents auto-skipping step 3 and opening the welcome modal prematurely
  // The user must manually click the Finish button to save and proceed

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            className="w-16 h-16 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-6"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <h2 className="text-2xl font-bold text-white mb-4">Analyzing Your Career</h2>
          <p className="text-white/80 mb-8">
            Our AI is analyzing your background to provide personalized career insights...
          </p>
          <div className="space-y-2 text-sm text-white/70">
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#80FF00] rounded-full animate-pulse"></div>
              <span>Analyzing experience level</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#80FF00] rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
              <span>Projecting career path</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-[#80FF00] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              <span>Generating strategic recommendations</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Analysis Failed</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => generateAIAnalysis(true)}
              className="w-full px-6 py-3 bg-[#80FF00] text-black font-medium rounded-lg hover:bg-[#70e600] transition-colors"
            >
              Try Again {retryCount > 0 && `(${retryCount})`}
            </button>
            <button
              onClick={onBack}
              className="w-full px-6 py-3 bg-[#333333] text-gray-900 rounded-lg hover:bg-[#444444] transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state.aiAnalysis) {
    // Check if we have CV data to analyze
    const hasMeaningfulData = !!(
      state.cvData && (
        state.cvData.work?.length > 0 || 
        state.cvData.education?.length > 0 || 
        state.cvData.projects?.length > 0 ||
        state.cvData.basics?.name
      )
    );

    // Don't show error if still initializing or auth is loading
    if (authStatus === 'loading' || !isInitialized) {
      return (
        <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="w-16 h-16 border-4 border-[#80FF00] border-t-transparent rounded-full animate-spin mx-auto mb-6"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <h2 className="text-2xl font-bold text-white mb-4">Loading Your Data</h2>
            <p className="text-white/70">Please wait while we prepare your career analysis...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          {hasMeaningfulData ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-4">Ready to Analyze Your Career</h2>
              <p className="text-white/70 mb-8">Click the button below to generate your AI-powered career analysis.</p>
              <button
                onClick={() => generateAIAnalysis(false)}
                className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors"
              >
                Generate Career Analysis
              </button>
            </>
          ) : (
            <>
              <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-white mb-4">No CV Data Found</h2>
              <p className="text-white/70 mb-8">
                We couldn't find your CV data. Please go back to Step 2 and complete your CV information.
              </p>
              <button
                onClick={onBack}
                className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors"
              >
                Go Back to Step 2
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const { 
    experienceLevel, 
    careerPath, 
    strategicSuggestions,
    impactScore,
    careerCoherence,
    cvOptimization,
    skillsGap,
    seniorTranslation,
    industrySpecialization
  } = state.aiAnalysis;

  // If not authenticated, show blurred content with sign-in modal
  if (!currentSession?.user) {
    return (
      <div className="relative">
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none min-h-[calc(100vh-5rem)] bg-[#1A201A]">
          <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Description Section */}
        <div className="text-center mb-12">
          <p className="text-gray-600 text-lg max-w-2xl mx-auto mb-6">
            Here's a summary of our AI-powered analysis. Use these insights to tailor your CV for your next career move.
          </p>
        </div>

            {/* Experience Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                  <Target className="w-5 h-5 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Experience Level</h2>
              </div>
              
              <p className="text-gray-600 mb-6">
                We've determined your current career standing based on your work history.
              </p>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-3xl font-bold text-[#80FF00] mb-4">{experienceLevel.level}</h3>
                <p className="text-gray-600 leading-relaxed">{experienceLevel.rationale}</p>
              </div>
            </motion.div>

            {/* Additional cards would go here but blurred */}
            <div className="space-y-6 opacity-50">
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Impact Score Analysis</h3>
                </div>
                <p className="text-gray-600 text-sm">Data-driven assessment of your CV's competitive strength...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Career Trajectory Analysis</h3>
                </div>
                <p className="text-gray-600 text-sm">Analysis of career progression and job duration patterns...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Eye className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">CV Reading Time Optimization</h3>
                </div>
                <p className="text-gray-600 text-sm">Ensure your most important information is easily digestible...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Skills Gap Analysis</h3>
                </div>
                <p className="text-gray-600 text-sm">Analysis of skill depth vs. frequency and focus areas...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Mid-Level to Senior Translation</h3>
                </div>
                <p className="text-gray-600 text-sm">Reframe your experience using senior-level language...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Target className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Industry Specialization Analysis</h3>
                </div>
                <p className="text-gray-600 text-sm">FinTech specialization and critical keywords to emphasize...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign-in modal overlay */}
        <SignInModal isOpen={true} onClose={() => {}} />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#1A201A]">
      <div className="max-w-6xl mx-auto p-8 space-y-8">

        {/* Step Information */}
        <div className="text-center mb-8">
          <div className="text-[#80FF00] font-bold text-lg mb-2">Step 3 of 3</div>
          <div className="text-2xl font-bold text-white mb-2">Your Career Report</div>
          <div className="text-white/70 text-lg mb-6">AI-powered analysis and career insights.</div>
        </div>

        {/* Description Section */}
        <div className="text-center mb-12">
        </div>

        {/* Experience Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Experience Level</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            We've determined your current career standing based on your work history.
          </p>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-3xl font-bold text-[#80FF00] mb-4">{experienceLevel.level}</h3>
            <p className="text-gray-600 leading-relaxed">{experienceLevel.rationale}</p>
          </div>
        </motion.div>

        {/* Quantifiable Achievement Analysis Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Impact Score Analysis</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Data-driven assessment of your CV's competitive strength based on quantifiable achievements and action-oriented language.
          </p>
          
          <div className="space-y-6">
            {/* Impact Metrics Table */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your CV Impact Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-gray-600">Metric</th>
                      <th className="text-left py-3 text-gray-600">Your Score</th>
                      <th className="text-left py-3 text-gray-600">Target</th>
                      <th className="text-left py-3 text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900/70">
                    <tr className="border-b border-white/5">
                      <td className="py-3">Quantifiable Statements</td>
                      <td className="py-3">{impactScore?.quantifiableStatements || 0}/15</td>
                      <td className="py-3">10+</td>
                      <td className={`py-3 ${(impactScore?.quantifiableStatements || 0) < 5 ? 'text-red-400' : (impactScore?.quantifiableStatements || 0) < 10 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {(impactScore?.quantifiableStatements || 0) < 5 ? 'Needs Work' : (impactScore?.quantifiableStatements || 0) < 10 ? 'Moderate' : 'Good'}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">High-Impact Verbs</td>
                      <td className="py-3">{impactScore?.highImpactVerbs || 0}/30</td>
                      <td className="py-3">25+</td>
                      <td className={`py-3 ${(impactScore?.highImpactVerbs || 0) < 10 ? 'text-red-400' : (impactScore?.highImpactVerbs || 0) < 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {(impactScore?.highImpactVerbs || 0) < 10 ? 'Needs Work' : (impactScore?.highImpactVerbs || 0) < 25 ? 'Moderate' : 'Good'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3">Industry Keywords</td>
                      <td className="py-3">{impactScore?.industryKeywords || 0}%</td>
                      <td className="py-3">90%+</td>
                      <td className={`py-3 ${(impactScore?.industryKeywords || 0) < 60 ? 'text-red-400' : (impactScore?.industryKeywords || 0) < 90 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {(impactScore?.industryKeywords || 0) < 60 ? 'Needs Work' : (impactScore?.industryKeywords || 0) < 90 ? 'Good' : 'Excellent'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
              {impactScore?.insights?.map((insight: any, index: number) => (
                <div key={index} className={`bg-gray-50 rounded-lg p-4 border ${
                  insight.type === 'Critical Gap' ? 'border-red-500/20' : 
                  insight.type === 'Improvement Needed' ? 'border-yellow-500/20' : 
                  'border-green-500/20'
                }`}>
                  <h4 className={`font-semibold mb-2 ${
                    insight.type === 'Critical Gap' ? 'text-red-400' : 
                    insight.type === 'Improvement Needed' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>
                    {insight.type === 'Critical Gap' ? '🚨 Critical Gap' : 
                     insight.type === 'Improvement Needed' ? '⚠️ Improvement Needed' : 
                     '✅ Strength'}
                  </h4>
                  <p className="text-gray-600 text-sm">{insight.message}</p>
                </div>
              )) || (
                <>
                  <div className="bg-gray-50 rounded-lg p-4 border border-red-200">
                    <h4 className="text-red-400 font-semibold mb-2">🚨 Critical Gap</h4>
                    <p className="text-gray-600 text-sm">Limited quantifiable achievements found in your CV.</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-yellow-200">
                    <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Improvement Needed</h4>
                    <p className="text-gray-600 text-sm">Need more action-oriented language and quantifiable results.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Career Trajectory Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <CareerTrajectoryGraph
            careerPath={careerPath}
            careerCoherence={careerCoherence}
            experienceLevel={experienceLevel?.level}
            forceLightTheme={true}
          />
        </motion.div>

        {/* CV Reading Time Optimization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Eye className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">CV Reading Time Optimization</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Recruiters spend an average of 6 seconds on initial CV scan. Ensure your most important information is easily digestible.
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your CV Structure Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-gray-600">Metric</th>
                      <th className="text-left py-3 text-gray-600">Your CV</th>
                      <th className="text-left py-3 text-gray-600">Recommended</th>
                      <th className="text-left py-3 text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900/70">
                    <tr className="border-b border-white/5">
                      <td className="py-3">Total Length</td>
                      <td className="py-3">{cvOptimization?.totalLength || '2 Pages'}</td>
                      <td className="py-3">1 Page (Mid-Level)</td>
                      <td className={`py-3 ${cvOptimization?.totalLength === '1 Page' ? 'text-green-400' : 'text-red-400'}`}>
                        {cvOptimization?.totalLength === '1 Page' ? 'Good' : 'Review'}
                      </td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Bullet Point Length</td>
                      <td className="py-3">{cvOptimization?.bulletPointLength || 'Avg. 3.2 Lines'}</td>
                      <td className="py-3">Max 2 Lines</td>
                      <td className={`py-3 ${cvOptimization?.bulletPointLength?.includes('2.') ? 'text-green-400' : 'text-red-400'}`}>
                        {cvOptimization?.bulletPointLength?.includes('2.') ? 'Good' : 'Needs Trimming'}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3">Education/Skills Placement</td>
                      <td className="py-3">{cvOptimization?.educationPlacement || 'At bottom'}</td>
                      <td className="py-3">Top-Right or After Experience</td>
                      <td className={`py-3 ${cvOptimization?.educationPlacement === 'Top' ? 'text-green-400' : 'text-yellow-400'}`}>
                        {cvOptimization?.educationPlacement === 'Top' ? 'Good' : 'Adjust'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-400 text-sm"><strong>Critical Insight:</strong> A recruiter won't read the second page. Move your best achievements above the fold to maximize initial screen success.</p>
            </div>
          </div>
        </motion.div>

        {/* Gaps Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Skills Gap Analysis</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Analysis of skill depth vs. frequency and focus area distribution in your CV.
          </p>
          
          <div className="space-y-6">
            {/* Skill Depth Analysis */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Skill Depth vs. Frequency</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-gray-600">Skill</th>
                      <th className="text-left py-3 text-gray-600">Mentions</th>
                      <th className="text-left py-3 text-gray-600">Quantified Use</th>
                      <th className="text-left py-3 text-gray-600">Gap Insight</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-900/70">
                    {skillsGap?.skills && skillsGap.skills.length > 0 ? (
                      skillsGap.skills.map((skill: any, index: number) => (
                        <tr key={index} className="border-b border-white/5">
                          <td className="py-3">{skill.name}</td>
                          <td className="py-3">{skill.mentions} times</td>
                          <td className="py-3">{skill.quantifiedUse} times</td>
                          <td className={`py-3 ${
                            skill.gapInsight === 'Major Gap' ? 'text-red-400' :
                            skill.gapInsight === 'Minor Gap' ? 'text-yellow-400' :
                            skill.gapInsight === 'Targeted Gap' ? 'text-green-400' :
                            'text-blue-400'
                          }`}>
                            {skill.gapInsight}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-3 col-span-4 text-center text-gray-500">No skills analysis available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">CV Focus Distribution</h3>
              <div className="space-y-3">
                {skillsGap?.focusDistribution && skillsGap.focusDistribution.length > 0 ? (
                  skillsGap.focusDistribution.map((area: any, index: number) => {
                    const colors = ['bg-[#80FF00]', 'bg-yellow-400', 'bg-blue-400', 'bg-purple-400', 'bg-red-400', 'bg-green-400'];
                    const color = colors[index % colors.length];
                    return (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-gray-600">{area.area}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-700 rounded-full h-2">
                            <div className={`${color} h-2 rounded-full`} style={{width: `${area.percentage}%`}}></div>
                          </div>
                          <span className="text-gray-600 text-sm">{area.percentage}%</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-gray-500">No focus distribution data available</div>
                )}
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-yellow-400 text-sm"><strong>Career Advancement Tip:</strong> To advance to Senior PM/Lead, refactor 15-20% of delivery bullets to focus on Strategy and People Management.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mid-Level to Senior Translation Tool */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.0 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Mid-Level to Senior Translation</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Automatically reframe your experience using senior-level language to advance your career positioning.
          </p>
          
          <div className="space-y-4">
            {seniorTranslation?.translations && seniorTranslation.translations.length > 0 ? (
              seniorTranslation.translations.map((item: any, index: number) => (
              <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="grid grid-cols-1 tablet:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">Current (Mid-Level)</h4>
                    <p className="text-gray-900/70 text-sm italic">"{item.current}"</p>
                  </div>
                  <div>
                    <h4 className="text-[#80FF00] font-semibold mb-2">Senior Translation</h4>
                    <p className="text-gray-600 text-sm">"{item.improved}"</p>
                  </div>
                </div>
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                  <p className="text-blue-400 text-xs"><strong>Shift:</strong> {item.shift}</p>
                </div>
              </div>
            ))
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-900/60">No senior translation examples available</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Industry-Specific Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Industry Specialization Analysis</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Identified Specialization</h3>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">🎯 {
                  industrySpecialization?.specialization || 
                  (typeof industrySpecialization?.identified === 'string' ? industrySpecialization.identified : 'General')
                } Specialist</h4>
                <p className="text-gray-600 text-sm mb-3">
                  {industrySpecialization?.specialization || (typeof industrySpecialization?.identified === 'string' ? industrySpecialization.identified : null) ? 
                    `Your specialization in ${industrySpecialization?.specialization || (typeof industrySpecialization?.identified === 'string' ? industrySpecialization.identified : '')} is a major asset!` :
                    'Consider developing a specialization to stand out to recruiters.'
                  }
                </p>
                <p className="text-gray-900/70 text-sm">
                  {industrySpecialization?.specialization || (typeof industrySpecialization?.identified === 'string' ? industrySpecialization.identified : null) ? 
                    'Recruiters often screen for specific industry keywords before general skills.' :
                    'Focus on building expertise in a specific industry or technology stack.'
                  }
                </p>
                {/* Handle identified object if it contains target_industries and alignment_notes */}
                {industrySpecialization?.identified && typeof industrySpecialization.identified === 'object' && !Array.isArray(industrySpecialization.identified) && (
                  <div className="mt-4 pt-4 border-t border-green-500/30">
                    {industrySpecialization.identified.target_industries && (
                      <div className="mb-2">
                        <p className="text-gray-700 text-xs font-semibold mb-1">Target Industries:</p>
                        <p className="text-gray-600 text-xs">
                          {Array.isArray(industrySpecialization.identified.target_industries) 
                            ? industrySpecialization.identified.target_industries.join(', ')
                            : String(industrySpecialization.identified.target_industries)}
                        </p>
                      </div>
                    )}
                    {industrySpecialization.identified.alignment_notes && (
                      <div>
                        <p className="text-gray-700 text-xs font-semibold mb-1">Alignment Notes:</p>
                        <p className="text-gray-600 text-xs">
                          {typeof industrySpecialization.identified.alignment_notes === 'string'
                            ? industrySpecialization.identified.alignment_notes
                            : String(industrySpecialization.identified.alignment_notes)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {/* Handle industryAlignment object if present */}
                {industrySpecialization?.industryAlignment && typeof industrySpecialization.industryAlignment === 'object' && !Array.isArray(industrySpecialization.industryAlignment) && (
                  <div className="mt-4 pt-4 border-t border-green-500/30">
                    {industrySpecialization.industryAlignment.target_industries && (
                      <div className="mb-2">
                        <p className="text-gray-700 text-xs font-semibold mb-1">Target Industries:</p>
                        <p className="text-gray-600 text-xs">
                          {Array.isArray(industrySpecialization.industryAlignment.target_industries) 
                            ? industrySpecialization.industryAlignment.target_industries.join(', ')
                            : String(industrySpecialization.industryAlignment.target_industries)}
                        </p>
                      </div>
                    )}
                    {industrySpecialization.industryAlignment.alignment_notes && (
                      <div>
                        <p className="text-gray-700 text-xs font-semibold mb-1">Alignment Notes:</p>
                        <p className="text-gray-600 text-xs">
                          {typeof industrySpecialization.industryAlignment.alignment_notes === 'string'
                            ? industrySpecialization.industryAlignment.alignment_notes
                            : String(industrySpecialization.industryAlignment.alignment_notes)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {/* Handle target_industries and alignment_notes at top level if present */}
                {industrySpecialization?.target_industries && (
                  <div className="mt-4 pt-4 border-t border-green-500/30">
                    <div className="mb-2">
                      <p className="text-gray-700 text-xs font-semibold mb-1">Target Industries:</p>
                      <p className="text-gray-600 text-xs">
                        {Array.isArray(industrySpecialization.target_industries) 
                          ? industrySpecialization.target_industries.join(', ')
                          : String(industrySpecialization.target_industries)}
                      </p>
                    </div>
                  </div>
                )}
                {industrySpecialization?.alignment_notes && (
                  <div className="mt-2">
                    <p className="text-gray-700 text-xs font-semibold mb-1">Alignment Notes:</p>
                    <p className="text-gray-600 text-xs">
                      {typeof industrySpecialization.alignment_notes === 'string'
                        ? industrySpecialization.alignment_notes
                        : String(industrySpecialization.alignment_notes)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Critical {industrySpecialization?.specialization || 'Industry'} Keywords to Emphasize
              </h3>
              <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3">
                {industrySpecialization?.keywords && industrySpecialization.keywords.length > 0 ? (
                  industrySpecialization.keywords.map((keyword: any, index: number) => {
                    // Handle both string and object formats
                    const keywordText = typeof keyword === 'string' ? keyword : (keyword?.keyword || keyword?.name || JSON.stringify(keyword));
                    return (
                      <div key={index} className="bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg p-2 text-center">
                        <span className="text-[#80FF00] text-sm font-medium">{keywordText}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-4 text-center py-4 text-gray-500">No specific keywords identified</div>
                )}
              </div>
            </div>

            {industrySpecialization?.contactIssues && industrySpecialization.contactIssues.length > 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-red-400 font-semibold mb-2">🚨 Contact Details Check</h4>
                <div className="space-y-2 text-sm">
                  {industrySpecialization.contactIssues.map((issue: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <span className="text-gray-600">
                        <strong>{issue.issue}</strong>
                      </span>
                    </div>
                  ))}
                  <p className="text-red-400 text-xs mt-2">
                    <strong>Action Required:</strong> {industrySpecialization.contactIssues.map((issue: any) => issue.action).join(' and ')} for professional presentation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">✅ Contact Details Look Professional</h4>
                <p className="text-gray-600 text-sm">Your contact information appears professional and appropriate for senior roles.</p>
              </div>
            )}

            {/* Industry Recommendations */}
            {industrySpecialization?.recommendations && industrySpecialization.recommendations.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Industry Recommendations</h3>
                <ul className="space-y-2">
                  {industrySpecialization.recommendations.map((recommendation: any, index: number) => {
                    // Handle both string and object formats
                    const recommendationText = typeof recommendation === 'string' 
                      ? recommendation 
                      : (recommendation?.text || recommendation?.recommendation || recommendation?.message || JSON.stringify(recommendation));
                    return (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-[#80FF00] mt-1">•</span>
                        <span className="text-gray-600 text-sm">{recommendationText}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-center"
        >
          <button
            onClick={handleSaveMasterCV}
            className="bg-[#80FF00] text-black px-12 py-4 rounded-lg font-bold text-lg hover:bg-[#70e600] transition-colors flex items-center gap-3 mx-auto"
          >
            {isEditingMasterCV ? 'Update Master CV' : 'Create Master CV'}
            <ArrowRight size={20} />
          </button>
        </motion.div>

        {/* CV Preview Modal */}
        <CVPreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          cvData={state.cvData}
        />
      </div>
    </div>
  );
}
