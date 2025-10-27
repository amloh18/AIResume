'use client';

import React, { useState, useEffect } from 'react';
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

  const generateAIAnalysis = async (isRetry = false) => {
    if (isRetry) {
      setRetryCount(prev => prev + 1);
    }
    
    setIsGenerating(true);
    setError(null);

    try {
      console.log('🚀 Starting AI analysis...', isRetry ? `(Retry ${retryCount + 1})` : '');
      console.log('📊 CV Data:', state.cvData);
      
      const response = await fetch('/api/ai/career-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cvData: state.cvData })
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

  const handleSaveMasterCV = async () => {
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
        authProviderId: session?.user?.id || session?.user?.email
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
        const errorText = await response.text();
        console.error('❌ Master CV creation failed:', errorText);
        throw new Error(`Master CV creation failed: ${response.status} ${response.statusText}`);
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
  };

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
          <p className="text-white/60 mb-8">
            Our AI is analyzing your background to provide personalized career insights...
          </p>
          <div className="space-y-2 text-sm text-white/40">
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
          <h2 className="text-2xl font-bold text-white mb-4">Analysis Failed</h2>
          <p className="text-white/60 mb-8">{error}</p>
          <div className="space-y-4">
            <button
              onClick={() => generateAIAnalysis(true)}
              className="w-full px-6 py-3 bg-[#80FF00] text-black font-medium rounded-lg hover:bg-[#70e600] transition-colors"
            >
              Try Again {retryCount > 0 && `(${retryCount})`}
            </button>
            <button
              onClick={onBack}
              className="w-full px-6 py-3 bg-[#333333] text-white rounded-lg hover:bg-[#444444] transition-colors"
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

  const { experienceLevel, careerPath, strategicSuggestions } = state.aiAnalysis;

  // If not authenticated, show blurred content with sign-in modal
  if (!currentSession?.user) {
    return (
      <div className="relative">
        {/* Blurred content */}
        <div className="blur-sm pointer-events-none">
          <div className="max-w-6xl mx-auto p-8 space-y-8">
            {/* Description Section */}
            <div className="text-center mb-12">
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-6">
                Here's a summary of our AI-powered analysis. Use these insights to tailor your CV for your next career move.
              </p>
              <button
                onClick={() => setShowPreview(true)}
                className="bg-[#333333] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto border border-white/20"
              >
                <Eye size={16} />
                CV Preview
              </button>
            </div>

            {/* Experience Level Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="bg-[#222B22] border border-white/10 rounded-xl p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
                  <Target className="w-5 h-5 text-black" />
                </div>
                <h2 className="text-2xl font-bold text-white">Experience Level</h2>
              </div>
              
              <p className="text-white/80 mb-6">
                We've determined your current career standing based on your work history.
              </p>
              
              <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
                <h3 className="text-3xl font-bold text-[#80FF00] mb-4">{experienceLevel.level}</h3>
                <p className="text-white/80 leading-relaxed">{experienceLevel.rationale}</p>
              </div>
            </motion.div>

            {/* Additional cards would go here but blurred */}
            <div className="space-y-6 opacity-50">
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Impact Score Analysis</h3>
                </div>
                <p className="text-white/60 text-sm">Data-driven assessment of your CV's competitive strength...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Career Trajectory Analysis</h3>
                </div>
                <p className="text-white/60 text-sm">Analysis of career progression and job duration patterns...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Eye className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">CV Reading Time Optimization</h3>
                </div>
                <p className="text-white/60 text-sm">Ensure your most important information is easily digestible...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Skills Gap Analysis</h3>
                </div>
                <p className="text-white/60 text-sm">Analysis of skill depth vs. frequency and focus areas...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Mid-Level to Senior Translation</h3>
                </div>
                <p className="text-white/60 text-sm">Reframe your experience using senior-level language...</p>
              </div>
              
              <div className="bg-[#222B22] border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-[#80FF00] rounded flex items-center justify-center">
                    <Target className="w-4 h-4 text-black" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Industry Specialization Analysis</h3>
                </div>
                <p className="text-white/60 text-sm">FinTech specialization and critical keywords to emphasize...</p>
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
    <div className="max-w-6xl mx-auto p-8 space-y-8">
        {/* Description Section */}
        <div className="text-center mb-12">
          <p className="text-white/80 text-lg max-w-2xl mx-auto mb-6">
            Here's a summary of our AI-powered analysis. Use these insights to tailor your CV for your next career move.
          </p>
          <button
            onClick={() => setShowPreview(true)}
            className="bg-[#333333] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto border border-white/20"
          >
            <Eye size={16} />
            CV Preview
          </button>
        </div>

        {/* Experience Level Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Experience Level</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            We've determined your current career standing based on your work history.
          </p>
          
          <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
            <h3 className="text-3xl font-bold text-[#80FF00] mb-4">{experienceLevel.level}</h3>
            <p className="text-white/80 leading-relaxed">{experienceLevel.rationale}</p>
          </div>
        </motion.div>

        {/* Quantifiable Achievement Analysis Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Impact Score Analysis</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            Data-driven assessment of your CV's competitive strength based on quantifiable achievements and action-oriented language.
          </p>
          
          <div className="space-y-6">
            {/* Impact Metrics Table */}
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Your CV Impact Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-white/80">Metric</th>
                      <th className="text-left py-3 text-white/80">Your Score</th>
                      <th className="text-left py-3 text-white/80">Target</th>
                      <th className="text-left py-3 text-white/80">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    <tr className="border-b border-white/5">
                      <td className="py-3">Quantifiable Statements</td>
                      <td className="py-3">3/15</td>
                      <td className="py-3">10+</td>
                      <td className="py-3 text-red-400">Needs Work</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">High-Impact Verbs</td>
                      <td className="py-3">8/30</td>
                      <td className="py-3">25+</td>
                      <td className="py-3 text-yellow-400">Moderate</td>
                    </tr>
                    <tr>
                      <td className="py-3">Industry Keywords</td>
                      <td className="py-3">75%</td>
                      <td className="py-3">90%+</td>
                      <td className="py-3 text-yellow-400">Good</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Key Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1A201A] rounded-lg p-4 border border-red-500/20">
                <h4 className="text-red-400 font-semibold mb-2">🚨 Critical Gap</h4>
                <p className="text-white/80 text-sm">Only 3 out of 15 bullet points contain numbers or percentages. Hiring managers look for measurable impact.</p>
              </div>
              <div className="bg-[#1A201A] rounded-lg p-4 border border-yellow-500/20">
                <h4 className="text-yellow-400 font-semibold mb-2">⚠️ Improvement Needed</h4>
                <p className="text-white/80 text-sm">Shift from passive verbs like "Responsible for" to action verbs like "Spearheaded" and "Drove".</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Career Trajectory Coherence Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Career Trajectory Analysis</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            Analysis of your career progression, job duration patterns, and trajectory coherence.
          </p>
          
          <div className="space-y-6">
            {/* Coherence Score */}
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Career Coherence Score</h3>
                <div className="text-3xl font-bold text-[#80FF00]">92%</div>
              </div>
              <p className="text-white/80 mb-4">Your career path shows strong alignment with consistent progression through similar Product Management roles.</p>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <p className="text-green-400 text-sm">✅ <strong>Strength:</strong> Focus and stability signal to recruiters</p>
              </div>
            </div>

            {/* Red Flags */}
            <div className="bg-[#1A201A] rounded-lg p-6 border border-red-500/20">
              <h3 className="text-lg font-bold text-white mb-4">⚠️ Potential Red Flags Detected</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <p className="text-white/80 text-sm"><strong>Short Job Duration:</strong> Role at 'TechCo Solutions' lasted only 9 months</p>
                    <p className="text-white/60 text-xs mt-1">Multiple short stints can signal "job hopper" risk to recruiters</p>
                  </div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-3">
                  <p className="text-red-400 text-sm"><strong>Action Required:</strong> If this was a contract or layoff, clarify it on your CV (e.g., "9-month contract to launch new API")</p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Senior Product Manager', description: 'Natural progression leveraging existing experience for strategic responsibilities' },
                { title: 'Product Lead', description: 'Mentoring junior PMs and leading specific product areas' },
                { title: 'Technical Product Manager', description: 'Specializing in complex, engineering-focused products' }
              ].map(({ title, description }, index) => (
                <div key={index} className="bg-[#1A201A] rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-semibold mb-2">{title}</h4>
                  <p className="text-white/70 text-sm">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CV Reading Time Optimization */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Eye className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">CV Reading Time Optimization</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            Recruiters spend an average of 6 seconds on initial CV scan. Ensure your most important information is easily digestible.
          </p>
          
          <div className="space-y-4">
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Your CV Structure Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-white/80">Metric</th>
                      <th className="text-left py-3 text-white/80">Your CV</th>
                      <th className="text-left py-3 text-white/80">Recommended</th>
                      <th className="text-left py-3 text-white/80">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    <tr className="border-b border-white/5">
                      <td className="py-3">Total Length</td>
                      <td className="py-3">2 Pages</td>
                      <td className="py-3">1 Page (Mid-Level)</td>
                      <td className="py-3 text-red-400">Review</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Bullet Point Length</td>
                      <td className="py-3">Avg. 3.2 Lines</td>
                      <td className="py-3">Max 2 Lines</td>
                      <td className="py-3 text-red-400">Needs Trimming</td>
                    </tr>
                    <tr>
                      <td className="py-3">Education/Skills Placement</td>
                      <td className="py-3">At bottom</td>
                      <td className="py-3">Top-Right or After Experience</td>
                      <td className="py-3 text-yellow-400">Adjust</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm"><strong>Critical Insight:</strong> A recruiter won't read the second page. Move your best achievements above the fold to maximize initial screen success.</p>
            </div>
          </div>
        </motion.div>

        {/* Gaps Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Skills Gap Analysis</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            Analysis of skill depth vs. frequency and focus area distribution in your CV.
          </p>
          
          <div className="space-y-6">
            {/* Skill Depth Analysis */}
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Skill Depth vs. Frequency</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 text-white/80">Skill</th>
                      <th className="text-left py-3 text-white/80">Mentions</th>
                      <th className="text-left py-3 text-white/80">Quantified Use</th>
                      <th className="text-left py-3 text-white/80">Gap Insight</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/70">
                    <tr className="border-b border-white/5">
                      <td className="py-3">SQL/Data Analysis</td>
                      <td className="py-3">4 times</td>
                      <td className="py-3">1 time</td>
                      <td className="py-3 text-red-400">Major Gap</td>
                    </tr>
                    <tr className="border-b border-white/5">
                      <td className="py-3">Stakeholder Mgt.</td>
                      <td className="py-3">7 times</td>
                      <td className="py-3">5 times</td>
                      <td className="py-3 text-yellow-400">Minor Gap</td>
                    </tr>
                    <tr>
                      <td className="py-3">Go-to-Market</td>
                      <td className="py-3">1 time</td>
                      <td className="py-3">1 time</td>
                      <td className="py-3 text-green-400">Targeted Gap</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Focus Areas */}
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">CV Focus Distribution</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Feature Execution/Delivery</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div className="bg-[#80FF00] h-2 rounded-full" style={{width: '50%'}}></div>
                    </div>
                    <span className="text-white/60 text-sm">50%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Long-term Strategy/Vision</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div className="bg-yellow-400 h-2 rounded-full" style={{width: '25%'}}></div>
                    </div>
                    <span className="text-white/60 text-sm">25%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">People/Stakeholder Management</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full" style={{width: '15%'}}></div>
                    </div>
                    <span className="text-white/60 text-sm">15%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Data/Technical Details</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div className="bg-purple-400 h-2 rounded-full" style={{width: '10%'}}></div>
                    </div>
                    <span className="text-white/60 text-sm">10%</span>
                  </div>
                </div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
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
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Mid-Level to Senior Translation</h2>
          </div>
          
          <p className="text-white/80 mb-6">
            Automatically reframe your experience using senior-level language to advance your career positioning.
          </p>
          
          <div className="space-y-4">
            {[
              {
                current: "Managed the product backlog and defined user stories.",
                improved: "Owned the 12-month product roadmap, aligning it with executive-level OKRs.",
                shift: "Execution → Strategy"
              },
              {
                current: "Tested new features with users and gathered feedback.",
                improved: "Established a continuous discovery framework, resulting in a 20% faster iteration cycle.",
                shift: "Task → System"
              },
              {
                current: "Worked with the engineering team to ship features.",
                improved: "Mentored junior PMs and coached the Engineering Manager on agile best practices.",
                shift: "Contributor → Leader"
              }
            ].map((item, index) => (
              <div key={index} className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-red-400 font-semibold mb-2">Current (Mid-Level)</h4>
                    <p className="text-white/70 text-sm italic">"{item.current}"</p>
                  </div>
                  <div>
                    <h4 className="text-[#80FF00] font-semibold mb-2">Senior Translation</h4>
                    <p className="text-white/80 text-sm">"{item.improved}"</p>
                  </div>
                </div>
                <div className="mt-3 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2">
                  <p className="text-blue-400 text-xs"><strong>Shift:</strong> {item.shift}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Industry-Specific Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="bg-[#222B22] border border-white/10 rounded-xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
              <Target className="w-5 h-5 text-black" />
            </div>
            <h2 className="text-2xl font-bold text-white">Industry Specialization Analysis</h2>
          </div>
          
          <div className="space-y-6">
            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Identified Specialization</h3>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">🎯 FinTech Specialist</h4>
                <p className="text-white/80 text-sm mb-3">4 out of 5 roles in financial services/payments</p>
                <p className="text-white/70 text-sm">Your specialization is a major asset! Recruiters in FinTech often screen for specific compliance and security keywords before general product skills.</p>
              </div>
            </div>

            <div className="bg-[#1A201A] rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">Critical FinTech Keywords to Emphasize</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Compliance', 'Security Protocols', 'Regulatory Frameworks', 'GDPR', 'PSD2', 'Fraud Detection', 'Risk Management', 'PCI DSS'].map((keyword, index) => (
                  <div key={index} className="bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-lg p-2 text-center">
                    <span className="text-[#80FF00] text-sm font-medium">{keyword}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <h4 className="text-red-400 font-semibold mb-2">🚨 Contact Details Check</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-white/80"><strong>Email Domain:</strong> Using personal nickname@yahoo.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-white/80"><strong>LinkedIn URL:</strong> Using default, unedited URL</span>
                </div>
                <p className="text-red-400 text-xs mt-2"><strong>Action Required:</strong> Update to professional email domain and create custom LinkedIn URL for senior roles.</p>
              </div>
            </div>
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
  );
}
