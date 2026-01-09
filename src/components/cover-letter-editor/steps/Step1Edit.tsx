'use client';

import React, { useState, useEffect } from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { formatCoverLetterHeader, formatCoverLetterFooter, cleanHeaderContent } from '@/lib/utils/coverLetterUtils';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import BridgeCard from '../BridgeCard';
import { Sparkles, RefreshCw, Wand2, ZoomIn, ZoomOut, Maximize, FileText } from 'lucide-react';
import PersonalInfoForm from '@/components/forms/PersonalInfoForm';

export default function Step1Edit() {
  const { state, updateHeader, updateBody, updateFooter, updateCoverLetter, setCVData } = useCoverLetterEditor();
  const [headerContent, setHeaderContent] = useState(state.coverLetterData.header || '');
  const [bodyContent, setBodyContent] = useState(state.coverLetterData.body || '');
  const [footerContent, setFooterContent] = useState(state.coverLetterData.footer || '');

  // Modular State
  const [structuredBody, setStructuredBody] = useState<any>(state.coverLetterData.structuredBody || null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // AI suggestions state for body (Legacy)
  const [showBodySuggestions, setShowBodySuggestions] = useState(false);
  const [bodySuggestions, setBodySuggestions] = useState<Array<{ method: string; content: string; size?: string }>>([]);
  const [loadingBodySuggestions, setLoadingBodySuggestions] = useState(false);

  // Preview Controls
  const [zoom, setZoom] = useState(1);
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const previewContainerRef = React.useRef<HTMLDivElement>(null);

  // Auto-populate header and footer on mount if CV data is available
  useEffect(() => {
    if (state.cvData) {
      // Ensure basics are populated if empty (for PersonalInfoForm)
      // This might be where the issue is - initial load
    }
    if (state.cvData) {
      if (!state.coverLetterData.header?.trim()) {
        const autoHeader = formatCoverLetterHeader(state.cvData, state.jobData);
        setHeaderContent(autoHeader);
        updateHeader(autoHeader);
      }
      if (!state.coverLetterData.footer?.trim()) {
        const autoFooter = formatCoverLetterFooter(state.cvData);
        setFooterContent(autoFooter);
        updateFooter(autoFooter);
      }
    }
  }, [state.cvData, state.jobData, state.coverLetterData.header, state.coverLetterData.footer, updateHeader, updateFooter]);

  // Sync local state with context
  useEffect(() => {
    if (state.coverLetterData.header !== undefined) {
      setHeaderContent(state.coverLetterData.header);
    }
    if (state.coverLetterData.body !== undefined) {
      setBodyContent(state.coverLetterData.body);
    }
    if (state.coverLetterData.footer !== undefined) {
      setFooterContent(state.coverLetterData.footer);
    }
    if (state.coverLetterData.structuredBody) {
      setStructuredBody(state.coverLetterData.structuredBody);
    }
  }, [state.coverLetterData.header, state.coverLetterData.body, state.coverLetterData.footer, state.coverLetterData.structuredBody]);

  const handleHeaderChange = (value: string) => {
    // Clean header to only contain contact information
    const cleanedHeader = cleanHeaderContent(value);
    setHeaderContent(cleanedHeader);
    updateHeader(cleanedHeader);
  };

  const handleFooterChange = (value: string) => {
    setFooterContent(value);
    updateFooter(value);
  };

  const handleBasicsUpdate = (field: string, value: any) => {
    // Update CV Data
    const keys = field.split('.');
    let newData: any = { ...state.cvData?.basics };

    // Handle nested updates/top-level basics updates
    if (keys.length > 1) {
      // Deep update or flattened? PersonalInfoForm expects full replacement for object fields usually
      // For simple fields like 'phone', it's direct.
      newData = { ...state.cvData?.basics, [field]: value };
    } else {
      newData = { ...state.cvData?.basics, [field]: value };
    }

    const newCVData = { ...state.cvData, basics: newData };

    // Update context
    setCVData(newCVData as UnifiedCVDataStructure);

    // Update Header
    const updatedHeader = formatCoverLetterHeader(newCVData as UnifiedCVDataStructure, state.jobData);
    setHeaderContent(updatedHeader);
    updateHeader(updatedHeader);
  };

  // --- Modular Editor Logic ---

  const updateStructuredSection = (sectionKey: string, newText: string) => {
    if (!structuredBody || !structuredBody.sections) return;

    const newStructuredBody = {
      ...structuredBody,
      sections: {
        ...structuredBody.sections,
        [sectionKey]: {
          ...structuredBody.sections[sectionKey],
          text: newText
        }
      }
    };

    setStructuredBody(newStructuredBody);
    updateCoverLetter({ structuredBody: newStructuredBody });

    // Regenerate the flat body for preview
    const newBodyContent = formatLegacyBody(newStructuredBody);
    setBodyContent(newBodyContent);
    updateBody(newBodyContent);
  };

  const formatLegacyBody = (structuredData: any): string => {
    if (!structuredData?.sections) return '';
    const sections = structuredData.sections;
    const parts = [];

    if (sections.introduction?.text) parts.push(sections.introduction.text);
    if (sections.experience_bridge_1?.text) parts.push(sections.experience_bridge_1.text);
    if (sections.experience_bridge_2?.text) parts.push(sections.experience_bridge_2.text);
    if (sections.motivation?.text) parts.push(sections.motivation.text);
    if (sections.closing?.text) parts.push(sections.closing.text);

    return parts.join('\n\n');
  };

  const handleRegenerateModular = async () => {
    if (!state.cvData || !state.jobData) return;

    setIsRegenerating(true);
    try {
      const response = await fetch('/api/ai/cover-letter-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cvData: state.cvData,
          jobData: state.jobData,
          recipientName: 'Hiring Manager',
          companyName: state.jobData.company
        })
      });

      if (!response.ok) throw new Error('Generation failed');

      const data = await response.json();
      if (data.structuredContent) {
        setStructuredBody(data.structuredContent);
        updateCoverLetter({ structuredBody: data.structuredContent });

        const newBody = formatLegacyBody(data.structuredContent);
        setBodyContent(newBody);
        updateBody(newBody);
      }
    } catch (error) {
      console.error('Modular generation failed:', error);
    } finally {
      setIsRegenerating(false);
    }
  };

  // --- Legacy AI Logic ---

  const handleBodyChange = (value: string) => {
    setBodyContent(value);
    updateBody(value);
  };

  const generateAISuggestions = async () => {
    if (!state.cvData || !state.jobData) {
      console.error('❌ Step1Edit - Missing required data for AI suggestions');
      return;
    }

    // Show panel immediately and set loading state
    setShowBodySuggestions(true);
    setLoadingBodySuggestions(true);

    try {
      const response = await fetch('/api/ai/generate-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: '', // Will be set by API from session
          jobData: state.jobData,
          sectionData: { content: bodyContent },
          sectionType: 'cover_letter_body',
          currentText: bodyContent || '',
          cvData: {
            ...state.cvData,
            metadata: (state.cvData as any)?.metadata || {}
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();

      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setBodySuggestions(result.suggestions);
      } else {
        setShowBodySuggestions(false);
      }
    } catch (error) {
      console.error('❌ Step1Edit - Error generating AI suggestions:', error);
      setShowBodySuggestions(false);
    } finally {
      setLoadingBodySuggestions(false);
    }
  };

  const handleSelectSuggestion = (content: string) => {
    handleBodyChange(content);
    setShowBodySuggestions(false);
  };

  // Merge header + body + footer for preview (on-the-fly merging)
  const { mergeCoverLetterContent } = require('@/lib/utils/coverLetterUtils');
  const previewContent = mergeCoverLetterContent(headerContent, bodyContent, footerContent);

  // Auto-generate modular cover letter if empty and data exists
  const [hasAutoGenerated, setHasAutoGenerated] = useState(false);

  useEffect(() => {
    if (
      state.cvData &&
      state.jobData &&
      !structuredBody &&
      !state.coverLetterData.body?.trim() &&
      !hasAutoGenerated &&
      !isRegenerating
    ) {
      console.log('🔄 Auto-triggering modular cover letter generation...');
      setHasAutoGenerated(true);
      handleRegenerateModular();
    }
  }, [state.cvData, state.jobData, structuredBody, state.coverLetterData.body, hasAutoGenerated, isRegenerating]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Split View: Preview Left, Editors Right */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left Pane (55%) - Live Preview */}
        <div className="w-[55%] flex flex-col bg-gray-50 dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 min-h-0">

          {/* Toolbar */}
          <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1a230f] z-10">
            <div className="flex items-center gap-2">
              <div className="flex bg-white dark:bg-[#1a1a1a] rounded-lg border border-gray-200 dark:border-gray-700 p-1">
                <button
                  onClick={() => setPageSize('A4')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${pageSize === 'A4'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  A4
                </button>
                <div className="w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                <button
                  onClick={() => setPageSize('Letter')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${pageSize === 'Letter'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
                    }`}
                >
                  US Letter
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium w-12 text-center text-gray-600 dark:text-gray-300">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1" />
              <button
                onClick={() => setZoom(1)}
                className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                title="Reset Zoom"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex items-start justify-center bg-gray-100 dark:bg-[#0f110a] min-h-0 relative">
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease-out',
                marginTop: '0px',
                marginBottom: '0px'
              }}
            >
              <CoverLetterPreview
                content={previewContent}
                cvData={state.cvData || {}}
                jobData={state.jobData || {}}
                selectedCVData={state.cvData || {}}
                template={state.selectedTemplate}
                header={headerContent}
                body={bodyContent}
                footer={footerContent}
                pageSize={pageSize}
              />
            </div>
          </div>
        </div>

        {/* Right Pane (45%) - Editors */}
        <div className="w-[45%] flex flex-col gap-6 overflow-y-auto pl-2 min-h-0 pb-20 pr-2">
          {/* Section: Personal Info (Collapsible or Standard) */}
          <div className="bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Personal Information</h3>
              {/* Simplified Auto-fill button */}
              {(state.coverLetterData.cvId || state.journeyId) && (
                <button
                  onClick={async () => {
                    try {
                      let targetCvId = state.coverLetterData.cvId;
                      if (!targetCvId && state.journeyId) {
                        const journeyResponse = await fetch(`/api/application-journey/${state.journeyId}`);
                        if (journeyResponse.ok) {
                          const journeyResult = await journeyResponse.json();
                          const journey = journeyResult.data?.journey || journeyResult.journey;
                          if (journey?.cvId) targetCvId = journey.cvId.toString();
                        }
                      }
                      if (targetCvId) {
                        const cvResponse = await fetch(`/api/cvs/${targetCvId}`);
                        if (cvResponse.ok) {
                          const cvResult = await cvResponse.json();
                          const cv = cvResult.data?.cv || cvResult.cv;
                          if (cv?.cvData) {
                            const loadedCVData = cv.cvData as UnifiedCVDataStructure;
                            setCVData(loadedCVData);
                            const updatedHeader = formatCoverLetterHeader(loadedCVData, state.jobData);
                            setHeaderContent(updatedHeader);
                            updateHeader(updatedHeader);
                            const updatedFooter = formatCoverLetterFooter(loadedCVData);
                            setFooterContent(updatedFooter);
                            updateFooter(updatedFooter);
                          }
                        }
                      }
                    } catch (error) {
                      console.error('Failed to fetch CV data:', error);
                    }
                  }}
                  className="text-xs px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                >
                  Auto-fill form Linked CV
                </button>
              )}
            </div>

            <PersonalInfoForm
              data={state.cvData?.basics || {
                name: '', label: '', image: '', email: '', phone: '', url: '', summary: '',
                location: { address: '', postalCode: '', city: '', countryCode: '', region: '' }, profiles: []
              }}
              cvData={state.cvData}
              jobData={state.jobData}
              onUpdate={handleBasicsUpdate}
              reviewMode={false}
              hidePhoto={true}
              hideSummary={true}
            />
          </div>

          {/* Body Section: Conditional Rendering */}
          {structuredBody ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500" />
                  Modular Cover Letter
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateModular}
                    disabled={isRegenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-lime-600 hover:bg-lime-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRegenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>

              {/* Introduction */}
              <BridgeCard
                title={structuredBody.sections.introduction.title || "Introduction"}
                content={structuredBody.sections.introduction.text}
                onChange={(val) => updateStructuredSection('introduction', val)}
                className="border-l-4 border-l-purple-500"
              />

              {/* Bridge 1 */}
              <BridgeCard
                title={structuredBody.sections.experience_bridge_1.title || "Experience Bridge 1"}
                jdRequirement={structuredBody.sections.experience_bridge_1.jd_context}
                cvEvidence={structuredBody.sections.experience_bridge_1.cv_evidence}
                content={structuredBody.sections.experience_bridge_1.text}
                onChange={(val) => updateStructuredSection('experience_bridge_1', val)}
                className="border-l-4 border-l-blue-500"
              />

              {/* Bridge 2 */}
              <BridgeCard
                title={structuredBody.sections.experience_bridge_2.title || "Experience Bridge 2"}
                jdRequirement={structuredBody.sections.experience_bridge_2.jd_context}
                content={structuredBody.sections.experience_bridge_2.text}
                onChange={(val) => updateStructuredSection('experience_bridge_2', val)}
                className="border-l-4 border-l-blue-500"
              />

              {/* Motivation */}
              <BridgeCard
                title={structuredBody.sections.motivation.title || "Motivation"}
                content={structuredBody.sections.motivation.text}
                onChange={(val) => updateStructuredSection('motivation', val)}
                className="border-l-4 border-l-orange-500"
              />

              {/* Closing */}
              <BridgeCard
                title={structuredBody.sections.closing.title || "Closing"}
                content={structuredBody.sections.closing.text}
                onChange={(val) => updateStructuredSection('closing', val)}
                className="border-l-4 border-l-green-500"
              />

              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setStructuredBody(null)}
                  className="text-sm text-gray-500 hover:text-gray-700 underline"
                >
                  Switch to Classic Editor (Lose Modular Structure)
                </button>
              </div>
            </div>
          ) : (
            /* Legacy WYSIWYG Editor */
            <div className="bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Body</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleRegenerateModular}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                    title="Generate a new Modular Cover Letter"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Modular
                  </button>
                  <WYSIWYGToolbar
                    showAIButton={true}
                    fieldType="other"
                    onAISuggestions={generateAISuggestions}
                    isGenerating={loadingBodySuggestions}
                  />
                </div>
              </div>

              <AISuggestionsPanel
                isVisible={showBodySuggestions}
                suggestions={bodySuggestions}
                isLoading={loadingBodySuggestions}
                onSelect={handleSelectSuggestion}
                onClose={() => setShowBodySuggestions(false)}
              />

              <WYSIWYGEditor
                value={bodyContent}
                onChange={handleBodyChange}
                rows={12}
                placeholder="Dear Hiring Manager..."
              />
            </div>
          )}

          {/* Footer Section */}
          <div className="bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-3xl border border-white/10 shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Footer</h3>
            </div>
            <WYSIWYGEditor
              value={footerContent}
              onChange={handleFooterChange}
              rows={3}
              placeholder="Sincerely,..."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
