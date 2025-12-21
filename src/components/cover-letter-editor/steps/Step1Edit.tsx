'use client';

import React, { useState, useEffect } from 'react';
import { useCoverLetterEditor } from '@/contexts/CoverLetterEditorContext';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from '@/components/ai/AISuggestionsPanel';
import CoverLetterPreview from '@/components/cv-preview/CoverLetterPreview';
import { formatCoverLetterHeader, formatCoverLetterFooter, cleanHeaderContent } from '@/lib/utils/coverLetterUtils';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';

export default function Step1Edit() {
  const { state, updateHeader, updateBody, updateFooter, autoPopulateHeader, setCVData } = useCoverLetterEditor();
  const [headerContent, setHeaderContent] = useState(state.coverLetterData.header || '');
  const [bodyContent, setBodyContent] = useState(state.coverLetterData.body || '');
  const [footerContent, setFooterContent] = useState(state.coverLetterData.footer || '');
  
  // AI suggestions state for body
  const [showBodySuggestions, setShowBodySuggestions] = useState(false);
  const [bodySuggestions, setBodySuggestions] = useState<Array<{ method: string; content: string; size?: string }>>([]);
  const [loadingBodySuggestions, setLoadingBodySuggestions] = useState(false);

  // Auto-populate header and footer on mount if CV data is available
  useEffect(() => {
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
  }, [state.coverLetterData.header, state.coverLetterData.body, state.coverLetterData.footer]);

  const handleHeaderChange = (value: string) => {
    // Clean header to only contain contact information
    const cleanedHeader = cleanHeaderContent(value);
    setHeaderContent(cleanedHeader);
    updateHeader(cleanedHeader);
  };

  const handleBodyChange = (value: string) => {
    setBodyContent(value);
    updateBody(value);
  };

  const handleFooterChange = (value: string) => {
    setFooterContent(value);
    updateFooter(value);
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
      console.log('✅ Step1Edit - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setBodySuggestions(result.suggestions);
      } else {
        console.error('❌ Step1Edit - Invalid suggestions format:', result);
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Split View: Preview Left, Editors Right */}
      <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
        {/* Left Pane (50%) - Live Preview */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700 min-h-0">
          <div className="flex-1 overflow-y-auto p-4 flex items-start justify-center bg-gray-50 dark:bg-[#1a230f] min-h-0">
            <div className="w-full max-w-full" style={{ maxWidth: '100%' }}>
              <CoverLetterPreview
                content={previewContent}
                cvData={state.cvData || {}}
                jobData={state.jobData || {}}
                selectedCVData={state.cvData || {}}
                template={state.selectedTemplate}
                header={headerContent}
                body={bodyContent}
                footer={footerContent}
              />
            </div>
          </div>
        </div>

        {/* Right Pane (50%) - Editors */}
        <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pl-2 min-h-0">
          {/* Personal Information Section */}
          <div className="bg-white dark:bg-[#141810] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                {(state.coverLetterData.cvId || state.journeyId) && (
                  <button
                    onClick={async () => {
                      try {
                        let targetCvId = state.coverLetterData.cvId;
                        
                        // If no cvId in cover letter but journeyId exists, fetch from journey
                        if (!targetCvId && state.journeyId) {
                          const journeyResponse = await fetch(`/api/application-journey/${state.journeyId}`);
                          if (journeyResponse.ok) {
                            const journeyResult = await journeyResponse.json();
                            const journey = journeyResult.data?.journey || journeyResult.journey;
                            if (journey?.cvId) {
                              targetCvId = journey.cvId.toString();
                            }
                          }
                        }
                        
                        // Fetch CV data from linked CV
                        if (targetCvId) {
                          const cvResponse = await fetch(`/api/cvs/${targetCvId}`);
                          if (cvResponse.ok) {
                            const cvResult = await cvResponse.json();
                            const cv = cvResult.data?.cv || cvResult.cv;
                            if (cv?.cvData) {
                              const loadedCVData = cv.cvData as UnifiedCVDataStructure;
                              setCVData(loadedCVData);
                              // Update header and footer with new CV data
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
                    title="Auto-populate personal information from linked CV"
                  >
                    Auto-fill from CV
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Full Name - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={state.cvData?.basics?.name || ''}
                  onChange={(e) => {
                    const newCVData = {
                      ...(state.cvData || {}),
                      basics: {
                        ...(state.cvData?.basics || {}),
                        name: e.target.value
                      }
                    };
                    setCVData(newCVData);
                    // Update header when name changes
                    const updatedHeader = formatCoverLetterHeader(newCVData, state.jobData);
                    setHeaderContent(updatedHeader);
                    updateHeader(updatedHeader);
                    // Update footer when name changes
                    const updatedFooter = formatCoverLetterFooter(newCVData);
                    setFooterContent(updatedFooter);
                    updateFooter(updatedFooter);
                  }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Email - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={state.cvData?.basics?.email || ''}
                  onChange={(e) => {
                    const newCVData = {
                      ...(state.cvData || {}),
                      basics: {
                        ...(state.cvData?.basics || {}),
                        email: e.target.value
                      }
                    };
                    setCVData(newCVData);
                    // Update header when email changes
                    const updatedHeader = formatCoverLetterHeader(newCVData, state.jobData);
                    setHeaderContent(updatedHeader);
                    updateHeader(updatedHeader);
                  }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="john.doe@example.com"
                  required
                />
              </div>

              {/* Phone - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={state.cvData?.basics?.phone || ''}
                  onChange={(e) => {
                    const newCVData = {
                      ...(state.cvData || {}),
                      basics: {
                        ...(state.cvData?.basics || {}),
                        phone: e.target.value
                      }
                    };
                    setCVData(newCVData);
                    // Update header when phone changes
                    const updatedHeader = formatCoverLetterHeader(newCVData, state.jobData);
                    setHeaderContent(updatedHeader);
                    updateHeader(updatedHeader);
                  }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              {/* Location - Required */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={(() => {
                    const location = state.cvData?.basics?.location;
                    if (typeof location === 'string') return location;
                    if (location?.city && location?.region) {
                      return `${location.city}, ${location.region}`;
                    }
                    return location?.city || location?.region || location?.countryCode || '';
                  })()}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    const parts = inputValue.split(',').map(p => p.trim());
                    const newCVData = {
                      ...(state.cvData || {}),
                      basics: {
                        ...(state.cvData?.basics || {}),
                        location: {
                          ...(typeof state.cvData?.basics?.location === 'object' ? state.cvData.basics.location : {}),
                          city: parts[0] || '',
                          region: parts[1] || '',
                          countryCode: parts[2] || ''
                        }
                      }
                    };
                    setCVData(newCVData);
                    // Update header when location changes
                    const updatedHeader = formatCoverLetterHeader(newCVData, state.jobData);
                    setHeaderContent(updatedHeader);
                    updateHeader(updatedHeader);
                  }}
                  className="w-full px-4 py-2.5 bg-white dark:bg-[#1a230f] border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-colors"
                  placeholder="San Francisco, CA"
                  required
                />
              </div>
            </div>
            <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
              This information will be used in your cover letter header. Date, hiring manager, and company name are automatically added from the linked job.
            </p>
          </div>

          {/* Job Card Section - Show if job data is available from journey */}
          {state.jobData && (
            <div className="bg-white dark:bg-[#141810] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Linked Job</h3>
                <span className="text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                  From Journey
                </span>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-base">
                    {state.jobData.jobTitle || state.jobData.title || 'Untitled Job'}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {state.jobData.company || 'Unknown Company'}
                  </p>
                </div>
                
                {state.jobData.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{state.jobData.location}</span>
                  </div>
                )}
                
                {state.jobData.jobDescription && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                    {state.jobData.jobDescription}
                  </p>
                )}
              </div>
            </div>
          )}

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
              placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the [Position] role at [Company]...&#10;&#10;[Your compelling content here]"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-200">
                Use formatting tools above to style your text
              </p>
              <span className="text-xs text-gray-600 dark:text-gray-200">
                {(headerContent + bodyContent + footerContent).length} characters
              </span>
            </div>
          </div>

          {/* Footer Section */}
          <div className="bg-white dark:bg-[#141810] rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Footer</h3>
                {state.cvData && (
                  <button
                    onClick={() => {
                      const autoFooter = formatCoverLetterFooter(state.cvData!);
                      setFooterContent(autoFooter);
                      updateFooter(autoFooter);
                    }}
                    className="text-xs px-2 py-1 rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                    title="Auto-populate footer from CV data"
                  >
                    Auto-fill from CV
                  </button>
                )}
              </div>
              <WYSIWYGToolbar showAIButton={false} />
            </div>
            
            <WYSIWYGEditor
              value={footerContent}
              onChange={handleFooterChange}
              rows={3}
              placeholder="Sincerely,&#10;Your Name"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-200">
                Footer: "Sincerely," and your name (auto-populated from CV data)
              </p>
              {!footerContent && state.cvData && (
                <button
                  onClick={() => {
                    const autoFooter = formatCoverLetterFooter(state.cvData!);
                    setFooterContent(autoFooter);
                    updateFooter(autoFooter);
                  }}
                  className="text-xs px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  Generate Footer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

