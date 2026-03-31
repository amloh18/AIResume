'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AlertCircle, Eye, Palette, X, FileText, Download, Target, Award, TrendingUp, AlertTriangle, CheckCircle2, Shield, Sparkles, BookOpen } from 'lucide-react';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { downloadAsPDF, downloadAsDOCX } from '@/lib/utils/download';
import { CentralScoreManager, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/pill-engine/CentralScoreManager';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';
import ScorecardPanel from '@/components/resume-enhancer/panels/ScorecardPanel';
import DateFormatSelector from '@/components/resume-enhancer/DateFormatSelector';
import { getDefaultPaperSize } from '@/lib/services/paperSizeService';
import type { DateFormatStyle } from '@/lib/utils/textFormatting';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

export default function Step4Review() {
  const { state, setTemplate, dispatch } = useResumeEnhancer();
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const [zoom, setZoom] = useState(0.5); // Will be recalculated on mount
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const params = new URLSearchParams();

    // If CV is a journey CV, use 'journey' mode (which will edit if cover letter exists, otherwise create)
    // If CV is standalone, use 'create' mode
    if (state.cvType === 'journey' && state.journeyId) {
      params.set('mode', 'journey');
      params.set('journeyId', state.journeyId);
      if (state.cvId) params.set('cvId', state.cvId);
      if (state.jobData?.id || state.jobData?._id) {
        params.set('jobId', state.jobData.id || state.jobData._id);
      }
    } else {
      // Standalone CV - create new cover letter
      params.set('mode', 'create');
      if (state.cvId) params.set('cvId', state.cvId);
    }

    router.push(`/cover-letter-editor?${params.toString()}`);
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
          previewElement = previewRef.current.querySelector('.cv-preview-container') as HTMLElement ||
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

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 overflow-hidden">
      {/* Split View: Preview Left, Info Right */}
      <div className="flex-1 flex gap-3 min-h-0 overflow-hidden pt-3 px-3">
        {/* Right Panel - Info (50%) */}
        <div className="w-1/2 flex flex-col min-h-0 bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
          <div className="p-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-1">
              Review Your Resume
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Take a final look before saving to your dashboard
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Scorecard Panel - replaces custom score cards */}
            <ScorecardPanel
              atsResult={null}
              scoreResult={scoreResult}
              cvType={state.cvType}
              isLoading={false}
              analysisMode={isJourneyCV ? 'jd-based' : 'role-based'}
              compact={false}
              scoreLabel={isJourneyCV ? 'ATS Score' : 'CV Score'}
            />

            {/* Keyword Gaps for Journey CVs */}
            {isJourneyCV && state.keywordGaps && state.keywordGaps.length > 0 && (
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-yellow-500" />
                  <p className="text-xs font-medium text-[color:var(--text-primary)]">
                    Missing Keywords ({state.keywordGaps.filter(g => g.importance === 'critical').length} critical)
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {state.keywordGaps.slice(0, 8).map((gap, i) => (
                    <span
                      key={i}
                      className={`text-xs px-2 py-0.5 rounded-full ${gap.importance === 'critical'
                        ? 'bg-red-500/20 text-red-400'
                        : gap.importance === 'preferred'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-gray-500/20 text-gray-400'
                        }`}
                    >
                      {gap.keyword}
                    </span>
                  ))}
                  {state.keywordGaps.length > 8 && (
                    <span className="text-xs text-[color:var(--text-tertiary)]">
                      +{state.keywordGaps.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cards Grid - 2x2 layout */}
            <div className="grid grid-cols-2 gap-3">
              {/* CV Type Card */}
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-1">CV Type</p>
                <p className="font-semibold text-[color:var(--text-primary)] capitalize text-sm flex items-center gap-1">
                  {state.cvType === 'master' && <Award className="w-3 h-3 text-[var(--accent-primary)]" />}
                  {state.cvType === 'journey' && <Target className="w-3 h-3 text-blue-500" />}
                  {state.cvType}
                </p>
                {state.cvType === 'journey' && state.jobData && (
                  <p className="text-xs text-[color:var(--text-secondary)] mt-1 truncate">
                    For: {state.jobData.title || state.jobData.jobTitle || 'Job'}
                  </p>
                )}
              </div>

              {/* Template Card */}
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Template</p>
                    <p className="font-semibold text-[color:var(--text-primary)] text-sm truncate">
                      {state.selectedTemplate?.name || 'None'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="mt-2 w-full px-2 py-1.5 bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-lg text-xs font-medium transition-all flex items-center justify-center space-x-1.5 hover:scale-105 shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  <Palette className="w-3 h-3" />
                  <span>Change</span>
                </button>
              </div>

              {/* Date Format Card */}
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <p className="text-xs text-[color:var(--text-tertiary)] mb-2">Date Format</p>
                <DateFormatSelector
                  value={state.dateFormat}
                  onChange={(format) => dispatch({ type: 'SET_DATE_FORMAT', payload: format })}
                />
              </div>

              {/* Cover Letter Card */}
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[var(--accent-primary)]" />
                    <p className="text-xs font-medium text-[color:var(--text-primary)]">Cover Letter</p>
                  </div>
                  {(state.autoGeneratedCoverLetter || (state.cvType === 'journey' && state.coverLetterId)) && (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  )}
                </div>
                <button
                  onClick={handleEditCoverLetter}
                  className="w-full px-2 py-1.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-lg font-semibold transition-all flex items-center justify-center gap-1 text-xs"
                >
                  <FileText className="w-3 h-3" />
                  <span>
                    {state.autoGeneratedCoverLetter || (state.cvType === 'journey' && state.coverLetterId)
                      ? 'Edit'
                      : state.cvType === 'journey'
                        ? 'Generate'
                        : 'Create'
                    }
                  </span>
                </button>
              </div>

              {/* Download CV Card */}
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30 flex flex-col justify-between">
                <div>
                  <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Export</p>
                  <p className="font-semibold text-[color:var(--text-primary)] text-sm">Download</p>
                </div>
                <button
                  onClick={() => setShowDownloadModal(true)}
                  disabled={!state.selectedTemplate}
                  className="mt-2 w-full px-2 py-1.5 bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-lg font-medium transition-all flex items-center justify-center gap-1 text-xs shadow-sm shadow-black/10 dark:shadow-black/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>

              {/* View in Job Tracker - only for Journey CVs */}
              {isJourneyCV && (
                <div className="col-span-2 bg-blue-600/10 border border-blue-500/20 rounded-lg p-3 shadow-sm">
                  <button
                    onClick={() => router.push('/dashboard/tracker')}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm"
                  >
                    <Target className="w-4 h-4" />
                    <span>View in Job Tracker</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Left Panel - Preview (50%) */}
        <div ref={containerRef} className="w-1/2 flex flex-col min-h-0 bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
          {/* Preview Header with Controls */}
          <div className="p-3 bg-[var(--bg-secondary)] flex items-center justify-between">
            <h3 className="text-base font-bold text-[color:var(--text-primary)]">Preview</h3>
            <div className="flex items-center space-x-3">
              <div className="h-6 w-px bg-black/10 dark:bg-white/10" />
              <div className="flex items-center space-x-2 text-xs text-[color:var(--text-secondary)]">
                <Eye className="w-3.5 h-3.5" />
                <span>Zoom: {Math.round(zoom * 100)}%</span>
              </div>
              <div className="flex space-x-1">
                <button
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                  className="px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  -
                </button>
                <button
                  onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                  className="px-2 py-1 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded text-xs shadow-sm shadow-black/10 dark:shadow-black/30"
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto" ref={previewRef}>
            {state.selectedTemplate ? (
              <div
                style={{
                  // PREVIEW ZOOM: This transform is for UI preview only
                  // It does NOT affect PDF/DOCX export which uses fixed viewport (794px for A4, 816px for Letter)
                  // Export services render at 100% scale with exact viewport matching @page CSS dimensions
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.2s ease-out',
                  width: 'fit-content',
                  margin: '0 auto'
                }}
              >
                <CVPreviewContent
                  cvData={state.cvData}
                  templateName={state.selectedTemplate.name}
                  templateStyles={{
                    primaryColor: state.selectedTemplate.globalStyles?.primaryColor,
                    secondaryColor: state.selectedTemplate.globalStyles?.secondaryColor,
                    backgroundColor: state.selectedTemplate.globalStyles?.backgroundColor,
                    fontFamily: state.selectedTemplate.globalStyles?.fontFamily,
                    fontSize: state.selectedTemplate.globalStyles?.fontSize,
                    lineHeight: state.selectedTemplate.globalStyles?.lineHeight,
                  }}
                  customCSS={state.selectedTemplate.globalStyles?.customCSS}
                  jobData={state.jobData}
                  currentZoom={zoom}
                  dateFormat={state.dateFormat}
                  pageFormat={state.paperSize === 'Letter' ? 'letter' : 'a4'}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-[color:var(--text-tertiary)] mx-auto mb-3" />
                  <p className="text-sm text-[color:var(--text-secondary)]">
                    No template selected. Please go back and select a template.
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
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <h2 className="text-xl font-bold text-[color:var(--text-primary)]">
                  Select Template
                </h2>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-[color:var(--text-primary)]" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <TemplateSelector
                  selectedTemplate={state.selectedTemplate}
                  onTemplateSelect={handleTemplateSelect}
                  cvData={state.cvData}
                />
              </div>
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

/**
 * Score bar component for breakdown display
 */
function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100;

  const getBarColor = (pct: number): string => {
    if (pct >= 80) return 'bg-green-500';
    if (pct >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[color:var(--text-tertiary)] w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={`h-full rounded-full ${getBarColor(percentage)}`}
        />
      </div>
      <span className="text-xs text-[color:var(--text-secondary)] w-10 text-right">
        {value}/{max}
      </span>
    </div>
  );
}

