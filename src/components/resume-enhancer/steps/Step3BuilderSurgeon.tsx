'use client';

import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import {
  Sparkles,
  Component, Eye, Target, ZoomIn, ZoomOut, PanelRightOpen, PanelRightClose
} from 'lucide-react';

// Import CV Builder form components

import RoleProfilerModal from '@/components/resume-enhancer/RoleProfilerModal';
import SurgeonReportModal from '@/components/resume-enhancer/SurgeonReportModal';
import FieldFixOverlay from '@/components/resume-enhancer/annotations/FieldFixOverlay';
import CVPreviewContent, { ViewMode } from '@/components/cv-preview/CVPreviewContent';
import JobParserDialog from '@/components/dashboard/jobs/JobParserDialog';
import type { FixAnnotation } from '@/components/resume-enhancer/annotations/fix-annotation';
import { AnimatedScore } from '@/components/ui/AnimatedScore';
import { useATS } from '@/contexts/ATSContext';

// CV Surgeon service
import { CVSurgeonService, SurgicalFix } from '@/lib/services/cv-surgeon-service';
import { logResumeEnhancerEvent } from '@/lib/services/resumeEnhancerLogClient';
import { inferRoleContextFromCVData } from '@/lib/utils/resumeEnhancerRoleInference';
import AnalysisModeBadge from '@/components/resume-enhancer/components/AnalysisModeBadge';
import toast from 'react-hot-toast';
import { getAnalysisModeWithValidation } from '@/lib/utils/analysis-mode';
import { ScorecardPanel, KeywordMatchPanel, type ATSResult } from '@/components/resume-enhancer/panels';
import FloatingFormEditor from '@/components/resume-enhancer/FloatingFormEditor';
import FloatingPulsePill from '@/components/resume-enhancer/FloatingPulsePill';

interface Step3BuilderSurgeonProps {
  onComplete: () => void;
  onActiveSectionChange?: (sectionId: string) => void;
}

export interface Step3BuilderSurgeonRef {
  scrollToSection: (sectionId: string) => void;
  handleAddSection: () => void;
  addNewSection: (sectionId: string) => void;
  handleDeleteSectionFromSidebar: (sectionId: string) => void;
  handleSectionReorder: (sectionIds: string[]) => void;
  activeSection: string;
}



const Step3BuilderSurgeon = forwardRef<Step3BuilderSurgeonRef, Step3BuilderSurgeonProps>(
  ({ onComplete, onActiveSectionChange }, ref) => {
    const { state, dispatch, convertToJourney, loadCV, getAnalysisModeInfo } = useResumeEnhancer();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [jdText, setJdText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showRoleProfiler, setShowRoleProfiler] = useState(false);
    const [showJobParserDialog, setShowJobParserDialog] = useState(false);
    const [totalPages, setTotalPages] = useState(1); // Added totalPages state

    const cvPreviewRef = useRef<HTMLDivElement>(null);

    // Floating Editor State
    const [activeEditorSectionId, setActiveEditorSectionId] = useState<string | null>(null);
    const [editorPosition, setEditorPosition] = useState<{ top: number; left: number; height: number; alignment: 'left' | 'right' } | null>(null);

    // Layout Controls State
    const [showRightPanel, setShowRightPanel] = useState(true);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [viewMode, setViewMode] = useState<ViewMode>('engineer'); // New View Mode State

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));

    const handleSectionClick = (sectionId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();

      const viewportWidth = window.innerWidth;
      const editorWidth = 480; // Approximate width of editor
      const gap = 24;
      const sidebarWidth = showRightPanel ? 400 : 0; // Update with new sidebar width

      // Default to right side
      let left = rect.right + gap;
      let alignment: 'left' | 'right' = 'left'; // "left" alignment means content originates/aligns to left

      // Check if right side has space
      if (left + editorWidth > viewportWidth - 20) {
        // Not enough space on right, try left
        left = rect.left - editorWidth - gap;
        alignment = 'right';

        // If also not enough space on left (mobile/tablet), center it or cap it?
        // For now, if no space on left, we might fall back to centered overlay style (handled by Editor if position is null?)
        // Or specific mobile logic. 
      }

      setEditorPosition({
        top: rect.top,
        left: left,
        height: rect.height,
        alignment
      });
      setActiveEditorSectionId(sectionId);
    };

    // ATS Context for scores
    const { atsScore, atsAnalysis, isATSLoading, refreshATSScore } = useATS();

    // Journey CVs use job description for analysis - don't require targetRole/seniorityLevel
    // Only standalone/master CVs need targetRole/seniorityLevel
    const isJourneyCV = state.cvType === 'journey' && (state.jobData || state.journeyId);
    const isRoleReady = isJourneyCV || Boolean(state.targetRole && state.seniorityLevel);

    // Get current analysis mode information
    const analysisModeInfo = React.useMemo(() => {
      return getAnalysisModeWithValidation(
        state.cvType,
        state.targetRole,
        state.seniorityLevel,
        jdText,
        state.jobData
      );
    }, [state.cvType, state.targetRole, state.seniorityLevel, jdText, state.jobData]);

    const activeAnnotation: FixAnnotation | undefined = state.activeFixId
      ? state.fixAnnotations.find((f) => f.id === state.activeFixId && f.status === 'open')
      : undefined;



    const applyAnnotation = (fix: FixAnnotation) => {
      const { updatedCV } = CVSurgeonService.applyFixAnnotation(state.cvData, fix);
      dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
      dispatch({ type: 'MARK_FIX_APPLIED', payload: fix.id });
      logResumeEnhancerEvent({
        action: 'resume_enhancer_fix_applied',
        resourceType: 'cv',
        resourceId: state.cvId,
        metadata: { fixId: fix.id, fieldPath: fix.fieldPath, category: fix.category, impactScoreDelta: fix.impactScoreDelta }
      });
      const next = state.fixAnnotations.find((f) => f.status === 'open' && f.id !== fix.id);
      dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
    };

    const dismissAnnotation = (fixId: string) => {
      dispatch({ type: 'MARK_FIX_DISMISSED', payload: fixId });
      logResumeEnhancerEvent({
        action: 'resume_enhancer_fix_dismissed',
        resourceType: 'cv',
        resourceId: state.cvId,
        metadata: { fixId }
      });
      const next = state.fixAnnotations.find((f) => f.status === 'open' && f.id !== fixId);
      dispatch({ type: 'SET_ACTIVE_FIX', payload: next?.id });
    };



    // Sync JD text with job data when it exists
    useEffect(() => {
      if (state.jobData) {
        const jobDescription =
          state.jobData.jobDescription ||
          state.jobData.description ||
          state.jobData.jd ||
          '';

        // Update jdText if jobData has a description and it's different from current jdText
        if (jobDescription && jobDescription !== jdText) {
          setJdText(jobDescription);
        }
      }
    }, [state.jobData, jdText]);

    // Update linked job description when JD text changes (debounced)
    useEffect(() => {
      // Only update if CV is linked to a journey and has a job
      if (!state.journeyId || !state.jobData?.id || !jdText.trim()) return;

      // Don't update on initial load - only when user edits
      const isInitialLoad = jdText === (state.jobData.jobDescription || state.jobData.description || '');
      if (isInitialLoad) return;

      // Debounce the update
      const timeoutId = setTimeout(async () => {
        try {
          const jobId = state.jobData.id || state.jobData._id;
          if (!jobId) return;

          const response = await fetch(`/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jobDescription: jdText
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to update job description:', errorData.error || 'Unknown error');
            return;
          }

          // Update local job data
          dispatch({
            type: 'SET_JOB_DATA',
            payload: {
              ...state.jobData,
              jobDescription: jdText,
              description: jdText
            }
          });

          console.log('✅ Job description updated successfully');
        } catch (error) {
          console.error('Error updating job description:', error);
        }
      }, 1000); // 1 second debounce

      return () => clearTimeout(timeoutId);
    }, [jdText, state.journeyId, state.jobData]);

    // Journey Validation Effect - Ensure job data integrity
    React.useEffect(() => {
      // If we have a journey CV but no JD, prompt user
      if (state.cvType === 'journey' && state.jobData && !jdText && !state.jobData.jobDescription) {
        setShowJobParserDialog(true);
      }
    }, [state.cvType, state.journeyId, state.jobData, jdText]);





    const handleRunAnalysis = async () => {
      if (!isRoleReady) {
        const inferred = inferRoleContextFromCVData(state.cvData);
        if (inferred.targetRole && inferred.seniorityLevel) {
          dispatch({
            type: 'SET_ROLE_CONTEXT',
            payload: { targetRole: inferred.targetRole, seniorityLevel: inferred.seniorityLevel }
          });
        } else {
          setShowRoleProfiler(true);
          return;
        }
      }

      setIsAnalyzing(true);
      dispatch({ type: 'SET_ANALYZING', payload: true });

      try {
        // For journey CVs, use job title and default seniority; for others use targetRole/seniorityLevel
        const roleForAnalysis = isJourneyCV ? (state.jobData?.jobTitle || state.jobData?.title || '') : state.targetRole;
        const seniorityForAnalysis = isJourneyCV ? 'professional' : state.seniorityLevel;

        // Use cache-aware analysis to avoid unnecessary AI token usage
        // Pass cvType to ensure master CVs get grammar/format fixes
        const result = await CVSurgeonService.analyzeCVWithCache(
          state.cvData,
          roleForAnalysis,
          seniorityForAnalysis,
          state.cvId,
          undefined, // userId will be passed from context if available
          state.jobData || (jdText ? { description: jdText } : undefined),
          undefined, // suppressedFixHashes
          state.cvType // Pass cvType for mode-specific analysis
        );

        dispatch({ type: 'SET_SURGEON_ANALYSIS', payload: { score: result.score, fixes: result.fixes } });
        dispatch({ type: 'SET_FIX_ANNOTATIONS', payload: result.annotations });

        logResumeEnhancerEvent({
          action: 'resume_enhancer_analysis_completed',
          resourceType: 'cv',
          resourceId: state.cvId,
          metadata: { score: result.score, fixesCount: result.fixes.length, cvType: state.cvType, cached: result.cached }
        });

        if (result.cached) {
          console.log('✅ Loaded cached analysis - no AI tokens used');
        }
      } catch (error) {
        console.error('CV Surgeon analysis failed:', error);
        alert('Failed to analyze CV. Please try again.');
      } finally {
        setIsAnalyzing(false);
        dispatch({ type: 'SET_ANALYZING', payload: false });

        // Trigger detailed ATS analysis if we have a CV ID
        // This ensures the ScorecardPanel has data (factor breakdown, etc.)
        if (state.cvId) {
          refreshATSScore(state.cvId, state.jobData?.id).catch((err: any) =>
            console.error('Failed to refresh ATS score:', err)
          );
        }
      }
    };



    const handleConvertToJourney = async (arg?: string | React.MouseEvent) => {
      const text = typeof arg === 'string' ? arg : jdText;
      if (!text.trim()) return;

      // EDGE CASE 1: Check Journey CV limit before conversion
      try {
        const limitCheckResponse = await fetch('/api/cvs/journey-limit-check');
        if (limitCheckResponse.ok) {
          const limitCheck = await limitCheckResponse.json();
          if (!limitCheck.allowed) {
            // Show limit modal or paywall
            alert(limitCheck.message || 'You have reached your Journey CV limit. Archive or delete an existing Journey CV to create a new one, or upgrade to Pro.');
            return;
          }
        }
      } catch (limitError) {
        console.error('Failed to check Journey CV limit:', limitError);
        // Continue anyway - API will enforce the limit
      }

      // Edge case: CV already linked to a job
      if (state.cvType === 'journey' && state.journeyId) {
        const confirmUpdate = confirm('This CV is already linked to a job. Do you want to update the existing job description instead?');
        if (confirmUpdate && state.jobData?.id) {
          // Update existing job description
          try {
            const jobId = state.jobData.id || state.jobData._id;
            const response = await fetch(`/api/jobs/${jobId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jobDescription: text
              })
            });

            if (response.ok) {
              dispatch({
                type: 'SET_JOB_DATA',
                payload: {
                  ...state.jobData,
                  jobDescription: text,
                  description: text
                }
              });
              alert('Job description updated successfully!');
            } else {
              throw new Error('Failed to update job description');
            }
          } catch (error) {
            console.error('Failed to update job:', error);
            alert('Failed to update job description. Please try again.');
          }
        }
        return;
      }

      // Edge case: Master CV - don't create job tracking
      // ALLOW conversion for Master CV as per new requirements
      // We will create a new Journey CV from this Master CV

      try {
        // Try to extract company name from JD
        let companyName = 'Unknown Company';

        // Common patterns: "at Company Name", "Company Name is", "Company Name seeks", etc.
        const companyPatterns = [
          /(?:at|with|from)\s+([A-Z][A-Za-z0-9\s&]+?)(?:\s+is|\s+seeks|\s+looking|\s+seeking|\.|$)/i,
          /^([A-Z][A-Za-z0-9\s&]+?)\s+(?:is|seeks|looking|seeking)/i,
          /company[:\s]+([A-Z][A-Za-z0-9\s&]+?)(?:\s|$)/i
        ];

        for (const pattern of companyPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            companyName = match[1].trim();
            // Limit company name length
            if (companyName.length > 100) {
              companyName = companyName.substring(0, 100);
            }
            break;
          }
        }

        // Create job application from JD
        const jobResponse = await fetch('/api/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jobTitle: state.targetRole || 'Software Engineer', // Fallback if no role
            company: companyName,
            jobDescription: text,
            status: 'created'
          })
        });

        if (!jobResponse.ok) {
          const errorData = await jobResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to create job');
        }

        const jobResult = await jobResponse.json();
        const jobId = jobResult.data.jobApplication._id;
        const journeyId = jobResult.data.journey._id;

        // If Master CV, we might want to CLONE it instead of converting?
        // But for now, assuming conversion in place is okay or API handles it.
        // Actually, requirement says "Convert to Journey" or "Create New".
        // If we "Convert", we change type.

        // Update CV with journeyId and cvType if CV exists
        if (state.cvId) {
          try {
            const cvUpdateResponse = await fetch(`/api/cvs/${state.cvId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                journeyId: journeyId,
                cvType: 'journey'
              })
            });

            if (!cvUpdateResponse.ok) {
              console.warn('Failed to update CV with journeyId, but job was created');
            }
          } catch (cvError) {
            console.error('Error updating CV:', cvError);
            // Don't fail the whole operation if CV update fails
          }
        }

        // Update context to journey type
        convertToJourney(journeyId, {
          description: text,
          title: state.targetRole,
          jobTitle: state.targetRole,
          company: companyName,
          id: jobId,
          _id: jobId
        });

        // Keep the URL in sync so refresh/share preserves journey context
        try {
          const params = new URLSearchParams(searchParams.toString());
          params.set('mode', 'journey');
          if (state.cvId) params.set('cvId', state.cvId);
          params.set('journeyId', journeyId);
          router.replace(`${pathname}?${params.toString()}`);
        } catch (urlError) {
          console.warn('Failed to update URL with journey details (non-critical):', urlError);
        }

        // Show success message
        alert(`Job tracking created! Now tracking: ${state.targetRole} at ${companyName}`);

        // If we provided a text override for Master CV, enable JD input show
        if (typeof arg === 'string') {
          setJdText(text);
          setShowJobParserDialog(true);
        }
      } catch (error) {
        console.error('Failed to convert to journey:', error);
        alert(`Failed to create journey: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };












    // Expose functions to parent via ref - Stubbed for removed builder functionality
    useImperativeHandle(ref, () => ({
      scrollToSection: (sectionId: string) => { console.log('scrollToSection not implemented in optimisation view', sectionId); },
      handleAddSection: () => { console.log('handleAddSection not implemented in optimisation view'); },
      addNewSection: (sectionId: string) => { console.log('addNewSection not implemented in optimisation view', sectionId); },
      handleDeleteSectionFromSidebar: (sectionId: string) => { console.log('handleDeleteSectionFromSidebar not implemented in optimisation view', sectionId); },
      handleSectionReorder: (sectionIds: string[]) => { console.log('handleSectionReorder not implemented in optimisation view', sectionIds); },
      activeSection: 'personal'
    }));



    return (
      <div className="flex flex-col h-[calc(100vh-64px)] min-h-0 relative overflow-hidden bg-gray-50 dark:bg-[#1a230f]">
        {/* View Mode Toggle Header - REMOVED per user request */}

        {/* Floating Control Pill */}
        <FloatingPulsePill
          atsResult={atsAnalysis}
          isLoading={isAnalyzing}
          analysisMode={analysisModeInfo.mode}
          className={`fixed top-4 transition-all duration-300 ease-in-out ${showRightPanel ? 'right-[440px]' : 'right-4'
            }`}
        />

        {/* Main Container - Always Optimisation/Report View */}
        <div className="flex-1 h-full flex overflow-hidden relative">
          {/* LEFT PANEL: CV Preview */}
          <div className="flex-1 min-h-0 bg-gray-200 dark:bg-black/20 relative flex flex-col">

            {/* CV Preview Controls - Moved Outside Scroller */}
            <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-40">
              <div className="flex items-center gap-6 bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-lg border border-white/10 select-none pointer-events-auto transition-all hover:bg-black/90">
                <span className="text-sm font-medium whitespace-nowrap">CV Preview • A4 Format • {totalPages} Page{totalPages > 1 ? 's' : ''}</span>

                <div className="w-px h-5 bg-white/20" />

                {/* View Mode Toggles */}
                <div className="flex bg-white/10 rounded-lg p-1 gap-1">
                  <button
                    onClick={() => setViewMode('engineer')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'engineer' ? 'bg-black/50 text-[#80FF00] shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title="Engineer View (Edit Mode)"
                  >
                    <Component className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('recruiter')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'recruiter' ? 'bg-black/50 text-[#80FF00] shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title="Recruiter View (Clean Preview)"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('ats')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'ats' ? 'bg-black/50 text-[#80FF00] shadow-sm' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title="ATS View (Analysis)"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-white/40 min-w-[3ch] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>

                {/* Sidebar Toggle */}
                <>
                  <div className="w-px h-5 bg-white/20" />
                  <button
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    className={`p-2 rounded-lg transition-colors border border-transparent ${showRightPanel ? 'bg-[#80FF00]/10 text-[#80FF00] border-[#80FF00]/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    title={showRightPanel ? "Maximize Preview" : "Show Analysis Panel"}
                  >
                    {showRightPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
                  </button>
                </>

              </div>
            </div>

            <div ref={cvPreviewRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-8 pt-24">
              <div
                className="flex flex-col items-center gap-8 transition-transform duration-200 ease-in-out"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'top center' }}
              >
                <CVPreviewContent
                  cvData={state.cvData}
                  theme="light"
                  showBadge={true}
                  annotations={state.fixAnnotations}
                  activeFixId={state.activeFixId}
                  onSelectFix={(fixId: string) => dispatch({ type: 'SET_ACTIVE_FIX', payload: fixId })}
                  onApplyFix={applyAnnotation}
                  onDismissFix={dismissAnnotation}
                  ignoreStructureVisibility={true}
                  renderMode="pages"
                  onSectionClick={viewMode === 'engineer' ? handleSectionClick : undefined} // Disable click editing if not engineer mode
                  // Prop mapping for view modes - using overlaysEnabled as proxy or allow adding new prop
                  overlaysEnabled={viewMode === 'engineer' || viewMode === 'ats'}
                  // In Recruiter mode, we want a clean preview

                  // NEW CONTROLS passed to header pill
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  currentZoom={zoomLevel}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  isSidebarOpen={showRightPanel}
                  onToggleSidebar={() => setShowRightPanel(!showRightPanel)}
                  onTotalPagesChange={setTotalPages}
                />
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Scorecard + Keywords + Fix Queue */}
          {showRightPanel && (
            <aside className="w-[400px] flex-shrink-0 border-l border-gray-200 dark:border-white/10 bg-white dark:bg-[#141810] overflow-hidden flex flex-col z-10 transition-all duration-300">
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">

                {/* --- SECTIONS REMOVED (Scorecard moved to Pulse Pill) --- */}

                {/* Keywords & Fixes Tabs or Content */}
                <div className="p-4 space-y-6">
                  <div className="border-b border-gray-200 dark:border-white/10">
                    <KeywordMatchPanel
                      analysisMode={analysisModeInfo.mode}
                      atsResult={{
                        score: atsScore ?? state.surgeonAnalysis?.score ?? 0,
                        details: {
                          matchedKeywords: atsAnalysis?.strengths || [],
                          missingKeywords: atsAnalysis?.missingKeywords || [],
                          experienceYears: 0,
                          educationLevel: '',
                          formatIssues: [],
                        },
                        suggestions: atsAnalysis?.suggestions || [],
                      } as ATSResult}
                      cvData={state.cvData}
                      jobData={state.jobData}
                      onAddKeyword={(keyword) => {
                        // Add keyword to skills section
                        const currentSkills = state.cvData?.skills || [];
                        // Check for existing "Keywords" or "General" category
                        const generalSkillsIndex = currentSkills.findIndex(
                          (cat: any) => cat.category?.toLowerCase() === 'general' || cat.category?.toLowerCase() === 'keywords'
                        );

                        let updatedSkills = [...currentSkills];
                        if (generalSkillsIndex >= 0) {
                          const targetCat = updatedSkills[generalSkillsIndex];
                          const existingSkillsList = Array.isArray(targetCat.skills) ? targetCat.skills : [];

                          if (!existingSkillsList.includes(keyword)) {
                            updatedSkills[generalSkillsIndex] = {
                              ...targetCat,
                              skills: [...existingSkillsList, keyword],
                            };
                          }
                        } else {
                          updatedSkills.push({ category: 'Keywords', skills: [keyword] });
                        }

                        const updatedCV = { ...state.cvData, skills: updatedSkills };
                        dispatch({ type: 'SET_CV_DATA', payload: updatedCV });
                        toast.success(`Added "${keyword}" to skills`);
                      }}
                      onAddJobDescription={() => setShowJobParserDialog(true)}
                      compact={true}
                    />
                  </div>

                  {/* Fix Queue Section */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-[#80FF00]" />
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">Fix Queue</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#80FF00]/20 text-[#80FF00]">
                        {(state.fixAnnotations || []).filter(f => f.status === 'open').length}
                      </span>
                    </div>

                    {/* Critical Fixes */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">Critical</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-500/20 text-red-300">
                          {(state.fixAnnotations || []).filter(f => f.status === 'open' && f.severity === 'high').length}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(state.fixAnnotations || []).filter(f => f.status === 'open' && f.severity === 'high').length === 0 ? (
                          <div className="text-xs text-white/50 italic">No critical fixes.</div>
                        ) : (
                          (state.fixAnnotations || []).filter(f => f.status === 'open' && f.severity === 'high').map((fix, idx) => (
                            <button
                              key={fix.id || `critical-${idx}`}
                              onClick={() => dispatch({ type: 'SET_ACTIVE_FIX', payload: fix.id })}
                              className={`w-full text-left p-2 rounded-lg transition-colors ${state.activeFixId === fix.id ? 'bg-[#80FF00]/20 border border-[#80FF00]/40' : 'bg-white/5 hover:bg-white/10'
                                }`}
                            >
                              <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{fix.issue}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-white/50">{fix.category}</span>
                                <span className="text-[10px] text-[#80FF00]">+{fix.impactScoreDelta || 0}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Improvements */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-white">Improvements</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-500/20 text-amber-200">
                          {(state.fixAnnotations || []).filter(f => f.status === 'open' && f.severity !== 'high').length}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(state.fixAnnotations || []).filter(f => f.status === 'open' && f.severity !== 'high').map((fix, idx) => (
                          <button
                            key={fix.id || `improvement-${idx}`}
                            onClick={() => dispatch({ type: 'SET_ACTIVE_FIX', payload: fix.id })}
                            className={`w-full text-left p-2 rounded-lg transition-colors ${state.activeFixId === fix.id ? 'bg-[#80FF00]/20 border border-[#80FF00]/40' : 'bg-white/5 hover:bg-white/10'
                              }`}
                          >
                            <div className="text-xs font-medium text-gray-900 dark:text-white line-clamp-2">{fix.issue}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] text-white/50">{fix.category}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Footer Actions */}
              <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5">
                <button
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${isRoleReady ? 'bg-[#80FF00] hover:bg-[#70e600] text-black' : 'bg-white/10 text-white/60 cursor-not-allowed'
                    }`}
                >
                  {isAnalyzing ? (
                    <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /><span>Analyzing...</span></>
                  ) : (
                    <><Sparkles className="w-4 h-4" /><span>{isRoleReady ? 'Run Analysis' : 'Set Role'}</span></>
                  )}
                </button>
              </div>
            </aside>
          )
          }


        </div >
        {/* AI Analysis Chatbot Card - Bottom Right - Only in builder mode */}


        {/* Floating Form Editor */}
        {
          activeEditorSectionId && editorPosition && (
            <FloatingFormEditor
              sectionId={activeEditorSectionId}
              onClose={() => {
                setActiveEditorSectionId(null);
                setEditorPosition(null);
              }}
              position={editorPosition}
              alignment={editorPosition.alignment}
              annotations={state.fixAnnotations}
              onApplyAnnotation={applyAnnotation}
              onDismissAnnotation={dismissAnnotation}
            />
          )
        }

        {/* Report modal */}
        <SurgeonReportModal
          isOpen={state.reportOpen}
          onClose={() => dispatch({ type: 'SET_REPORT_OPEN', payload: false })}
          onReviewAndFix={() => {
            dispatch({ type: 'SET_REPORT_OPEN', payload: false });
          }}
        />

        {/* Role Profiler Modal (used when editing existing CVs or when role context is missing) */}
        <RoleProfilerModal
          isOpen={showRoleProfiler}
          onClose={() => setShowRoleProfiler(false)}
          onComplete={(role, seniority) => {
            dispatch({
              type: 'SET_ROLE_CONTEXT',
              payload: { targetRole: role, seniorityLevel: seniority as any }
            });
            setShowRoleProfiler(false);
          }}
        />

        {/* Job Parser Dialog (Magic Paste) for standalone CVs */}
        <JobParserDialog
          isOpen={showJobParserDialog}
          onClose={() => setShowJobParserDialog(false)}
          customDescription="Add a Job Description for ATS check. This helps us provide more accurate analysis tailored to your target role by matching your CV against the job requirements."
          showSaveAndTrack={state.cvType === 'standalone'} // Show "Save and Track" only for standalone CVs
          onParseComplete={(parsedData) => {
            // Extract job description from parsed data
            const jobDescription = parsedData.jobDescription || parsedData.jobDescriptionRaw || '';

            if (jobDescription) {
              setJdText(jobDescription);
              setShowJobParserDialog(true);

              // Update jobData in state with the parsed information
              dispatch({
                type: 'SET_JOB_DATA',
                payload: {
                  ...state.jobData,
                  jobTitle: parsedData.jobTitle || state.targetRole,
                  title: parsedData.jobTitle || state.targetRole,
                  company: parsedData.company || 'Unknown Company',
                  description: jobDescription,
                  jobDescription: jobDescription,
                  location: parsedData.location || ''
                }
              });
            }

            setShowJobParserDialog(false);
          }}
          onSaveAndTrack={async (parsedData) => {
            // Handle "Save and Track" - Save job and link CV to journey
            try {
              const jobDescription = parsedData.jobDescription || parsedData.jobDescriptionRaw || '';

              // EDGE CASE 2: Verify CV is standalone before proceeding
              if (!jobDescription) {
                alert('Missing job description. Please provide a job description to save and track.');
                return;
              }

              // WORKAROUND: Ensure CV is saved first if cvId is missing
              // This handles the case where CV was parsed but not saved yet
              let effectiveCvId: string | undefined | null = state.cvId;

              if (!effectiveCvId) {
                console.log('💾 CV not saved yet, saving CV first before saving job...');
                try {
                  // Calculate completion percentage
                  const hasPersonalInfo = !!(state.cvData?.basics?.name || state.cvData?.basics?.email);
                  const hasWorkExperience = (state.cvData?.work?.length || 0) > 0;
                  const hasEducation = (state.cvData?.education?.length || 0) > 0;
                  const hasSkills = (state.cvData?.skills?.length || 0) > 0;
                  const completionPercentage = [hasPersonalInfo, hasWorkExperience, hasEducation, hasSkills].filter(Boolean).length * 25;

                  const payload = {
                    title: state.cvTitle || 'My CV',
                    cvData: state.cvData,
                    templateId: state.selectedTemplate?.id || (state.selectedTemplate as any)?._id,
                    cvType: state.cvType || 'standalone',
                    status: 'draft',
                    metadata: {
                      isMaster: state.cvType === 'master',
                      completionPercentage,
                      createdVia: 'resume-enhancer'
                    }
                  };

                  const cvResponse = await fetch('/api/cvs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                  });

                  const cvResult = await cvResponse.json().catch(() => ({}));

                  if (!cvResponse.ok) {
                    throw new Error(cvResult?.error || 'Failed to save CV');
                  }

                  effectiveCvId = cvResult?.data?.cv?.id || cvResult?.data?.cv?._id || cvResult?.cv?.id || cvResult?.cv?._id || cvResult?.id || null;

                  if (effectiveCvId) {
                    console.log('✅ CV saved successfully with ID:', effectiveCvId);
                    dispatch({ type: 'SET_CV_ID', payload: effectiveCvId });
                  } else {
                    throw new Error('CV saved but no ID returned');
                  }
                } catch (saveError: any) {
                  console.error('Failed to save CV before creating job:', saveError);
                  alert(`Failed to save CV: ${saveError.message || 'Unknown error'}. Please try again.`);
                  return;
                }
              }

              // EDGE CASE 10: Set timeout for request (30 seconds)
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              try {
                // Step 1: Save the job with cvId - this will link CV before document creation
                const jobResponse = await fetch('/api/jobs', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    jobTitle: parsedData.jobTitle || state.targetRole || 'Software Engineer',
                    company: parsedData.company || 'Unknown Company',
                    jobDescription: jobDescription,
                    location: parsedData.location || '',
                    jobUrl: parsedData.jobUrl || '',
                    salary: parsedData.salary,
                    status: 'created', // Start at 'created' stage
                    cvId: effectiveCvId // Pass effectiveCvId to link CV before journey auto-creates CV
                  }),
                  signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!jobResponse.ok) {
                  const errorData = await jobResponse.json().catch(() => ({}));
                  const errorMessage = errorData.error || errorData.message || 'Failed to save job';

                  // EDGE CASE 9: Check for credit errors
                  if (errorMessage.includes('credit') || errorMessage.includes('limit')) {
                    throw new Error('Insufficient credits to save and track this job. Please upgrade your plan.');
                  }
                  throw new Error(errorMessage);
                }

                const jobResult = await jobResponse.json();
                const jobId = jobResult.data?.jobApplication?._id || jobResult.data?.id;
                const journeyId = jobResult.data?.journey?._id;

                // EDGE CASE 6: Only proceed if journey was created successfully
                if (!jobId) {
                  throw new Error('Job saved but no job ID returned');
                }

                if (!journeyId) {
                  throw new Error('Journey creation failed');
                }

                // Step 2: Update context with journey information
                // CV is already linked by the job creation API, so we just update context
                convertToJourney(journeyId, {
                  description: jobDescription,
                  title: parsedData.jobTitle || state.targetRole,
                  jobTitle: parsedData.jobTitle || state.targetRole,
                  company: parsedData.company || 'Unknown Company',
                  id: jobId,
                  _id: jobId,
                  location: parsedData.location
                });

                // Keep the URL in sync so refresh/share preserves journey context
                try {
                  const params = new URLSearchParams(searchParams.toString());
                  params.set('mode', 'journey');
                  if (state.cvId) params.set('cvId', state.cvId);
                  params.set('journeyId', journeyId);
                  router.replace(`${pathname}?${params.toString()}`);
                } catch (urlError) {
                  console.warn('Failed to update URL with journey details (non-critical):', urlError);
                }

                // Update jobData in state
                dispatch({
                  type: 'SET_JOB_DATA',
                  payload: {
                    ...state.jobData,
                    jobTitle: parsedData.jobTitle || state.targetRole,
                    title: parsedData.jobTitle || state.targetRole,
                    company: parsedData.company || 'Unknown Company',
                    description: jobDescription,
                    jobDescription: jobDescription,
                    location: parsedData.location
                  }
                });

                setJdText(jobDescription);
                setShowJobParserDialog(false);

                // Show success message using toast instead of alert
                toast.success(`Job saved and tracking started! Now tracking: ${parsedData.jobTitle || state.targetRole} at ${parsedData.company || 'Unknown Company'}`);

                // Reload CV with journey context dynamically (without navigating away)
                try {
                  // Fetch the updated CV with journey data
                  const cvResponse = await fetch(`/api/cvs/${state.cvId || effectiveCvId}`);
                  if (cvResponse.ok) {
                    const cvResult = await cvResponse.json();
                    const updatedCV = cvResult.data.cv;

                    // Reload CV with journey context using loadCV function
                    const finalJobData = updatedCV.jobData || {
                      id: jobId,
                      _id: jobId,
                      jobTitle: parsedData.jobTitle || state.targetRole,
                      title: parsedData.jobTitle || state.targetRole,
                      company: parsedData.company || 'Unknown Company',
                      description: jobDescription,
                      jobDescription: jobDescription,
                      location: parsedData.location
                    };

                    loadCV({
                      cvId: updatedCV.id,
                      cvType: 'journey',
                      cvTitle: updatedCV.title,
                      cvData: updatedCV.cvData,
                      template: updatedCV.template,
                      journeyId: journeyId,
                      jobData: finalJobData
                    });

                    // Journey CVs use job description for analysis - no need to set targetRole/seniorityLevel

                    // Update URL params to reflect journey mode
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('mode', 'journey');
                    if (state.cvId || effectiveCvId) params.set('cvId', state.cvId || effectiveCvId);
                    params.set('journeyId', journeyId);
                    router.replace(`${pathname}?${params.toString()}`);

                    console.log('✅ CV reloaded with journey context dynamically');
                  }
                } catch (reloadError) {
                  console.error('Failed to reload CV with journey context:', reloadError);
                  // Fallback: just update the state we have
                  dispatch({ type: 'SET_CV_TYPE', payload: 'journey' });
                  dispatch({ type: 'SET_JOURNEY_ID', payload: journeyId });
                }

              } catch (fetchError: any) {
                clearTimeout(timeoutId);

                // EDGE CASE 10: Handle network timeout
                if (fetchError.name === 'AbortError') {
                  throw new Error('Operation timed out. Please try again.');
                }
                throw fetchError;
              }
            } catch (error) {
              // EDGE CASE 3: Job creation failure - don't update state
              console.error('Failed to save and track:', error);
              alert(`Failed to save and track: ${error instanceof Error ? error.message : 'Unknown error'}`);
              // Don't update local state if operation fails - CV remains standalone
            }
          }}
        />

      </div >
    );
  });

Step3BuilderSurgeon.displayName = 'Step3BuilderSurgeon';

export default Step3BuilderSurgeon;

