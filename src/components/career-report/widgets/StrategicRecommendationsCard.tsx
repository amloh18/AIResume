'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

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
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {typeof careerAnalysis.strategicSuggestions?.hardSkill === 'string' 
              ? careerAnalysis.strategicSuggestions.hardSkill 
              : careerAnalysis.strategicSuggestions?.hardSkill?.skill || 'Not specified'}
          </p>
          {typeof careerAnalysis.strategicSuggestions?.hardSkill === 'object' && careerAnalysis.strategicSuggestions.hardSkill?.rationale && (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
              {careerAnalysis.strategicSuggestions.hardSkill.rationale}
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-[#80FF00] text-sm font-bold mb-2">🤝 Critical Soft Skill</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {typeof careerAnalysis.strategicSuggestions?.softSkill === 'string' 
              ? careerAnalysis.strategicSuggestions.softSkill 
              : careerAnalysis.strategicSuggestions?.softSkill?.skill || 'Not specified'}
          </p>
          {typeof careerAnalysis.strategicSuggestions?.softSkill === 'object' && careerAnalysis.strategicSuggestions.softSkill?.rationale && (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
              {careerAnalysis.strategicSuggestions.softSkill.rationale}
            </p>
          )}
        </div>

        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-[#80FF00] text-sm font-bold mb-2">📈 Improved Experience</h4>
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
            {careerAnalysis.strategicSuggestions?.experienceReframe?.improved || 
             careerAnalysis.strategicSuggestions?.improvedExperience || 
             'Not specified'}
          </p>
          {careerAnalysis.strategicSuggestions?.experienceReframe?.rationale && (
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
              {careerAnalysis.strategicSuggestions.experienceReframe.rationale}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategicRecommendationsCard;

