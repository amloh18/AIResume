'use client';

import React, { useState } from 'react';
import WYSIWYGEditor, { WYSIWYGToolbar } from '@/components/ui/WYSIWYGEditor';
import { AISuggestionsPanel } from './AISuggestionsPanel';

interface CoverLetterStructureContentProps {
  coverLetterData: any;
  onUpdate: (data: any) => void;
  cvData?: any;
  jobData?: any;
  userId: string;
}

const CoverLetterStructureContent: React.FC<CoverLetterStructureContentProps> = ({
  coverLetterData,
  onUpdate,
  cvData,
  jobData,
  userId
}) => {
  // Initialize header and body from content if not already present
  const getHeaderContent = () => {
    if (coverLetterData?.header) return coverLetterData.header;
    
    // Extract header from content (first 3 lines typically)
    const content = coverLetterData?.content || '';
    const lines = content.split('\n');
    return lines.slice(0, 3).join('\n');
  };

  const getBodyContent = () => {
    if (coverLetterData?.body) return coverLetterData.body;
    
    // Extract body from content (after first 3 lines)
    const content = coverLetterData?.content || '';
    const lines = content.split('\n');
    return lines.slice(3).join('\n');
  };

  const [headerContent, setHeaderContent] = useState(getHeaderContent());
  const [bodyContent, setBodyContent] = useState(getBodyContent());
  
  // AI suggestions state for body
  const [showBodySuggestions, setShowBodySuggestions] = useState(false);
  const [bodySuggestions, setBodySuggestions] = useState<Array<{ method: string; content: string; size?: string }>>([]);
  const [loadingBodySuggestions, setLoadingBodySuggestions] = useState(false);

  // Update parent when content changes
  const handleHeaderChange = (value: string) => {
    setHeaderContent(value);
    const fullContent = `${value}\n\n${bodyContent}`;
    onUpdate({
      ...coverLetterData,
      header: value,
      body: bodyContent,
      content: fullContent
    });
  };

  const handleBodyChange = (value: string) => {
    setBodyContent(value);
    const fullContent = `${headerContent}\n\n${value}`;
    onUpdate({
      ...coverLetterData,
      header: headerContent,
      body: value,
      content: fullContent
    });
  };


  const generateAISuggestions = async () => {
    if (!userId || !cvData || !jobData) {
      console.error('❌ CoverLetterStructureContent - Missing required data for AI suggestions');
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
          userId,
          jobData,
          sectionData: { content: bodyContent },
          sectionType: 'cover_letter_body',
          currentText: bodyContent || '',
          // Pass cvData with metadata if available
          cvData: {
            ...cvData,
            // Include metadata if it exists in the CV document
            metadata: (cvData as any)?.metadata || {}
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate suggestions: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ CoverLetterStructureContent - AI suggestions received:', result);
      
      // Ensure we have suggestions array
      if (result.suggestions && Array.isArray(result.suggestions) && result.suggestions.length > 0) {
        setBodySuggestions(result.suggestions);
      } else {
        console.error('❌ CoverLetterStructureContent - Invalid suggestions format:', result);
        setShowBodySuggestions(false);
      }
    } catch (error) {
      console.error('❌ CoverLetterStructureContent - Error generating AI suggestions:', error);
      setShowBodySuggestions(false);
    } finally {
      setLoadingBodySuggestions(false);
    }
  };

  const handleSelectSuggestion = (content: string) => {
    handleBodyChange(content);
    setShowBodySuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Header</h3>
          
          {/* Formatting Toolbar for Header */}
          <WYSIWYGToolbar
            showAIButton={false}
          />
        </div>
        
        <WYSIWYGEditor
          value={headerContent}
          onChange={handleHeaderChange}
          rows={3}
          placeholder="Your Name&#10;Your Email | Your Phone&#10;Your Address"
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Include your contact information here (name, email, phone, address)
        </p>
      </div>

      {/* Body Section */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Body</h3>
          
          {/* Formatting Toolbar for Body with AI button */}
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
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use formatting tools above to style your text
          </p>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {(headerContent + bodyContent).length} characters
          </span>
        </div>
      </div>
    </div>
  );
};

export default CoverLetterStructureContent;