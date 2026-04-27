'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AlertCircle, Eye, Palette, X, FileText, Download, Target, Award, TrendingUp, AlertTriangle, CheckCircle2, Shield, Sparkles, BookOpen, ChevronRight, Zap, Briefcase, Edit2, LayoutTemplate, Calendar } from 'lucide-react';
import CVBuilderProAdapter from '@/components/cv-builder-pro/CVBuilderProAdapter';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { downloadAsPDF, downloadAsDOCX } from '@/lib/utils/download';
import { CentralScoreManager, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/pill-engine/CentralScoreManager';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';
import html2canvas from 'html2canvas';
import ScorecardPanel from '@/components/resume-enhancer/panels/ScorecardPanel';
import DateFormatSelector from '@/components/resume-enhancer/DateFormatSelector';
import { getDefaultPaperSize } from '@/lib/services/paperSizeService';
import type { DateFormatStyle } from '@/lib/utils/textFormatting';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import ScoreBreakdown from '@/components/ui/ScoreBreakdown';

export default function Step4Review() {
  const { state, setTemplate, dispatch, goToStep } = useResumeEnhancer();
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const [zoom, setZoom] = useState(0.5); // Will be recalculated on mount
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [cvPageCount, setCvPageCount] = useState(1);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cvMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleDownloadEvent = () => setShowDownloadModal(true);
    window.addEventListener('open-download-modal', handleDownloadEvent);
    return () => window.removeEventListener('open-download-modal', handleDownloadEvent);
  }, []);

  // Auto-fit zoom to container width
  useEffect(() => {
    const calculateFitZoom = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      // A4 width is 210mm ≈ 794px at 96dpi, add some padding
      const a4Width = 794;
      const padding = 40; // 20px on each side
      const availableWidth = containerWidth - padding;
      const calculatedZoom = Math.min(0.9, Math.max(0.4, availableWidth / a4Width));
      setZoom(calculatedZoom);
    };

    calculateFitZoom();
    window.addEventListener('resize', calculateFitZoom);
    return () => window.removeEventListener('resize', calculateFitZoom);
  }, []);

  const paperWidth = state.paperSize === 'Letter' ? 816 : 794;
  const paperHeight = state.paperSize === 'Letter' ? 1056 : 1123;

  useEffect(() => {
    const fetchCoverLetterData = async () => {
      if (showCoverLetterPreview && state.coverLetterId && !coverLetterData) {
        try {
          const clResponse = await fetch(`/api/cover-letters/${state.coverLetterId}`);
          if (!clResponse.ok) return;
          const clResult = await clResponse.json();
          if (clResult.success && clResult.coverLetter) {
            setCoverLetterData(clResult.coverLetter);
          }
        } catch (err) {
          console.error('Failed to fetch cover letter data:', err);
        }
      }
    };
    fetchCoverLetterData();
  }, [showCoverLetterPreview, state.coverLetterId, coverLetterData]);

  useEffect(() => {
    if (!state.selectedTemplate) return;
    if (!cvMeasureRef.current) return;
    const el = cvMeasureRef.current;
    const update = () => {
      const h = el.scrollHeight || el.getBoundingClientRect().height;
      const pages = Math.max(1, Math.ceil(h / paperHeight));
      setCvPageCount(pages);
    };
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.selectedTemplate, state.cvData, paperHeight]);

  // Fetch cover letter status for journey CVs if not already loaded
  useEffect(() => {
    const fetchCoverLetterStatus = async () => {
      // Only fetch if it's a journey CV without a coverLetterId already loaded
      if (state.cvType === 'journey' && state.journeyId && !state.coverLetterId) {
        try {
          // Fetch the journey to get the cover letter ID
          const response = await fetch(`/api/application-journey/${state.journeyId}`);
          if (response.ok) {
            const result = await response.json();
            const journey = result.data?.journey || result.journey;
            // Check if the journey has a cover letter
            const coverLetterId = journey?.coverLetterId;

            if (coverLetterId) {
              dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: '', coverLetterId } });
            } else {
              // --- AUTO-GENERATE IF MISSING ---
              // User requested backend auto-creation without clicking 'Generate'.
              // We trigger it here if it doesn't exist.
              console.log('🔄 Step4Review - Auto-generating missing cover letter...');

              // We need userId for the request - assuming it's available in context or params, 
              // but Step4Review doesn't usually have userId prop explicitly passed in all usages or it uses session.
              // However, the `auto-generate` endpoint expects userId in body.
              // We'll try to get it from state.cvData.userId if available or skipped?
              // `Step4Review` might not have userId readily available in `state`.
              // We can rely on server session, but `route.ts` expects explicit userId in body.
              // Let's check props. Step4Review doesn't receive Props in the export default function Step4Review() line 19.
              // Ah, ResumeEnhancerContext might have it? `state` has `cvData`.
              // `state.cvData.userId` might be there? UnifiedSchema doesn't always have root userId.
              // Wait, the new `Step4Review` file content I viewed has `userId`? No, line 19 is `export default function Step4Review()`.
              // But line 440 of `CoverLetterEditorContainer` passes `userId`. That's different file.
              // `NotificationCenter` metadata says `Step4Review.tsx` active? No.

              // Let's assume we can get userId from the API session implicitly if we update API to use session. 
              // BUT my new API expects `userId` in body.
              // If I cannot get userId here easily, this is a blocker for "backend auto" from Client.
              // Wait, `journey.userId` likely exists in the response I just got!
              const journeyUserId = journey?.userId;

              if (journeyUserId) {
                const genResponse = await fetch('/api/cover-letters/auto-generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId: journeyUserId,
                    journeyId: state.journeyId,
                    cvId: state.cvId, // or journey.cvId
                    jobId: state.jobData?.id || state.jobData?._id // or journey.jobId
                  })
                });

                if (genResponse.ok) {
                  const genResult = await genResponse.json();
                  if (genResult.success && genResult.coverLetterId) {
                    console.log('✅ Step4Review - Auto-generated cover letter:', genResult.coverLetterId);
                    dispatch({ type: 'SET_AUTO_COVER_LETTER', payload: { draft: '', coverLetterId: genResult.coverLetterId } });
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to fetch/generate cover letter status:', error);
        }
      }
    };

    fetchCoverLetterStatus();
  }, [state.cvType, state.journeyId, state.coverLetterId, state.cvId, state.jobData, dispatch]);

  // Auto-detect paper size based on user's location
  useEffect(() => {
    const detectPaperSize = async () => {
      // Skip if already set to non-default or if we've already detected
      if (state.paperSize && state.paperSize !== 'A4') return;

      try {
        const response = await fetch('/api/region');
        if (response.ok) {
          const { countryCode } = await response.json();
          const detectedSize = getDefaultPaperSize(countryCode);
          if (detectedSize !== state.paperSize) {
            dispatch({ type: 'SET_PAPER_SIZE', payload: detectedSize });
          }
        }
      } catch (error) {
        // Silently fail - keep default A4
        console.debug('Paper size detection failed, using default A4');
      }
    };

    detectPaperSize();
  }, [dispatch, state.paperSize]);


  // Calculate scores using the central manager
  const scoreResult = useMemo(() => {
    return CentralScoreManager.getInstance().getScoreSync(
      state.cvData,
      state.keywordGapAnalysis || undefined,
      state.atsScoreCap
    );
  }, [state.cvData, state.keywordGapAnalysis, state.atsScoreCap]);

  // Determine which score to show prominently
  const isJourneyCV = state.cvType === 'journey';
  const primaryScore = isJourneyCV && scoreResult.atsScore
    ? scoreResult.atsScore.total
    : scoreResult.cvScore.total;
  const primaryScoreLabel = isJourneyCV ? 'ATS Match' : 'Profile Strength';

  /**
   * Get color for score display
   */
  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleEditCoverLetter = () => {
    goToStep(4);
  };

  const handleDownload = async (format: 'pdf' | 'docx' = 'pdf') => {
    if (!state.selectedTemplate) {
      alert('Please select a template before downloading');
      return;
    }

    setIsDownloading(true);
    try {
      const baseName = state.cvTitle || 'CV';

      if (format === 'pdf') {
        const filename = `${baseName}.pdf`;

        // Find the preview element for client-side fallback
        let previewElement: HTMLElement | null = null;
        if (previewRef.current) {
          previewElement = previewRef.current.querySelector('.cv-document') as HTMLElement ||
            previewRef.current.querySelector('.cv-preview-container') as HTMLElement ||
            previewRef.current.querySelector('[class*="cv-preview"]') as HTMLElement ||
            previewRef.current;
        }

        // If cvId exists, use server-side API; otherwise use client-side generation
        await downloadAsPDF(
          previewElement || previewRef.current || document.body,
          filename,
          state.cvId || undefined,
          {
            paperSize: state.paperSize || 'A4',
            orientation: 'portrait',
            jobTitle: state.jobData?.title || state.targetRole
          }
        );
      } else if (format === 'docx') {
        const filename = `${baseName}.docx`;

        await downloadAsDOCX(
          state.cvData,
          filename,
          state.cvId || undefined,
          {
            paperSize: state.paperSize === 'Letter' ? 'Letter' : 'A4'
          }
        );
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download CV. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const calculateCompletionPercentage = () => {
    let filledSections = 0;
    const totalSections = 8;

    if (state.cvData.basics?.name && state.cvData.basics?.email) filledSections++;
    if (state.cvData.work && state.cvData.work.length > 0) filledSections++;
    if (state.cvData.education && state.cvData.education.length > 0) filledSections++;
    if (state.cvData.skills && state.cvData.skills.length > 0) filledSections++;
    if (state.cvData.projects && state.cvData.projects.length > 0) filledSections++;
    if (state.cvData.certificates && state.cvData.certificates.length > 0) filledSections++;
    if (state.cvData.languages && state.cvData.languages.length > 0) filledSections++;
    if (state.cvData.volunteer && state.cvData.volunteer.length > 0) filledSections++;

    return Math.round((filledSections / totalSections) * 100);
  };

  const completionPercentage = calculateCompletionPercentage();

  const handleTemplateSelect = (template: ITemplate) => {
    setTemplate(template);
    setShowTemplateModal(false);
  };

  const handleStartCoaching = async () => {
    const jobId = state.journeyId || state.jobData?._id || state.jobData?.id;
    if (!jobId) return;

    // Check if the job is in 'draft' status. If so, we should update it to 'created'
    if (state.jobData?.status === 'draft' || !state.jobData?.status) {
      try {
        await fetch(`/api/jobs/${jobId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'created' })
        });
      } catch (err) {
        console.error('Failed to update job status:', err);
      }
    }
    
    // Redirect to interview coach
    router.push(`/dashboard/interview/${jobId}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 overflow-hidden bg-[#f3f2ee] dark:bg-[#1a230f]">
      {/* Split View: Info Left, Preview Right */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 overflow-hidden p-6 max-w-[1600px] mx-auto w-full">
        {/* Left Panel - Info */}
        <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col min-h-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              Review Your Resume
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Take a final look before saving to your dashboard
            </p>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20 pr-2">
            {/* Scorecard Panel */}
            <div className="bg-white dark:bg-[#141810] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
                {/* Left side: ATS Score Ring */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="relative w-32 h-32 mb-3">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100 dark:text-gray-800" />
                      <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none"
                        strokeDasharray={276.46} strokeDashoffset={276.46 - (276.46 * ((primaryScore || 0) / 100))}
                        className="text-red-500 transition-all duration-1000 ease-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                      <span className="text-4xl font-black text-red-500">{primaryScore || 0}</span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">ATS SCORE</span>
                </div>

                {/* Right side: Total Score Breakdown */}
                <div className="flex-1 w-full">
                  <h3 className="text-sm font-bold text-green-500 mb-4">Score Breakdown</h3>
                  {isJourneyCV ? (
                    <div className="space-y-3">
                      <ScoreBreakdown label="Keyword Match" value={scoreResult?.atsScore?.keywordMatch || 0} max={40} />
                      <ScoreBreakdown label="Formatting" value={scoreResult?.atsScore?.formatting || 0} max={20} />
                      <ScoreBreakdown label="Alignment" value={scoreResult?.atsScore?.sectionAlignment || 0} max={15} />
                      <ScoreBreakdown label="Recency" value={scoreResult?.atsScore?.recency || 0} max={15} />
                      <ScoreBreakdown label="Contact Info" value={scoreResult?.atsScore?.contactability || 0} max={10} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <ScoreBreakdown label="Completeness" value={scoreResult?.cvScore?.completeness || 0} max={25} />
                      <ScoreBreakdown label="Impact Verbs" value={scoreResult?.cvScore?.impactVerbs || 0} max={20} />
                      <ScoreBreakdown label="Quantification" value={scoreResult?.cvScore?.quantification || 0} max={20} />
                      <ScoreBreakdown label="Formatting" value={scoreResult?.cvScore?.formatting || 0} max={15} />
                      <ScoreBreakdown label="Readability" value={scoreResult?.cvScore?.readability || 0} max={20} />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Keyword Gaps for Journey CVs */}
            {isJourneyCV && state.keywordGaps && state.keywordGaps.length > 0 && (
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-yellow-500" />
                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                    Missing Keywords ({state.keywordGaps.filter(g => g.importance === 'critical').length} critical)
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {state.keywordGaps.slice(0, 8).map((gap, i) => (
                    <span
                      key={i}
                      className={`text-xs px-3 py-1 rounded-full font-medium ${gap.importance === 'critical'
                        ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                        : gap.importance === 'preferred'
                          ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                    >
                      {gap.keyword}
                    </span>
                  ))}
                  {state.keywordGaps.length > 8 && (
                    <span className="text-xs text-gray-500 font-medium px-2 py-1">
                      +{state.keywordGaps.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Settings Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* CV Type */}
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">CV Type</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm capitalize">{state.cvType}</p>
                    {state.cvType === 'journey' && state.jobData && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[140px]">
                        For: {state.jobData.title || state.jobData.jobTitle || 'Job'}
                      </p>
                    )}
                  </div>
                </div>
                <button className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>

              {/* Template */}
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                    <LayoutTemplate className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Template</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[120px]">
                      {state.selectedTemplate?.name || 'None'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Change
                </button>
              </div>

              {/* Date Format */}
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-start gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex-1 w-full">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Date Format</p>
                    <DateFormatSelector
                      value={state.dateFormat}
                      onChange={(format) => dispatch({ type: 'SET_DATE_FORMAT', payload: format })}
                    />
                  </div>
                </div>
              </div>

              {/* Cover Letter */}
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div className="flex items-start gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Cover Letter</p>
                      {(state.autoGeneratedCoverLetter || (state.cvType === 'journey' && state.coverLetterId)) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                      )}
                    </div>
                    <button
                      onClick={handleEditCoverLetter}
                      className="w-full px-3 py-2 bg-[#8bc34a] hover:bg-[#7cb342] text-white rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 text-sm shadow-sm"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      {state.autoGeneratedCoverLetter || (state.cvType === 'journey' && state.coverLetterId)
                        ? 'Edit'
                        : state.cvType === 'journey' ? 'Generate' : 'Create'
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Export */}
              <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between sm:col-span-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Export</p>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Download your resume as a PDF</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  disabled={!state.selectedTemplate}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            {isJourneyCV && (
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  onClick={() => router.push('/dashboard/tracker')}
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all flex flex-col items-center justify-center shadow-md shadow-blue-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-2 text-lg mb-1">
                    <Target className="w-5 h-5" />
                    <span>View in Tracker</span>
                  </div>
                  <span className="text-xs text-blue-200 font-medium">See how your resume performs</span>
                </button>
                
                <button
                  onClick={handleStartCoaching}
                  className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold transition-all flex flex-col items-center justify-center shadow-md shadow-indigo-500/20 active:scale-95"
                >
                  <div className="flex items-center gap-2 text-lg mb-1">
                    <Zap className="w-5 h-5 text-yellow-300" />
                    <span>Interview Coach</span>
                  </div>
                  <span className="text-xs text-indigo-200 font-medium">Get AI-powered interview prep</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview */}
        <div ref={containerRef} className="w-full md:w-1/2 lg:w-[55%] flex flex-col min-h-0 bg-white dark:bg-[#141810] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
          {/* Preview Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => setShowCoverLetterPreview(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  !showCoverLetterPreview 
                    ? 'bg-[#8bc34a] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                Resume
              </button>
              {((state.autoGeneratedCoverLetter) || (state.cvType === 'journey' && state.coverLetterId)) && (
                <button
                  onClick={() => setShowCoverLetterPreview(true)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                    showCoverLetterPreview 
                      ? 'bg-[#8bc34a] text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                >
                  Cover Letter
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-500">
                <Eye className="w-4 h-4" />
                <span>Zoom: {Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded shadow-sm font-medium transition-colors"
                >
                  -
                </button>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="w-7 h-7 flex items-center justify-center bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded shadow-sm font-medium transition-colors text-lg leading-none"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar bg-[#f9fafb] dark:bg-[#0a0c08]" ref={previewRef}>
            {showCoverLetterPreview ? (
              <div
                className="w-full flex justify-center py-12"
                style={{ zoom }}
              >
                <div className="pointer-events-none shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)]" style={{ width: paperWidth }}>
                  <CoverLetterPreview
                    content={state.autoGeneratedCoverLetter || coverLetterData?.content || ''}
                    header={coverLetterData?.header}
                    body={coverLetterData?.body}
                    footer={coverLetterData?.footer}
                    cvData={state.cvData}
                    jobData={state.jobData}
                    selectedCVData={state.cvData}
                    template={COVER_LETTER_TEMPLATES[0]}
                    pageSize={state.paperSize === 'Letter' ? 'Letter' : 'A4'}
                  />
                </div>
              </div>
            ) : state.selectedTemplate ? (
              <div className="relative w-full overflow-hidden">
                <div className="absolute -left-[99999px] top-0 opacity-0 pointer-events-none" aria-hidden="true">
                  <div style={{ width: paperWidth }}>
                    <div ref={cvMeasureRef}>
                      <CVBuilderProAdapter cvData={state.cvData} template={state.selectedTemplate} theme="light" readOnly={true} />
                    </div>
                  </div>
                </div>

                <div className="w-full flex justify-center py-12" style={{ zoom }}>
                  <div className="flex flex-col gap-12">
                    {Array.from({ length: cvPageCount }).map((_, pageIndex) => (
                      <div
                        key={pageIndex}
                        className="shrink-0 bg-white shadow-[0_0_40px_rgba(0,0,0,0.1)] dark:shadow-[0_0_40px_rgba(0,0,0,0.3)] mx-auto"
                        style={{ width: paperWidth, height: paperHeight }}
                      >
                        <div className="w-full h-full overflow-hidden">
                          <div style={{ transform: `translateY(-${pageIndex * paperHeight}px)` }}>
                            <CVBuilderProAdapter cvData={state.cvData} template={state.selectedTemplate} theme="light" readOnly={true} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-500">
                    No template selected. Please select a template.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template Selector Modal */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#141810] shadow-2xl w-full h-full md:w-[90vw] md:h-[90vh] md:max-w-[1200px] md:rounded-2xl flex flex-col overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowTemplateModal(false)}
                className="absolute top-4 right-4 z-50 p-2 bg-white dark:bg-[#141810] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors shadow-sm"
              >
                <X className="w-5 h-5 text-gray-900 dark:text-white" />
              </button>
              
              <TemplateSelector
                selectedTemplate={state.selectedTemplate}
                onTemplateSelect={handleTemplateSelect}
                cvData={state.cvData}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Download Modal */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        onDownload={async (documentType: DocumentType, format: FormatType) => {
          if (documentType === 'cv') {
            await handleDownload(format);
          }
          setShowDownloadModal(false);
        }}
        onPaywallRequired={() => {
          openPaymentModal({
            preselectedPlanKey: 'pro_monthly',
            triggerContext: 'docx-export',
            returnUrl: window.location.href
          });
          setShowDownloadModal(false);
        }}
        hasCV={true}
        hasCoverLetter={!!state.autoGeneratedCoverLetter || (state.cvType === 'journey' && !!state.coverLetterId)}
        isDownloading={isDownloading}
        cvType={state.cvType === 'journey' ? 'journey' : (state.cvType === 'master' ? 'master' : 'standalone')}
        cvId={state.cvId}
        coverLetterId={state.coverLetterId}
      />
    </div>
  );
}

