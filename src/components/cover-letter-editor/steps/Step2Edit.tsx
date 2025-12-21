'use client';

import React, { useState, useEffect } from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { formatCoverLetterHeader } from '@/lib/utils/coverLetterUtils';

export default function Step2Edit() {
  const { state, updateHeader, updateBody, autoPopulateHeader, setCVData } = useCoverLetterEditor();
  const [headerContent, setHeaderContent] = useState(state.coverLetterData.header || '');
  const [bodyContent, setBodyContent] = useState(state.coverLetterData.body || '');
  
  // AI suggestions state for body
  const [showBodySuggestions, setShowBodySuggestions] = useState(false);
  const [bodySuggestions, setBodySuggestions] = useState<Array<{ method: string; content: string; size?: string }>>([]);
  const [loadingBodySuggestions, setLoadingBodySuggestions] = useState(false);

  // Auto-populate header on mount if CV data is available and header is empty
  useEffect(() => {
    if (state.cvData && !state.coverLetterData.header?.trim()) {
      const autoHeader = formatCoverLetterHeader(state.cvData);
      setHeaderContent(autoHeader);
      updateHeader(autoHeader);
    }
  }, [state.cvData, state.coverLetterData.header, updateHeader]);

  // Sync local state with context
  useEffect(() => {
    if (state.coverLetterData.header !== undefined) {
      setHeaderContent(state.coverLetterData.header);
    }
    if (state.coverLetterData.body !== undefined) {
      setBodyContent(state.coverLetterData.body);
    }
  }, [state.coverLetterData.header, state.coverLetterData.body]);

  const handleHeaderChange = (value: string) => {
    setHeaderContent(value);
    updateHeader(value);
  };

  const handleBodyChange = (value: string) => {
    setBodyContent(value);
    updateBody(value);
  };

  const generateAISuggestions = async () => {
    if (!state.cvData || !state.jobData) {
      console.error('❌ Step2Edit - Missing required data for AI suggestions');
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
      console.log('✅ Step2Edit - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setBodySuggestions(result.suggestions);
      } else {
        console.error('❌ Step2Edit - Invalid suggestions format:', result);
        setShowBodySuggestions(false);
      }
    } catch (error) {
      console.error('❌ Step2Edit - Error generating AI suggestions:', error);
      setShowBodySuggestions(false);
    } finally {
      setLoadingBodySuggestions(false);
    }
  };

  const handleSelectSuggestion = (content: string) => {
    handleBodyChange(content);
    setShowBodySuggestions(false);
  };

  // Get full content for preview
  const previewContent = `${headerContent}\n\n${bodyContent}`;

  return (
    <div className="flex flex-col h-full">
      {/* Split View: Editors Left, Preview Right */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Left Pane (50%) - Editors */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
          {/* Header Section */}
          <div className="bg-white dark:bg-[#141810] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Header</h3>
              <WYSIWYGToolbar showAIButton={false} />
            </div>
            
            <WYSIWYGEditor
              value={headerContent}
              onChange={handleHeaderChange}
              rows={3}
              placeholder="Your Name&#10;Your Email | Your Phone&#10;Your Address"
            />
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-200">
              Include your contact information here (name, email, phone, address)
            </p>
          </div>

          {/* Body Section */}
          <div className="bg-white dark:bg-[#141810] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Body</h3>
              <WYSIWYGToolbar
                showAIButton={true}
                fieldType="other"
                onAISuggestions={generateAISuggestions}
                isGenerating={loadingBodySuggestions}
              />
            </div>
            
            {/* AI Suggestions Panel */}
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
              placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the [Position] role at [Company]...&#10;&#10;[Your compelling content here]&#10;&#10;Sincerely,&#10;[Your Name]"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-200">
                Use formatting tools above to style your text
              </p>
              <span className="text-xs text-gray-600 dark:text-gray-200">
                {(headerContent + bodyContent).length} characters
              </span>
            </div>
          </div>
        </div>

        {/* Right Pane (50%) - Live Preview */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Live Preview</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <CoverLetterPreview
              content={previewContent}
              cvData={state.cvData || {}}
              jobData={state.jobData || {}}
              selectedCVData={state.cvData || {}}
              template={state.selectedTemplate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

