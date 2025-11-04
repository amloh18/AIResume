'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

interface KeywordMatchHeatmapProps {
  industrySpecialization?: {
    keywords?: string[];
    specialization?: string;
  };
  impactScore?: {
    industryKeywords?: number;
  };
}

const KeywordMatchHeatmap: React.FC<KeywordMatchHeatmapProps> = ({
  industrySpecialization,
  impactScore
}) => {
  const keywords = industrySpecialization?.keywords || [];
  const keywordScore = impactScore?.industryKeywords || 0;

  // Group keywords by category (simplified - in real app, this would be more sophisticated)
  const categories = [
    {
      name: 'Technical Skills',
      keywords: keywords.slice(0, 4),
      coverage: keywordScore >= 80 ? 95 : keywordScore >= 60 ? 75 : 60
    },
    {
      name: 'Tools & Platforms',
      keywords: keywords.slice(4, 8),
      coverage: keywordScore >= 80 ? 88 : keywordScore >= 60 ? 70 : 55
    },
    {
      name: 'Methodologies',
      keywords: keywords.slice(8, 12),
      coverage: keywordScore >= 80 ? 82 : keywordScore >= 60 ? 65 : 50
    }
  ].filter(cat => cat.keywords.length > 0);

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'bg-lime-500';
    if (coverage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getCoverageOpacity = (coverage: number) => {
    return coverage / 100;
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <Search className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Keyword Match Heatmap</h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Coverage percentage by category for {industrySpecialization?.specialization || 'target roles'}
      </p>

      <div className="space-y-4">
        {categories.map((category, index) => (
          <div key={index} className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {category.name}
              </span>
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                {category.coverage}%
              </span>
            </div>
            <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className={`h-full ${getCoverageColor(category.coverage)}`}
                style={{ opacity: getCoverageOpacity(category.coverage) }}
                initial={{ width: 0 }}
                animate={{ width: `${category.coverage}%` }}
                transition={{ duration: 1, delay: index * 0.1 }}
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {category.keywords.map((keyword, kIndex) => (
                <span
                  key={kIndex}
                  className="px-2 py-1 bg-[#80FF00]/10 dark:bg-[#80FF00]/20 text-[#80FF00] rounded text-xs font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Overall Keyword Match</span>
          <span className={`text-lg font-bold ${
            keywordScore >= 80 ? 'text-[#80FF00]' : keywordScore >= 60 ? 'text-yellow-500' : 'text-red-500'
          }`}>
            {keywordScore}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeywordMatchHeatmap;

