'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AlertCircle, Eye, Palette, X, FileText, Download, Target, Award, TrendingUp, AlertTriangle, CheckCircle2, Shield, Sparkles, BookOpen } from 'lucide-react';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { downloadAsPDF } from '@/lib/utils/download';
import { CVScoringService, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/services/cv-scoring-service';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';

export default function Step4Review() {
  const { state, setTemplate, dispatch } = useResumeEnhancer();
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showCoverLetterPreview, setShowCoverLetterPreview] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Calculate scores using the scoring service
  const scoreResult = useMemo(() => {
    return CVScoringService.getFullScoreResult(
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

  const handleDownload = async () => {
    if (!state.selectedTemplate) {
      alert('Please select a template before downloading');
      return;
    }

    setIsDownloading(true);
    try {
      const filename = `${state.cvTitle || 'CV'}.pdf`;

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
          paperSize: 'A4',
          orientation: 'portrait',
          jobTitle: state.jobData?.title || state.targetRole
        }
      );
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
    <div className="flex flex-col h-full">
      {/* Split View: Info Left, Preview Right */}
      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Left Panel - Info (50%) */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
          <div className="p-4">
            <h2 className="text-lg font-bold text-[color:var(--text-primary)] mb-1">
              Review Your Resume
            </h2>
            <p className="text-xs text-[color:var(--text-secondary)]">
              Take a final look before saving to your dashboard
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Primary Score Display */}
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-4 text-center shadow-sm shadow-black/10 dark:shadow-black/30">
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${getScoreBgColor(primaryScore)} text-black font-bold text-2xl mb-2 shadow-lg`}>
                {primaryScore}%
              </div>
              <p className="text-sm font-medium text-[color:var(--text-primary)]">{primaryScoreLabel}</p>
              <p className="text-xs text-[color:var(--text-secondary)] mt-1">
                Grade: <span className={`font-bold ${getScoreColor(primaryScore)}`}>{scoreResult.overallGrade}</span>
              </p>

              {/* ATS Score Cap Warning for Journey CVs */}
              {isJourneyCV && state.atsScoreCap < 100 && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-yellow-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Template caps score at {state.atsScoreCap}%</span>
                </div>
              )}
            </div>

            {/* Score Breakdown */}
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-[var(--accent-primary)]" />
                <p className="text-xs font-medium text-[color:var(--text-primary)]">Score Breakdown</p>
              </div>

              {isJourneyCV && scoreResult.atsScore ? (
                // ATS Score Breakdown for Journey CVs
                <div className="space-y-2">
                  <ScoreBar label="Keyword Match" value={scoreResult.atsScore.keywordMatch} max={40} />
                  <ScoreBar label="Experience Fit" value={scoreResult.atsScore.experienceAlign} max={25} />
                  <ScoreBar label="Skills Coverage" value={scoreResult.atsScore.skillsCoverage} max={20} />
                  <ScoreBar label="Template ATS" value={scoreResult.atsScore.parseability} max={15} />
                </div>
              ) : (
                // CV Score Breakdown for Master/Standalone
                <div className="space-y-2">
                  <ScoreBar label="Completeness" value={scoreResult.cvScore.completeness} max={25} />
                  <ScoreBar label="Impact Verbs" value={scoreResult.cvScore.impactVerbs} max={20} />
                  <ScoreBar label="Quantification" value={scoreResult.cvScore.quantification} max={20} />
                  <ScoreBar label="Formatting" value={scoreResult.cvScore.formatting} max={15} />
                  <ScoreBar label="Readability" value={scoreResult.cvScore.readability} max={20} />
                </div>
              )}
            </div>

            {/* Recommendations */}
            {scoreResult.recommendations.length > 0 && (
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                  <p className="text-xs font-medium text-[color:var(--text-primary)]">Recommendations</p>
                </div>
                <ul className="space-y-1">
                  {scoreResult.recommendations.slice(0, 3).map((rec, i) => (
                    <li key={i} className="text-xs text-[color:var(--text-secondary)] flex items-start gap-2">
                      <span className="text-[var(--accent-primary)]">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            {/* CV Info */}
            <div className="space-y-3">
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-1">CV Type</p>
                    <p className="font-semibold text-[color:var(--text-primary)] capitalize text-sm flex items-center gap-1">
                      {state.cvType === 'master' && <Award className="w-3 h-3 text-[var(--accent-primary)]" />}
                      {state.cvType === 'journey' && <Target className="w-3 h-3 text-blue-500" />}
                      {state.cvType}
                    </p>
                  </div>
                  {state.cvType === 'journey' && state.jobData && (
                    <div className="text-right">
                      <p className="text-xs text-[color:var(--text-tertiary)]">For</p>
                      <p className="text-xs font-medium text-[color:var(--text-primary)]">
                        {state.jobData.title || state.jobData.jobTitle || 'Job'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[color:var(--text-tertiary)] mb-1">Template</p>
                    <p className="font-semibold text-[color:var(--text-primary)] text-sm">
                      {state.selectedTemplate?.name || 'None'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-1.5 bg-[var(--bg-primary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-lg text-xs font-medium transition-all flex items-center space-x-1.5 hover:scale-105 shadow-sm shadow-black/10 dark:shadow-black/30"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Change</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cover Letter Section */}
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3 shadow-sm shadow-black/10 dark:shadow-black/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--accent-primary)]" />
                  <p className="text-xs font-medium text-[color:var(--text-primary)]">Cover Letter</p>
                </div>
                {state.autoGeneratedCoverLetter && (
                  <span className="text-xs text-green-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Generated
                  </span>
                )}
              </div>

              {/* Cover Letter Preview */}
              {state.autoGeneratedCoverLetter && (
                <div className="mb-2 p-2 bg-[var(--bg-primary)] rounded text-xs text-[color:var(--text-secondary)] max-h-20 overflow-hidden relative">
                  <p className="line-clamp-3">{state.autoGeneratedCoverLetter.substring(0, 200)}...</p>
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-[var(--bg-primary)] to-transparent" />
                </div>
              )}

              <button
                onClick={handleEditCoverLetter}
                className="w-full px-4 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-black rounded-lg font-semibold transition-all flex items-center justify-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {state.autoGeneratedCoverLetter
                    ? 'Edit Cover Letter'
                    : state.cvType === 'journey'
                      ? 'Generate Cover Letter'
                      : 'Create Cover Letter'
                  }
                </span>
              </button>
            </div>

            {/* Download Button */}
            <div className="mt-3">
              <button
                onClick={() => setShowDownloadModal(true)}
                disabled={!state.selectedTemplate}
                className="w-full px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--hover-bg)] text-[color:var(--text-primary)] rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-sm shadow-black/10 dark:shadow-black/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>Download CV</span>
              </button>
            </div>

            {/* Save to Tracker Button for Journey CVs */}
            {isJourneyCV && (
              <div className="mt-2">
                <button
                  onClick={() => router.push('/dashboard/tracker')}
                  className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Target className="w-4 h-4" />
                  <span>View in Job Tracker</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Preview (50%) */}
        <div className="w-1/2 flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden shadow-sm shadow-black/10 dark:shadow-black/30">
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
          <div className="flex-1 overflow-y-auto p-4" ref={previewRef}>
            {state.selectedTemplate ? (
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
              />
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
          if (documentType === 'cv' && format === 'pdf') {
            await handleDownload();
          }
          setShowDownloadModal(false);
        }}
        hasCV={true}
        hasCoverLetter={!!state.autoGeneratedCoverLetter}
        isDownloading={isDownloading}
        cvId={state.cvId}
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

