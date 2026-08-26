// @ts-nocheck
'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { AlertCircle, Eye, Palette, X, FileText, Download, Target, Award, TrendingUp, AlertTriangle, CheckCircle2, Shield, Sparkles, BookOpen, ChevronRight, Zap, Briefcase, Edit2, LayoutTemplate, Calendar, PenTool, ZoomIn, ZoomOut } from 'lucide-react';
import CVPreviewDocument from '@/components/cv-preview/CVPreviewDocument';
import { ITemplate } from '@/types/template';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { CentralScoreManager, type CVScoreBreakdown, type ATSScoreBreakdown } from '@/lib/pill-engine/CentralScoreManager';
import TemplateSelector from '@/components/resume-enhancer/TemplateSelector';
import DownloadModal, { DocumentType, FormatType } from '@/components/ui/DownloadModal';
import DateFormatSelector from '@/components/resume-enhancer/DateFormatSelector';
import { getDefaultPaperSize } from '@/lib/services/paperSizeService';
import type { DateFormatStyle } from '@/lib/utils/textFormatting';
import { usePaymentModal } from '@/contexts/PaymentModalContext';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import ScoreBreakdown from '@/components/ui/ScoreBreakdown';
import { useUserData } from '@/lib/hooks/useUserData';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from 'next-auth/react';
import { downloadCanvasAsPDF } from '@/lib/utils/downloadCanvas';
import AuthPromptModal from '../AuthPromptModal';
import toast from 'react-hot-toast';
import {
  COVER_LETTER_TEMPLATES,
  getCoverLetterTemplateIdForCV,
} from '@/lib/templates/cover-letter-templates';
import { getPageDimensions } from '@/lib/templates/page-dimensions';

function getAtsScannedText(cvData: any): string {
  if (!cvData) return 'No resume data found.';
  const lines: string[] = [];

  // System status header
  lines.push('>> INITIALIZING PARSER ENGINE...');
  lines.push('>> EXTRACTING PLAIN TEXT STRINGS (IMAGES/STYLES RETRENCHED)...');
  lines.push(`>> SYSTEM TIME: ${new Date().toISOString()}`);
  lines.push('================================================================');
  lines.push('');

  // Basics
  if (cvData.basics) {
    lines.push('[BASICS]');
    if (cvData.basics.name) lines.push(`NAME: ${cvData.basics.name}`);
    if (cvData.basics.label) lines.push(`ROLE_TITLE: ${cvData.basics.label}`);
    if (cvData.basics.email) lines.push(`EMAIL: ${cvData.basics.email}`);
    if (cvData.basics.phone) lines.push(`PHONE: ${cvData.basics.phone}`);
    if (cvData.basics.url) lines.push(`URL: ${cvData.basics.url}`);
    if (cvData.basics.location) {
      const loc = cvData.basics.location;
      const locStr = typeof loc === 'string' ? loc : [loc.city, loc.region, loc.countryCode].filter(Boolean).join(', ');
      if (locStr) lines.push(`LOCATION: ${locStr}`);
    }
    lines.push('');
    if (cvData.basics.summary) {
      lines.push('[SUMMARY]');
      lines.push(cvData.basics.summary);
      lines.push('');
    }
  }

  // Work
  if (cvData.work && Array.isArray(cvData.work) && cvData.work.length > 0) {
    lines.push('[WORK_EXPERIENCE]');
    cvData.work.forEach((w: any, idx: number) => {
      lines.push(`ENTRY #${idx + 1}`);
      if (w.company || w.name) lines.push(`COMPANY: ${w.company || w.name}`);
      if (w.position) lines.push(`POSITION: ${w.position}`);
      if (w.location) lines.push(`LOCATION: ${w.location}`);
      const dates = [w.startDate, w.endDate || 'Present'].filter(Boolean).join(' TO ');
      if (dates) lines.push(`DURATION: ${dates}`);
      if (w.summary) lines.push(`DESCRIPTION: ${w.summary}`);
      if (w.highlights && Array.isArray(w.highlights) && w.highlights.length > 0) {
        lines.push('HIGHLIGHTS:');
        w.highlights.forEach((h: string) => {
          if (h) lines.push(`  - ${h}`);
        });
      }
      lines.push('----------------------------------------------------------------');
    });
    lines.push('');
  }

  // Education
  if (cvData.education && Array.isArray(cvData.education) && cvData.education.length > 0) {
    lines.push('[EDUCATION]');
    cvData.education.forEach((edu: any, idx: number) => {
      lines.push(`ENTRY #${idx + 1}`);
      if (edu.institution) lines.push(`INSTITUTION: ${edu.institution}`);
      if (edu.studyType || edu.degree) lines.push(`DEGREE: ${edu.studyType || edu.degree}`);
      if (edu.area) lines.push(`FIELD_OF_STUDY: ${edu.area}`);
      const dates = [edu.startDate, edu.endDate].filter(Boolean).join(' TO ');
      if (dates) lines.push(`DURATION: ${dates}`);
      if (edu.description) lines.push(`DESCRIPTION: ${edu.description}`);
      lines.push('----------------------------------------------------------------');
    });
    lines.push('');
  }

  // Skills
  if (cvData.skills && Array.isArray(cvData.skills) && cvData.skills.length > 0) {
    lines.push('[SKILLS]');
    cvData.skills.forEach((s: any) => {
      const category = s.category || s.name || 'General';
      const keywords = s.skills || s.keywords || [];
      if (keywords.length > 0) {
        lines.push(`${category.toUpperCase()}: ${keywords.join(', ')}`);
      }
    });
    lines.push('');
  }

  // Projects
  if (cvData.projects && Array.isArray(cvData.projects) && cvData.projects.length > 0) {
    lines.push('[PROJECTS]');
    cvData.projects.forEach((proj: any, idx: number) => {
      lines.push(`PROJECT #${idx + 1}`);
      if (proj.name) lines.push(`TITLE: ${proj.name}`);
      if (proj.description) lines.push(`DESCRIPTION: ${proj.description}`);
      if (proj.highlights && Array.isArray(proj.highlights) && proj.highlights.length > 0) {
        lines.push('HIGHLIGHTS:');
        proj.highlights.forEach((h: string) => {
          if (h) lines.push(`  - ${h}`);
        });
      }
      lines.push('----------------------------------------------------------------');
    });
    lines.push('');
  }

  // Certifications
  if (cvData.certificates && Array.isArray(cvData.certificates) && cvData.certificates.length > 0) {
    lines.push('[CERTIFICATIONS]');
    cvData.certificates.forEach((cert: any) => {
      const certLine = [cert.name, cert.issuer, cert.date].filter(Boolean).join(' | ');
      lines.push(`- ${certLine}`);
    });
    lines.push('');
  }

  // Languages
  if (cvData.languages && Array.isArray(cvData.languages) && cvData.languages.length > 0) {
    lines.push('[LANGUAGES]');
    cvData.languages.forEach((lang: any) => {
      const langLine = [lang.language, lang.fluency].filter(Boolean).join(' | ');
      lines.push(`- ${langLine}`);
    });
    lines.push('');
  }

  lines.push('>> PARSING COMPLETE. ZERO ENCODING ERRORS.');
  return lines.join('\n');
}

interface JobDescriptionSegmentedProps {
  jobData: any;
  keywordGaps: any[];
}

const JobDescriptionSegmented = ({ jobData, keywordGaps }: JobDescriptionSegmentedProps) => {
  if (!jobData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full text-gray-400">
        <Briefcase className="w-12 h-12 mb-3" />
        <p className="font-bold text-gray-900 dark:text-white">No Job Description Available</p>
        <p className="text-sm">Link this CV to a job opportunity to view the details here.</p>
      </div>
    );
  }

  const jdText = jobData.description || jobData.jobDescription || jobData.jd || '';
  const paragraphs = jdText.split('\n\n').filter(Boolean);

  return (
    <div className="p-8 max-w-3xl mx-auto bg-white dark:bg-[#141810] min-h-[800px] shadow-sm rounded-xl border border-gray-100 dark:border-gray-800 text-left">
      <div className="border-b border-gray-100 dark:border-gray-800 pb-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-lime-500/10 dark:bg-lime-500/20 flex items-center justify-center text-lime-600 dark:text-lime-400 shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {jobData.title || jobData.jobTitle || 'Target Role'}
            </h1>
            <p className="text-lg font-bold text-lime-600 dark:text-lime-400 mt-1">
              {jobData.company || jobData.companyName || 'Company'}
            </p>
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-500 dark:text-gray-400">
              {jobData.location && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {jobData.location}
                </span>
              )}
              {jobData.type && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                  {jobData.type}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Target Skills Segment */}
      {keywordGaps && keywordGaps.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
            Target Job Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywordGaps.map((gap, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-250/50 dark:border-white/10 rounded-lg text-gray-700 dark:text-gray-300 font-semibold"
              >
                {gap.keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Segments of Job Description */}
      <div className="space-y-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
          Role Details
        </h3>
        {paragraphs.map((p: string, index: number) => {
          const isHeader = p.trim().startsWith('#') || (p.length < 50 && p.toUpperCase() === p && p.trim().endsWith(':'));
          if (isHeader) {
            return (
              <h4 key={index} className="text-base font-bold text-gray-900 dark:text-white mt-6 mb-2">
                {p.replace(/^#+\s*/, '')}
              </h4>
            );
          }

          if (p.includes('\n*') || p.includes('\n-')) {
            const listItems = p.split(/\n[-*]/).filter(Boolean);
            const firstItem = listItems[0];
            const bulletItems = listItems.slice(1);
            return (
              <div key={index} className="space-y-2">
                {firstItem && <p className="text-gray-750 dark:text-gray-300 leading-relaxed text-sm">{firstItem}</p>}
                <ul className="list-disc pl-5 space-y-1.5 text-gray-750 dark:text-gray-300 text-sm">
                  {bulletItems.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">{item.trim()}</li>
                  ))}
                </ul>
              </div>
            );
          }

          return (
            <p key={index} className="text-gray-750 dark:text-gray-300 leading-relaxed text-sm whitespace-pre-line">
              {p}
            </p>
          );
        })}
      </div>
    </div>
  );
};

export default function Step5Review({ onSave }: { onSave?: () => Promise<void> }) {
  const { state, setTemplate, dispatch, goToStep } = useResumeEnhancer();
  const router = useRouter();
  const { openPaymentModal } = usePaymentModal();
  const { data: session } = useSession();
  const { userData } = useUserData();
  const [zoom, setZoom] = useState(0.5); // Will be recalculated on mount
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover' | 'jd'>('resume');
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [isAtsViewActive, setIsAtsViewActive] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedPaperSize = state.paperSize === 'Letter' ? 'Letter' : 'A4';
  const paperWidth = getPageDimensions(resolvedPaperSize).widthPx;
  const paperHeight = getPageDimensions(resolvedPaperSize).heightPx;

  const missingSkills = useMemo(() => {
    if (state.keywordGaps) {
      return state.keywordGaps.slice(0, 4).map((g: any) => g.keyword);
    }
    return [];
  }, [state.keywordGaps]);

  // Derived lists for dynamic Left Panel metrics
  const matchedSkills = useMemo(() => {
    if (state.cvData?.skills && Array.isArray(state.cvData.skills)) {
      // Flatten all skills inside each category
      const allSkills = state.cvData.skills.flatMap((s: any) => {
        if (typeof s === 'string') return s;
        if (s && Array.isArray(s.skills)) return s.skills;
        if (s && Array.isArray(s.keywords)) return s.keywords;
        return [];
      }).filter(Boolean);
      
      const missingSet = new Set(missingSkills.map(m => m.toLowerCase()));
      const matched = allSkills.filter(skill => !missingSet.has(skill.toLowerCase()));
      
      return matched.length > 0 ? matched.slice(0, 5) : allSkills.slice(0, 5);
    }
    return [];
  }, [state.cvData?.skills, missingSkills]);

  const handleShareLink = () => {
    const shareUrl = `${window.location.origin}/share/${state.cvId || 'draft'}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard!');
  };

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
      const padding = 40; // 20px on each side
      const availableWidth = containerWidth - padding;
      const calculatedZoom = Math.min(0.9, Math.max(0.4, availableWidth / paperWidth));
      // Round to nearest 0.01 to keep percentage values as integers in the UI
      setZoom(Math.round(calculatedZoom * 100) / 100);
    };

    calculateFitZoom();
    window.addEventListener('resize', calculateFitZoom);
    return () => window.removeEventListener('resize', calculateFitZoom);
  }, [paperWidth]);

  // Handle Ctrl/Cmd + Wheel to zoom the canvas area specifically, not the window
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let accumulatedDelta = 0;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        
        accumulatedDelta += -e.deltaY;

        if (Math.abs(accumulatedDelta) >= 50) {
          const direction = Math.sign(accumulatedDelta);
          setZoom((prev: number) => {
            // Jump by 0.1 (10 points in decimal scale)
            const next = prev + (direction * 0.1);
            // Snap to nearest 0.1 for clean values
            const snapped = Math.round(next * 10) / 10;
            return Math.min(1.5, Math.max(0.4, snapped));
          });
          accumulatedDelta = 0;
        }
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Resolve the cover-letter visual style from the CV template (falling back to
  // the first CL template). Previously this was hardcoded to
  // COVER_LETTER_TEMPLATES[0], so the review preview always rendered "Zurich
  // Minimalist" regardless of the user's chosen CV/cover-letter style.
  const resolvedCoverLetterTemplate = useMemo(() => {
    const cvId =
      state.selectedTemplate?.id ||
      (state.selectedTemplate as any)?._id ||
      state.cvData?.metadata?.canvasTemplate?.id;
    const clId = getCoverLetterTemplateIdForCV(cvId);
    return COVER_LETTER_TEMPLATES.find(t => t.id === clId) || COVER_LETTER_TEMPLATES[0];
  }, [state.selectedTemplate, state.cvData?.metadata?.canvasTemplate]);
  const hasLinkedCoverLetter = Boolean(
    state.autoGeneratedCoverLetter?.trim() ||
    state.coverLetterId ||
    coverLetterData?.content
  );
  const coverLetterTooltip = state.cvType === 'journey'
    ? 'Link or generate a cover letter before opening this preview.'
    : 'This CV does not have a linked cover letter yet.';
  const exportInfo = (state.selectedTemplate || state.cvData?.metadata?.canvasTemplate)
    ? 'Downloads use the current review content, selected template, and paper size.'
    : 'Select a template first so the preview and exported file stay aligned.';

  useEffect(() => {
    const fetchCoverLetterData = async () => {
      if (activeTab === 'cover' && state.coverLetterId && !coverLetterData) {
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
  }, [activeTab, state.coverLetterId, coverLetterData]);

  useEffect(() => {
    if (!hasLinkedCoverLetter && activeTab === 'cover') {
      setActiveTab('resume');
    }
  }, [hasLinkedCoverLetter, activeTab]);

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
              console.log('🔄 Step5Review - Auto-generating missing cover letter...');

              // We need userId for the request - assuming it's available in context or params, 
              // but Step5Review doesn't usually have userId prop explicitly passed in all usages or it uses session.
              // However, the `auto-generate` endpoint expects userId in body.
              // We'll try to get it from state.cvData.userId if available or skipped?
              // `Step5Review` might not have userId readily available in `state`.
              // We can rely on server session, but `route.ts` expects explicit userId in body.
              // Let's check props. Step5Review doesn't receive Props in the export default function Step5Review() line 19.
              // Ah, ResumeEnhancerContext might have it? `state` has `cvData`.
              // `state.cvData.userId` might be there? UnifiedSchema doesn't always have root userId.
              // Wait, the new `Step5Review` file content I viewed has `userId`? No, line 19 is `export default function Step5Review()`.
              // But line 440 of `CoverLetterEditorContainer` passes `userId`. That's different file.
              // `NotificationCenter` metadata says `Step5Review.tsx` active? No.

              // Let's assume we can get userId from the API session implicitly if we update API to use session. 
              // BUT my new API expects `userId` in body.
              // If I cannot get userId here easily, this is a blocker for "backend auto" from Client.
              // Wait, `journey.userId` likely exists in the response I just got!
              const journeyUserId = journey?.userId;

              if (journeyUserId) {
                const genResponse = await fetch('/api/ai/cover-letter-generate', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    mode: 'auto',
                    userId: journeyUserId,
                    journeyId: state.journeyId,
                    cvId: state.cvId, // or journey.cvId
                    jobId: state.jobData?.id || state.jobData?._id // or journey.jobId
                  })
                });

                if (genResponse.ok) {
                  const genResult = await genResponse.json();
                  if (genResult.success && genResult.coverLetterId) {
                    console.log('✅ Step5Review - Auto-generated cover letter:', genResult.coverLetterId);
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
  const primaryScore = state.scoreReport?.overall_score !== undefined
    ? state.scoreReport.overall_score
    : (isJourneyCV && scoreResult.atsScore
      ? scoreResult.atsScore.total
      : scoreResult.cvScore.total);
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

  const handleDownload = async (docType: 'cv' | 'coverLetter' | 'all' = 'cv', format: 'pdf' | 'docx' = 'pdf') => {
    if (!session || !session.user) {
      setShowAuthPrompt(true);
      return;
    }

    if (docType === 'cv' && !state.selectedTemplate && !state.cvData?.metadata?.canvasTemplate) {
      alert('Please select a template before downloading');
      return;
    }

    const proceedDownload = async () => {
      setIsDownloading(true);
      try {
        if (onSave) {
          await onSave();
        }
        const baseName = state.cvTitle || state.jobData?.title || state.targetRole || 'CV';

        if (docType === 'cv') {
          if (format === 'pdf') {
            // ── WYSIWYG PDF: capture the live canvas preview from the right panel ───
            await downloadCanvasAsPDF(`${baseName}.pdf`, {
              paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
            });
          } else {
            // DOCX: server-side export generates a content-faithful Word doc
            const userId = session?.user?.id;
            if (!userId) throw new Error('You must be signed in to download this CV.');

            const response = await fetch('/api/cv/export', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                cvData: state.cvData,
                template: state.selectedTemplate || state.cvData?.metadata?.canvasTemplate,
                format: 'docx',
                userId,
                cvId: state.cvId,
                jobId: state.jobData?._id || state.jobData?.id || state.journeyId,
                paperSize: state.paperSize === 'Letter' ? 'Letter' : 'A4',
                orientation: 'portrait',
                filename: baseName,
              }),
            });
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.error || `Download failed with status ${response.status}`);
            }
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${baseName}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
          }
        } else if (docType === 'coverLetter') {
          const clId = state.coverLetterId || (coverLetterData?.id || coverLetterData?._id);

          if (format === 'pdf') {
            // ── WYSIWYG cover-letter PDF: capture the live review preview ──
            // So the exported file is a pixel-perfect match of what the user
            // sees (the old server jsPDF renderer reflowed content and could
            // not match templates). Falls back to the server renderer when the
            // preview DOM isn't currently mounted (e.g. on another tab).
            const previewEl = document.querySelector('[data-cl-document]') as HTMLElement | null;
            if (previewEl) {
              await downloadCanvasAsPDF(`${baseName}_CoverLetter.pdf`, {
                element: previewEl,
                paperSize: resolvedPaperSize,
              });
            } else {
              if (!clId) throw new Error('No cover letter ID available.');
              const queryParams = new URLSearchParams({
                format,
                paperSize: resolvedPaperSize,
                orientation: 'portrait',
                jobTitle: state.jobData?.title || state.targetRole || ''
              });
              const link = document.createElement('a');
              link.href = `/api/cover-letters/${clId}/download?${queryParams.toString()}`;
              link.download = `${baseName}_CoverLetter.${format}`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          } else {
            if (!clId) throw new Error('No cover letter ID available.');
            const queryParams = new URLSearchParams({
              format,
              paperSize: resolvedPaperSize,
              orientation: 'portrait',
              jobTitle: state.jobData?.title || state.targetRole || ''
            });
            const link = document.createElement('a');
            link.href = `/api/cover-letters/${clId}/download?${queryParams.toString()}`;
            link.download = `${baseName}_CoverLetter.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        } else if (docType === 'all') {
          toast.loading('Preparing CV...', { id: 'package-download' });
          
          await downloadCanvasAsPDF(`${baseName}.pdf`, {
            paperSize: (state.paperSize as 'A4' | 'Letter') || 'A4',
          });

          if (hasLinkedCoverLetter) {
            toast.loading('Preparing Cover Letter...', { id: 'package-download' });
            await new Promise(resolve => setTimeout(resolve, 1000));

            // WYSIWYG when the review preview is mounted; server fallback otherwise.
            const previewEl = document.querySelector('[data-cl-document]') as HTMLElement | null;
            if (previewEl) {
              await downloadCanvasAsPDF(`${baseName}_CoverLetter.pdf`, {
                element: previewEl,
                paperSize: resolvedPaperSize,
              });
            } else {
              const clId = state.coverLetterId || (coverLetterData?.id || coverLetterData?._id);
              if (clId) {
                const queryParams = new URLSearchParams({
                  format: 'pdf',
                  paperSize: resolvedPaperSize,
                  orientation: 'portrait',
                  jobTitle: state.jobData?.title || state.targetRole || ''
                });
                const link = document.createElement('a');
                link.href = `/api/cover-letters/${clId}/download?${queryParams.toString()}`;
                link.download = `${baseName}_CoverLetter.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }
          }

          toast.success('All downloads triggered!', { id: 'package-download' });
        }
      } catch (error) {
        console.error('Download failed:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to download document.', { id: 'package-download' });
      } finally {
        setIsDownloading(false);
      }
    };

    // Check if this is a master CV and if we should trigger the paywall
    const isMasterCV = state.cvType === 'master';
    if (isMasterCV && (!userData || userData.currentPlanKey === 'free')) {
      openPaymentModal({
        preselectedPlanKey: 'focused_monthly',
        triggerContext: 'onboarding-exit',
        onSuccess: async () => {
          await proceedDownload();
        },
        onClose: async () => {
          try {
            await fetch('/api/user/subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ planKey: 'starter_monthly' })
            });
          } catch (err) {
            console.error('Failed to auto-assign starter plan on download close:', err);
          }
          await proceedDownload();
        }
      });
      return;
    }

    await proceedDownload();
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
    <div className="flex flex-col h-full flex-1 min-h-0 overflow-hidden bg-[#f3f2ee] dark:bg-[#0f140a]">
      {/* 3 Panels Layout: Left (Metrics/Recruiter), Center (Preview Canvas), Right (Actions/Next Steps) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden px-6 pt-3 pb-6 max-w-[1700px] mx-auto w-full">
        
        {/* LEFT PANEL - Scorecard & Recruiter Preview */}
        <div className="w-full lg:w-[280px] xl:w-[320px] lg:order-1 flex flex-col gap-5 overflow-y-auto scrollbar-hide shrink-0">
          
          {/* Target Match Card */}
          <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-left flex flex-col items-center">
            <div className="flex items-center gap-2 self-start mb-2">
              <Target className="w-5 h-5 text-lime-500" />
              <h3 className="font-black text-sm text-gray-900 dark:text-white">Target Match</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 self-start mb-4 truncate w-full">
              {state.jobData?.title || state.jobData?.jobTitle || state.targetRole || 'Target Role'} 
              {state.jobData?.company && ` at ${state.jobData.company}`}
            </p>
            
            {/* Radial Score Gauge */}
            <div className="relative w-32 h-32 mb-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-100 dark:text-gray-800" />
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none"
                  strokeDasharray={276.46} strokeDashoffset={276.46 - (276.46 * ((primaryScore || 0) / 100))}
                  className={`${getScoreColor(primaryScore)} transition-all duration-1000 ease-out`} strokeWidth="8" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center mt-2">
                <span className="text-4xl font-black text-gray-900 dark:text-white">{primaryScore || 0}%</span>
              </div>
            </div>
            
            <span className={`text-xs font-black uppercase tracking-wider mb-5 ${getScoreColor(primaryScore)}`}>
              {primaryScore >= 80 ? 'Strong Match' : primaryScore >= 60 ? 'Good Match' : 'Review Needed'}
            </span>

            {/* Matched Skills */}
            {matchedSkills.length > 0 && (
              <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4 mb-4 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Top Matched Skills</p>
                <div className="space-y-1.5">
                  {matchedSkills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-lime-500 shrink-0" />
                      <span className="truncate">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missing Opportunities */}
            {missingSkills.length > 0 && (
              <div className="w-full border-t border-gray-100 dark:border-gray-800 pt-4 text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Missing Opportunities</p>
                <div className="space-y-1.5">
                  {missingSkills.map((skill, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <AlertCircle className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span className="truncate">{skill}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recruiter Preview & Heatmap Toggle */}
          <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-lime-500" />
              <h3 className="font-black text-sm text-gray-900 dark:text-white">Recruiter Preview</h3>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-4">See how recruiters scan your resume</p>
            
            {/* Miniature Heatmap Thumbnail */}
            <div className="relative w-[130px] h-[175px] border border-gray-200 dark:border-gray-800 rounded bg-white dark:bg-[#141810]/50 overflow-hidden shadow-sm mx-auto mb-4 flex flex-col gap-2 p-2.5 select-none">
              {/* Mock text lines inside mini preview */}
              <div className="w-3/4 h-2 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="w-1/2 h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full" />
              <div className="w-full h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full mt-2" />
              <div className="w-5/6 h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full" />
              <div className="w-4/5 h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full" />
              <div className="w-3/4 h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full mt-2" />
              <div className="w-5/6 h-1.5 bg-gray-100 dark:bg-gray-900 rounded-full" />
              
              {/* Heatmap blur colors */}
              <div className="absolute inset-0 z-10 pointer-events-none opacity-85 blur-[12px] mix-blend-multiply flex flex-col items-center justify-around p-4">
                <div className="w-12 h-12 rounded-full bg-red-500/80" />
                <div className="w-16 h-8 rounded-full bg-yellow-400/70" />
                <div className="w-14 h-10 rounded-full bg-green-400/50" />
              </div>
            </div>

            <button
              onClick={() => {
                if (activeTab !== 'resume') {
                  setActiveTab('resume');
                }
                setIsHeatmapActive(!isHeatmapActive);
                setIsAtsViewActive(false);
              }}
              className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs border shadow-sm ${
                isHeatmapActive
                  ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                  : 'bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Eye className="w-4 h-4" />
              {isHeatmapActive ? 'Hide Heatmap' : 'View Heatmap'}
            </button>
          </div>

          {/* ATS View Card */}
          <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-left">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-emerald-500" />
              <h3 className="font-black text-sm text-gray-900 dark:text-white">ATS Scanned Text</h3>
            </div>
            <p className="text-[9px] text-gray-500 dark:text-gray-400 mb-4">View raw plain text parsed by ATS scanners</p>
            
            <button
              onClick={() => {
                if (activeTab !== 'resume') {
                  setActiveTab('resume');
                }
                setIsAtsViewActive(!isAtsViewActive);
                setIsHeatmapActive(false);
              }}
              className={`w-full py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-xs border shadow-sm ${
                isAtsViewActive
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold'
                  : 'bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {isAtsViewActive ? 'Hide ATS Text' : 'View ATS Text'}
            </button>
          </div>
        </div>

        {/* CENTER PANEL - Dynamic Preview Canvas */}
        <div ref={containerRef} className="flex-1 lg:order-3 flex flex-col min-h-0 bg-white dark:bg-[#141810] rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 relative">
          
          {/* Tab Selector Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                onClick={() => {
                  setActiveTab('resume');
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'resume'
                    ? 'bg-[#8bc34a] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <FileText className="w-4 h-4" />
                Resume
              </button>
              
              <button
                onClick={() => {
                  if (hasLinkedCoverLetter) {
                    setActiveTab('cover');
                    setIsHeatmapActive(false);
                  }
                }}
                disabled={!hasLinkedCoverLetter}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'cover' && hasLinkedCoverLetter
                    ? 'bg-[#8bc34a] text-white shadow-sm'
                    : hasLinkedCoverLetter
                      ? 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      : 'text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70'
                }`}
              >
                <PenTool className="w-4 h-4" />
                Cover Letter
              </button>

              <button
                onClick={() => {
                  setActiveTab('jd');
                  setIsHeatmapActive(false);
                }}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'jd'
                    ? 'bg-[#8bc34a] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                JD
              </button>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-400">
              {activeTab === 'resume' && (
                <span>Visual Style: {state.selectedTemplate?.name || state.cvData?.metadata?.canvasTemplate?.name || 'A4 Traditional'}</span>
              )}
              {activeTab === 'cover' && (
                <span>Standard Cover Letter</span>
              )}
              {activeTab === 'jd' && (
                <span>Job Description Text</span>
              )}
            </div>
          </div>
          
          {/* Main Preview Container */}
          <div className="flex-1 overflow-auto scrollbar-hide bg-[#f9fafb] dark:bg-[#0a0c08] relative" ref={previewRef}>
            {activeTab === 'cover' && hasLinkedCoverLetter ? (
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
                    template={resolvedCoverLetterTemplate}
                    pageSize={state.paperSize === 'Letter' ? 'Letter' : 'A4'}
                  />
                </div>
              </div>
            ) : activeTab === 'cover' ? (
              <div className="flex items-center justify-center min-h-full p-10">
                <div className="max-w-md rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-[#141810] px-6 py-8 text-center shadow-sm">
                  <FileText className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                    No linked cover letter
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Create or link a cover letter from the previous step to preview it here.
                  </p>
                  <button
                    onClick={handleEditCoverLetter}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#8bc34a] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#7cb342]"
                  >
                    <Edit2 className="w-4 h-4" />
                    Open Cover Letter Step
                  </button>
                </div>
              </div>
            ) : activeTab === 'jd' ? (
              <div className="w-full py-8 px-4 overflow-y-auto">
                <JobDescriptionSegmented jobData={state.jobData} keywordGaps={state.keywordGaps} />
              </div>
            ) : isAtsViewActive ? (
              <div className="w-full min-h-full p-8 flex justify-center bg-[#070905]">
                <div 
                  className="w-full bg-[#0a0f0d] border border-emerald-500/30 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] p-6 font-mono text-[#10b981] text-left text-xs leading-relaxed relative overflow-hidden max-w-4xl"
                  style={{ minHeight: '800px' }}
                >
                  {/* Cyberpunk matrix scanner grids */}
                  <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] pointer-events-none z-10" />
                  
                  {/* Top bar window header */}
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-red-500/70" />
                      <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <span className="w-3 h-3 rounded-full bg-green-500/70" />
                      <span className="text-[10px] text-emerald-500/60 font-bold uppercase tracking-widest ml-2">ATS-SCANNER-V4.2.0_READ_ONLY</span>
                    </div>
                    <span className="text-[10px] text-emerald-500/40 font-bold">RAW_ASCII_STREAM</span>
                  </div>

                  {/* Green glowing code text */}
                  <pre className="whitespace-pre-wrap selection:bg-emerald-500 selection:text-black">
                    {getAtsScannedText(state.cvData)}
                  </pre>
                </div>
              </div>
            ) : (state.selectedTemplate || state.cvData?.metadata?.canvasTemplate) ? (
              <div className="relative w-full h-full overflow-y-auto scrollbar-hide">
                <div className="w-full flex justify-center py-12" style={{ zoom }}>
                  <div
                    className="relative"
                    style={{ width: paperWidth }}
                  >
                    <CVPreviewDocument
                      cvData={state.cvData}
                      template={state.selectedTemplate || state.cvData?.metadata?.canvasTemplate}
                      theme={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'}
                    />

                    {/* Heatmap Overlay inside the zoomable container */}
                    {isHeatmapActive && (
                      <div className="absolute inset-0 z-30 pointer-events-none mix-blend-multiply opacity-80 select-none overflow-hidden rounded-sm">
                        {/* F-shape reading pattern heatmap spots */}
                        {/* Top Header - red/hot spot */}
                        <div 
                          className="absolute top-[8%] left-[10%] w-[80%] h-[8%] rounded-full bg-red-500 blur-[40px] opacity-80" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* Summary - yellow spot */}
                        <div 
                          className="absolute top-[16%] left-[12%] w-[70%] h-[6%] rounded-full bg-yellow-500 blur-[35px] opacity-70" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* First Job Title - red/hot spot */}
                        <div 
                          className="absolute top-[24%] left-[10%] w-[65%] h-[7%] rounded-full bg-red-500 blur-[38px] opacity-75" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* First Job Bullets - yellow spot */}
                        <div 
                          className="absolute top-[31%] left-[15%] w-[50%] h-[10%] rounded-full bg-yellow-400 blur-[35px] opacity-65" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* Education Header - green spot */}
                        <div 
                          className="absolute top-[48%] left-[10%] w-[75%] h-[6%] rounded-full bg-green-500 blur-[40px] opacity-60" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* Second Job - green/yellow spot */}
                        <div 
                          className="absolute top-[60%] left-[12%] w-[60%] h-[8%] rounded-full bg-yellow-500/60 blur-[35px] opacity-55" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                        {/* Skills Section - green spot */}
                        <div 
                          className="absolute top-[75%] left-[10%] w-[80%] h-[8%] rounded-full bg-green-400 blur-[40px] opacity-50" 
                          style={{ mixBlendMode: 'multiply' }}
                        />
                      </div>
                    )}
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

          {/* Floating Zoom Controls bottom-right */}
          <div className="absolute bottom-6 right-6 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur border border-gray-200 dark:border-gray-800 shadow-xl rounded-xl p-1.5 flex items-center gap-2 select-none pointer-events-auto">
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => setZoom(Math.max(0.4, zoom - 0.1))}
                disabled={zoom <= 0.4}
                className={`p-1.5 rounded-lg hover:bg-lime-500/20 transition-all ${zoom <= 0.4 ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <ZoomOut size={14} />
              </button>
              <input 
                type="range" 
                min="40" 
                max="150" 
                step="5"
                value={Math.round(zoom * 100)} 
                onChange={(e) => setZoom(parseInt(e.target.value) / 100)}
                className="w-20 accent-lime-500 h-1 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <button 
                onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}
                disabled={zoom >= 1.5}
                className={`p-1.5 rounded-lg hover:bg-lime-500/20 transition-all ${zoom >= 1.5 ? 'opacity-30 cursor-not-allowed' : 'text-gray-500 dark:text-gray-400'}`}
              >
                <ZoomIn size={14} />
              </button>
            </div>
            
            <button 
              onClick={() => setZoom(1.0)}
              className={`min-w-[42px] px-1.5 py-1 text-[9px] font-black rounded-md transition-all border ${Math.round(zoom * 100) === 100 ? 'bg-lime-500/20 border-lime-500/50 text-lime-600 dark:text-lime-400' : 'bg-transparent border-gray-200 dark:border-gray-700 hover:border-lime-500/50 text-gray-500 dark:text-gray-400'}`}
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>
        </div>

        {/* RIGHT PANEL - Next Steps & Finish */}
        <div className="w-full lg:w-[280px] xl:w-[340px] lg:order-2 flex flex-col gap-4 overflow-y-auto scrollbar-hide shrink-0">
          
          {/* View in Tracker */}
          {isJourneyCV && (
            <button
              onClick={() => router.push('/dashboard/jobs?tab=applications')}
              className="w-full p-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-2xl text-left font-bold transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] group flex items-center justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-black text-sm tracking-wide text-white">View in Tracker</p>
                  <p className="text-[11px] font-semibold text-blue-100 mt-0.5">See how your resume fits your target jobs</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-blue-200 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {/* Interview Coach */}
          {isJourneyCV && (
            <button
              onClick={handleStartCoaching}
              className="w-full p-5 bg-gradient-to-r from-purple-600 to-indigo-500 hover:from-purple-700 hover:to-indigo-600 text-white rounded-2xl text-left font-bold transition-all shadow-md shadow-purple-500/10 active:scale-[0.98] group flex items-center justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-yellow-300" />
                </div>
                <div>
                  <p className="font-black text-sm tracking-wide text-white">Interview Coach</p>
                  <p className="text-[11px] font-semibold text-purple-100 mt-0.5">Practice & get interview ready with AI</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-200 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          {/* Download Card */}
          <div className="bg-white dark:bg-[#141810] rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 text-left">
            <div className="flex items-start gap-3.5 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h4 className="font-black text-sm text-gray-900 dark:text-white">Download</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Export your documents individually or as a package</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {/* CV Tiles */}
              <div>
                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Resume / CV</h5>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => handleDownload('cv', 'pdf')}
                    disabled={isDownloading || (!state.selectedTemplate && !state.cvData?.metadata?.canvasTemplate)}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-xs text-gray-850 dark:text-gray-200 active:scale-95 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      PDF
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={() => handleDownload('cv', 'docx')}
                    disabled={isDownloading}
                    className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-xs text-gray-855 dark:text-gray-200 active:scale-95 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      DOCX
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Cover Letter Tiles (only if linked) */}
              {hasLinkedCoverLetter && (
                <div>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Cover Letter</h5>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => handleDownload('coverLetter', 'pdf')}
                      disabled={isDownloading}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-xs text-gray-850 dark:text-gray-200 active:scale-95 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        PDF
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    
                    <button
                      onClick={() => handleDownload('coverLetter', 'docx')}
                      disabled={isDownloading}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all font-bold text-xs text-gray-850 dark:text-gray-200 active:scale-95 disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        DOCX
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                  </div>
                </div>
              )}

              {/* Complete Package Button */}
              <button
                onClick={() => handleDownload('all', 'pdf')}
                disabled={isDownloading}
                className="w-full mt-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl font-black text-center shadow-md shadow-orange-500/10 hover:shadow-lg active:scale-95 transition-all text-xs flex items-center justify-center gap-2 select-none disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Download Complete Package</span>
              </button>
            </div>
          </div>

          {/* Share Link Card */}
          <button
            onClick={handleShareLink}
            className="w-full p-5 bg-white dark:bg-[#141810] border border-gray-150 dark:border-gray-800 rounded-2xl text-left font-bold transition-all shadow-sm hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.98] group flex items-center justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-lime-50 dark:bg-lime-900/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-lime-600 dark:text-lime-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className="font-black text-sm tracking-wide text-gray-900 dark:text-white">Share Link</p>
                <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">Get a shareable link to your resume</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Finish & Exit button */}
          <button
            onClick={async () => {
              const isFromOnboarding = typeof window !== 'undefined' && (
                sessionStorage.getItem('fromOnboarding') === 'true' || 
                sessionStorage.getItem('onboardingReturnUrl') !== null
              );

              // Guests who are NOT in onboarding must sign up before finishing
              if (!session && !isFromOnboarding) {
                setShowAuthPrompt(true);
                return;
              }

              setIsDownloading(true);
              try {
                if (onSave) {
                  await onSave();
                }

                if (isFromOnboarding) {
                  // Persist onboarding stage update
                  try {
                    await fetch('/api/user/onboarding', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        current_stage: 'CV_READY_FORK',
                        userLifecycleState: 'PRIMARY_CV_CREATED'
                      })
                    });
                  } catch (err) {
                    console.error('Failed to update onboarding session:', err);
                  }

                  try {
                    const saved = localStorage.getItem('buildairesume_onboarding_state');
                    if (saved) {
                      const parsed = JSON.parse(saved);
                      localStorage.setItem('buildairesume_onboarding_state', JSON.stringify({
                        ...parsed,
                        stage: 'CV_READY_FORK',
                        step: 4,
                        editorCompleted: true
                      }));
                    }
                  } catch (e) {
                    console.error('Failed to update local storage onboarding state:', e);
                  }

                  const returnUrl = (typeof window !== 'undefined' && sessionStorage.getItem('onboardingReturnUrl')) || '/welcome?stage=cv_ready';
                  router.push(returnUrl);
                  return;
                }

                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('masterCVCreated', 'true');
                }
                router.push('/editor');
              } catch (err) {
                console.error('Failed to save CV:', err);
                toast.error('Failed to save CV. Please try again.');
              } finally {
                setIsDownloading(false);
              }
            }}
            disabled={isDownloading}
            className="w-full py-4 bg-[#013f2e] hover:bg-[#02523c] text-black rounded-2xl font-black text-center shadow-md shadow-lime-500/10 hover:shadow-lg active:scale-95 transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-2 select-none"
          >
            <CheckCircle2 className="w-5 h-5 text-black" />
            <span>Finish &amp; Exit</span>
          </button>
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
          const docTypeMap: Record<DocumentType, 'cv' | 'coverLetter' | 'all'> = {
            'cv': 'cv',
            'coverLetter': 'coverLetter',
            'all': 'all'
          };
          await handleDownload(docTypeMap[documentType] || 'cv', format);
          setShowDownloadModal(false);
        }}
        onPaywallRequired={() => {
          openPaymentModal({
            preselectedPlanKey: 'focused_monthly',
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

      <AuthPromptModal
        isOpen={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        onContinueGuest={() => setShowAuthPrompt(false)}
        currentStep={5}
      />
    </div>
  );
}
