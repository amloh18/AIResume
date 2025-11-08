'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

// Helper function to convert paragraphs to bullet points
const convertToBulletPoints = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Split by common sentence endings and newlines
  const sentences = text
    .split(/(?<=[.!?])\s+|(?<=\n)/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  // If text is already short or has few sentences, return as is
  if (sentences.length <= 1) {
    return <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{text}</p>;
  }
  
  // Convert to bullet points
  return (
    <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400 text-sm">
      {sentences.map((sentence, index) => (
        <li key={index} className="leading-relaxed">{sentence}</li>
      ))}
    </ul>
  );
};

interface StrategicRecommendationsCardProps {
  careerAnalysis: {
    strategicSuggestions?: {
      hardSkill?: { skill: string; rationale: string } | string;
      softSkill?: { skill: string; rationale: string } | string;
      experienceReframe?: { original: string; improved: string; rationale: string };
      improvedExperience?: string;
    };
  };
}

const StrategicRecommendationsCard: React.FC<StrategicRecommendationsCardProps> = ({ careerAnalysis }) => {
  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Strategic Recommendations</h3>
      </div>
      
      <div className="space-y-4">
        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-[#80FF00] text-sm font-bold mb-2">🔧 Critical Hard Skill</h4>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            {typeof careerAnalysis.strategicSuggestions?.hardSkill === 'string' 
              ? careerAnalysis.strategicSuggestions.hardSkill 
              : careerAnalysis.strategicSuggestions?.hardSkill?.skill || 'Not specified'}
          </div>
          {typeof careerAnalysis.strategicSuggestions?.hardSkill === 'object' && careerAnalysis.strategicSuggestions.hardSkill?.rationale && (
            <div className="mt-2">
              {convertToBulletPoints(careerAnalysis.strategicSuggestions.hardSkill.rationale)}
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-[#80FF00] text-sm font-bold mb-2">🤝 Critical Soft Skill</h4>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            {typeof careerAnalysis.strategicSuggestions?.softSkill === 'string' 
              ? careerAnalysis.strategicSuggestions.softSkill 
              : careerAnalysis.strategicSuggestions?.softSkill?.skill || 'Not specified'}
          </div>
          {typeof careerAnalysis.strategicSuggestions?.softSkill === 'object' && careerAnalysis.strategicSuggestions.softSkill?.rationale && (
            <div className="mt-2">
              {convertToBulletPoints(careerAnalysis.strategicSuggestions.softSkill.rationale)}
            </div>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-[#80FF00] text-sm font-bold mb-2">📈 Improved Experience</h4>
          <div className="text-gray-600 dark:text-gray-400 text-sm">
            {careerAnalysis.strategicSuggestions?.experienceReframe?.improved || 
             careerAnalysis.strategicSuggestions?.improvedExperience || 
             'Not specified'}
          </div>
          {careerAnalysis.strategicSuggestions?.experienceReframe?.rationale && (
            <div className="mt-2">
              {convertToBulletPoints(careerAnalysis.strategicSuggestions.experienceReframe.rationale)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategicRecommendationsCard;

