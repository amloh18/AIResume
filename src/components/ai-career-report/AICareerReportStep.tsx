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
  const { data: session } = useSession();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use prop session if provided, otherwise use hook session
  const currentSession = propSession || session;

  // Generate AI analysis when component mounts
  useEffect(() => {
    if (!state.aiAnalysis && !isGenerating) {
      generateAIAnalysis();
    }
  }, []);

  // Track if auto-save has been attempted to prevent multiple attempts
  const autoSaveAttempted = useRef(false);

  const generateAIAnalysis = async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🚀 Starting AI analysis...', isRetry ? `(Retry ${retryCount + 1})` : '');
      console.log('📊 CV Data:', state.cvData);
      console.log('💼 Job Data:', state.jobData);
      
      const response = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cvData: state.cvData,
          jobData: state.jobData,
          jobId: state.jobId
        })
      });

      console.log('📡 AI Analysis response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ AI Analysis failed:', errorText);
        throw new Error(`AI Analysis failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 AI Analysis result:', result);

      if (result.success) {
        dispatch({ type: 'SET_AI_ANALYSIS', payload: result.analysis });
        dispatch({ type: 'SET_COMPLETED_STEP', payload: 3 });
        setRetryCount(0); // Reset retry count on success
      } else {
        throw new Error(result.error || 'Failed to generate career analysis');
      }
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Handle different types of errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to AI service. Please check your internet connection and try again.');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to generate analysis. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMasterCV = useCallback(async () => {
    // Check if user is authenticated before saving
    if (!currentSession?.user) {
      setError('Please sign in to save your Master CV');
      return;
    }

    try {
      console.log('🚀 Starting Master CV creation...');
      console.log('📊 CV Data:', state.cvData);
      console.log('🤖 AI Analysis:', state.aiAnalysis);

      // Create the master CV directly using the onboarding API
      const requestData = {
        title: `${state.cvData.basics.name || 'User'}'s Master CV`,
        cvData: state.cvData,
        metadata: {
          isMaster: true,
          tags: ['master-cv', 'ai-career-report'],
          isPublic: false,
          aiAnalysis: state.aiAnalysis,
          createdVia: 'ai-career-report',
          lastModified: new Date().toISOString()
        }
      };

      console.log('📤 Sending request to create Master CV:', {
        title: requestData.title,
        hasCVData: !!requestData.cvData,
        hasAIAnalysis: !!requestData.metadata.aiAnalysis,
        authProviderId: currentSession?.user?.id || currentSession?.user?.email
      });

      const response = await fetch('/api/cvs/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...requestData,
          authProviderId: currentSession?.user?.id || currentSession?.user?.email,
          authProvider: 'nextauth'
        })
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
          
          if (errorData.details && process.env.NODE_ENV === 'development') {
            console.error('❌ Detailed error:', errorData.details);
          }
        } catch (parseError) {
          const errorText = await response.text();
          console.error('❌ Master CV creation failed (text response):', errorText);
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('📥 Master CV creation result:', result);

      if (result.success) {
        console.log('✅ Master CV created successfully:', result.data?.cv?.id);
        console.log('🔍 AICareerReportStep - Master CV creation result:', JSON.stringify(result, null, 2));
        
        // Store completion flag in session storage
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('masterCVCreated', 'true');
          sessionStorage.setItem('fromAICareerReport', 'true');
          sessionStorage.setItem('showUpgradePopup', 'true');
          
          console.log('🔍 AICareerReportStep - Session storage set:', {
            masterCVCreated: sessionStorage.getItem('masterCVCreated'),
            fromAICareerReport: sessionStorage.getItem('fromAICareerReport'),
            showUpgradePopup: sessionStorage.getItem('showUpgradePopup')
          });
          
          // Clear localStorage now that CV is saved
          try {
            localStorage.removeItem('ai-career-report-data');
            console.log('✅ Cleared localStorage after saving Master CV');
          } catch (error) {
            console.warn('⚠️ Failed to clear localStorage:', error);
          }
          
          // Dispatch custom event to notify other components
          window.dispatchEvent(new CustomEvent('masterCVCreated'));
          console.log('🔍 AICareerReportStep - Custom event dispatched');
        }
        
        onComplete();
      } else {
        throw new Error(result.error || result.message || 'Failed to save Master CV');
      }
    } catch (error) {
      console.error('❌ Save Master CV error:', error);
      
      // Handle different types of errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('Network error: Unable to connect to server. Please check your internet connection and try again.');
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Failed to save Master CV. Please try again.');
      }
    }
  }, [currentSession, state.cvData, state.aiAnalysis, onComplete]);

  // Auto-save Master CV when user becomes authenticated (if not already saved)
  useEffect(() => {
    const checkAndSave = async () => {
      // Only auto-save if:
      // 1. User is authenticated
      // 2. We have CV data
      // 3. AI analysis is complete
      // 4. Master CV hasn't been saved yet (check sessionStorage flag)
      // 5. We haven't already attempted auto-save
      if (
        currentSession?.user && 
        state.cvData && 
        state.aiAnalysis && 
        !autoSaveAttempted.current &&
        typeof window !== 'undefined'
      ) {
        const masterCVCreated = sessionStorage.getItem('masterCVCreated');
        
        if (masterCVCreated !== 'true') {
          console.log('🔄 Auto-saving Master CV after authentication...');
          autoSaveAttempted.current = true;
          try {
            await handleSaveMasterCV();
          } catch (error) {
            console.error('❌ Auto-save failed:', error);
            // Reset flag so user can try again manually
            autoSaveAttempted.current = false;
          }
        }
      }
    };

    // Small delay to ensure session is fully loaded
    const timer = setTimeout(checkAndSave, 1500);
    return () => clearTimeout(timer);
  }, [currentSession?.user, state.cvData, state.aiAnalysis, handleSaveMasterCV]);

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
    return (
      <div className="min-h-screen bg-[#1A201A] flex items-center justify-center">
        <div className="text-center">
          <button
            onClick={() => generateAIAnalysis(false)}
            className="px-8 py-4 bg-[#80FF00] text-black font-semibold rounded-lg hover:bg-[#70e600] transition-colors"
          >
            Generate Career Analysis
          </button>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Career Trajectory Coherence Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-900">Career Trajectory Analysis</h2>
          </div>
          
          <p className="text-gray-600 mb-6">
            Analysis of your career progression, job duration patterns, and trajectory coherence.
          </p>
          
          <CareerTrajectoryGraph
            careerPath={careerPath}
            careerCoherence={careerCoherence}
            experienceLevel={experienceLevel?.level}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <h4 className="text-green-400 font-semibold mb-2">🎯 {industrySpecialization?.specialization || 'General'} Specialist</h4>
                <p className="text-gray-600 text-sm mb-3">
                  {industrySpecialization?.specialization ? 
                    `Your specialization in ${industrySpecialization.specialization} is a major asset!` :
                    'Consider developing a specialization to stand out to recruiters.'
                  }
                </p>
                <p className="text-gray-900/70 text-sm">
                  {industrySpecialization?.specialization ? 
                    'Recruiters often screen for specific industry keywords before general skills.' :
                    'Focus on building expertise in a specific industry or technology stack.'
                  }
                </p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Critical {industrySpecialization?.specialization || 'Industry'} Keywords to Emphasize
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {industrySpecialization?.keywords && industrySpecialization.keywords.length > 0 ? (
                  industrySpecialization.keywords.map((keyword: string, index: number) => (
                    <div key={index} className="bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg p-2 text-center">
                      <span className="text-[#80FF00] text-sm font-medium">{keyword}</span>
                    </div>
                  ))
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
            Create Master CV
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
