'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';

interface ImpactScoreAnalysisCardProps {
  careerAnalysis: {
    impactScore?: {
      quantifiableStatements?: number;
      highImpactVerbs?: number;
      industryKeywords?: number;
    };
  };
}

const ImpactScoreAnalysisCard: React.FC<ImpactScoreAnalysisCardProps> = ({ careerAnalysis }) => {
  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Impact Score Analysis</h3>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Data-driven assessment of your CV's competitive strength based on quantifiable achievements and action-oriented language.
      </p>
      
      <div className="space-y-4">
        {/* Impact Metrics Table */}
        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Your CV Impact Metrics</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Metric</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Your Score</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Target</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Status</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-white/70">
                <tr className="border-b border-gray-200 dark:border-white/5">
                  <td className="py-2 text-xs">Quantifiable Statements</td>
                  <td className="py-2 text-xs">{careerAnalysis.impactScore?.quantifiableStatements || 3}/15</td>
                  <td className="py-2 text-xs">10+</td>
                  <td className={`py-2 text-xs ${(careerAnalysis.impactScore?.quantifiableStatements || 3) < 10 ? 'text-red-500' : 'text-[#80FF00]'}`}>
                    {(careerAnalysis.impactScore?.quantifiableStatements || 3) < 10 ? 'Needs Work' : 'Good'}
                  </td>
                </tr>
                <tr className="border-b border-gray-200 dark:border-white/5">
                  <td className="py-2 text-xs">High-Impact Verbs</td>
                  <td className="py-2 text-xs">{careerAnalysis.impactScore?.highImpactVerbs || 8}/30</td>
                  <td className="py-2 text-xs">25+</td>
                  <td className={`py-2 text-xs ${(careerAnalysis.impactScore?.highImpactVerbs || 8) < 25 ? 'text-yellow-500' : 'text-[#80FF00]'}`}>
                    {(careerAnalysis.impactScore?.highImpactVerbs || 8) < 25 ? 'Moderate' : 'Good'}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-xs">Industry Keywords</td>
                  <td className="py-2 text-xs">{careerAnalysis.impactScore?.industryKeywords || 75}%</td>
                  <td className="py-2 text-xs">90%+</td>
                  <td className={`py-2 text-xs ${(careerAnalysis.impactScore?.industryKeywords || 75) < 90 ? 'text-yellow-500' : 'text-[#80FF00]'}`}>
                    {(careerAnalysis.impactScore?.industryKeywords || 75) < 90 ? 'Good' : 'Excellent'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insights */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
            <h4 className="text-[#80FF00] text-sm font-bold mb-2">🚨 Critical Gap</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Only {careerAnalysis.impactScore?.quantifiableStatements || 3} out of 15 bullet points contain numbers or percentages. Hiring managers look for measurable impact.
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
            <h4 className="text-[#80FF00] text-sm font-bold mb-2">⚠️ Improvement Needed</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Shift from passive verbs like "Responsible for" to action verbs like "Spearheaded" and "Drove".
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImpactScoreAnalysisCard;

