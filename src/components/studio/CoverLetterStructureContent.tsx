'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Bold, Italic, List, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const [isGenerating, setIsGenerating] = useState(false);

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

  const applyFormatting = (type: 'bold' | 'italic' | 'bullet' | 'paragraph', targetArea: 'header' | 'body') => {
    const textarea = document.querySelector(
      `textarea[data-cover-letter-${targetArea}]`
    ) as HTMLTextAreaElement;
    
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    let newText = '';

    switch (type) {
      case 'bold':
        newText = textarea.value.substring(0, start) + `**${selectedText}**` + textarea.value.substring(end);
        break;
      case 'italic':
        newText = textarea.value.substring(0, start) + `*${selectedText}*` + textarea.value.substring(end);
        break;
      case 'bullet':
        newText = textarea.value.substring(0, start) + `\n• ${selectedText}` + textarea.value.substring(end);
        break;
      case 'paragraph':
        newText = textarea.value.substring(0, start) + `\n\n${selectedText}\n\n` + textarea.value.substring(end);
        break;
    }

    if (targetArea === 'header') {
      handleHeaderChange(newText);
    } else {
      handleBodyChange(newText);
    }

    setTimeout(() => {
      textarea.focus();
      const offset = type === 'bold' ? 2 : type === 'italic' ? 1 : type === 'bullet' ? 3 : 2;
      textarea.setSelectionRange(start + offset, end + offset);
    }, 0);
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    try {
      // Validate we have required data
      if (!cvData || !jobData) {
        toast.error('Please ensure CV and job data are loaded before generating cover letter');
        return;
      }

      console.log('🔍 Generating cover letter with AI...', {
        hasCvData: !!cvData,
        hasJobData: !!jobData
      });

      // Try the main API endpoint first
      let response = await fetch('/api/ai/cover-letter-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cvData: cvData,
          jobData: jobData,
          recipientName: 'Hiring Manager',
          companyName: jobData.company
        }),
      });

      // If main endpoint fails, try the fallback
      if (!response.ok) {
        console.log('Main API failed, trying fallback...');
        response = await fetch('/api/ai/generate-cover-letter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cvInfo: {
              name: cvData?.basics?.name || '',
              email: cvData?.basics?.email || '',
              phone: cvData?.basics?.phone || '',
              location: cvData?.basics?.location || '',
              summary: cvData?.basics?.summary || '',
              experience: cvData?.work || [],
              skills: cvData?.skills || []
            },
            jobInfo: {
              title: jobData?.title || '',
              company: jobData?.company || '',
              description: jobData?.jobDescription || '',
              requirements: jobData?.requirements || []
            }
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API Error: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      if (result.success && result.content) {
        // Split content into header and body
        const lines = result.content.split('\n');
        const header = lines.slice(0, 3).join('\n');
        const body = lines.slice(3).join('\n');
        
        setHeaderContent(header);
        setBodyContent(body);
        
        onUpdate({
          ...coverLetterData,
          header,
          body,
          content: result.content
        });
        
        toast.success('Cover letter generated successfully!');
      } else {
        throw new Error('No content generated');
      }
    } catch (error) {
      console.error('Error generating cover letter:', error);
      toast.error('Failed to generate cover letter. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI Generator Section */}
      <div className="bg-white dark:bg-[#1a230f] rounded-lg border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">AI Assistant</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Generate a personalized cover letter based on your CV and job position
            </p>
          </div>
          <button
            onClick={handleAIGenerate}
            disabled={isGenerating || !cvData || !jobData}
            className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
        
        {(!cvData || !jobData) && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {!cvData && !jobData ? 'CV and job data required for AI generation' :
               !cvData ? 'CV data required for AI generation' :
               'Job data required for AI generation'}
            </p>
          </div>
        )}
      </div>

      {/* Header Section */}
      <div className="bg-white dark:bg-[#1a230f] rounded-lg border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Header</h3>
          
          {/* Formatting Toolbar for Header */}
          <div className="flex gap-2">
            <button
              onClick={() => applyFormatting('bold', 'header')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('italic', 'header')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <textarea
          data-cover-letter-header
          className="w-full h-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-mono text-sm"
          placeholder="Your Name&#10;Your Email | Your Phone&#10;Your Address"
          value={headerContent}
          onChange={(e) => handleHeaderChange(e.target.value)}
          style={{ whiteSpace: 'pre-wrap' }}
        />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Include your contact information here (name, email, phone, address)
        </p>
      </div>

      {/* Body Section */}
      <div className="bg-white dark:bg-[#1a230f] rounded-lg border border-gray-200 dark:border-white/10 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Body</h3>
          
          {/* Formatting Toolbar for Body */}
          <div className="flex gap-2">
            <button
              onClick={() => applyFormatting('bold', 'body')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('italic', 'body')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('paragraph', 'body')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="New Paragraph"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => applyFormatting('bullet', 'body')}
              className="p-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Bullet Point"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <textarea
          data-cover-letter-body
          className="w-full h-96 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none font-mono text-sm"
          placeholder="Dear Hiring Manager,&#10;&#10;I am writing to express my interest in the [Position] role at [Company]...&#10;&#10;[Your compelling content here]&#10;&#10;Sincerely,&#10;[Your Name]"
          value={bodyContent}
          onChange={(e) => handleBodyChange(e.target.value)}
          style={{ whiteSpace: 'pre-wrap' }}
        />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use **bold** for emphasis, *italic* for style, and double line breaks for paragraphs
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