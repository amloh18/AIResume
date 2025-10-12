import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { EnhancedAIService } from '@/lib/services/enhancedAIService';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { Job } from '@/lib/stores/jobStore';

interface EnhancedAIGenerateButtonProps {
  cvData: UnifiedCVDataStructure;
  jobData: Job | null;
  currentText: string;
  sectionType: 'summary' | 'workExperience' | 'skills' | 'projects' | 'education' | 'certificates';
  jobTitle?: string;
  companyName?: string;
  onContentGenerated: (newContent: string) => void;
  className?: string;
}

export default function EnhancedAIGenerateButton({
  cvData,
  jobData,
  currentText,
  sectionType,
  jobTitle,
  companyName,
  onContentGenerated,
  className = ''
}: EnhancedAIGenerateButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!currentText.trim()) {
      setError('Please enter some content to improve');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const newContent = await EnhancedAIService.generateSectionContent({
        cvData,
        jobData,
        currentText,
        sectionType,
        jobTitle,
        companyName
      });

      onContentGenerated(newContent);
    } catch (error) {
      console.error('AI generation error:', error);
      setError('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !currentText.trim()}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            AI Generate
          </>
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
