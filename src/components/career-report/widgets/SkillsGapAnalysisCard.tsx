'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';

interface SkillsGapAnalysisCardProps {
  careerAnalysis: {
    skillsGap?: {
      skills?: Array<{
        name: string;
        mentions: number;
        quantifiedUse: number;
        gapInsight: string;
      }>;
      focusDistribution?: Array<{
        area: string;
        percentage: number;
      }>;
    };
  };
}

const SkillsGapAnalysisCard: React.FC<SkillsGapAnalysisCardProps> = ({ careerAnalysis }) => {
  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <Lightbulb className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Skills Gap Analysis</h3>
      </div>
      
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Analysis of skill depth vs. frequency and focus area distribution in your CV.
      </p>
      
      <div className="space-y-4">
        {/* Skill Depth Analysis */}
        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Skill Depth vs. Frequency</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10">
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Skill</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Mentions</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Quantified</th>
                  <th className="text-left py-2 text-gray-600 dark:text-white/80 text-xs">Gap</th>
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-white/70">
                {careerAnalysis.skillsGap?.skills?.slice(0, 5).map((skill, index) => (
                  <tr key={index} className="border-b border-gray-200 dark:border-white/5">
                    <td className="py-2 text-xs">{skill.name}</td>
                    <td className="py-2 text-xs">{skill.mentions} times</td>
                    <td className="py-2 text-xs">{skill.quantifiedUse} times</td>
                    <td className={`py-2 text-xs ${
                      skill.gapInsight === 'Major Gap' ? 'text-red-500' :
                      skill.gapInsight === 'Minor Gap' ? 'text-yellow-500' :
                      'text-[#80FF00]'
                    }`}>
                      {skill.gapInsight}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Focus Areas */}
        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-4">CV Focus Distribution</h4>
          <div className="space-y-3">
            {careerAnalysis.skillsGap?.focusDistribution?.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-white/80 text-sm">{item.area}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-300 dark:bg-white/10 rounded-full h-2">
                    <div className="bg-[#80FF00] h-2 rounded-full" style={{width: `${item.percentage}%`}}></div>
                  </div>
                  <span className="text-gray-600 dark:text-white/60 text-sm">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-3 mt-4">
            <p className="text-[#80FF00] text-sm font-bold mb-2">Career Advancement Tip</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              To advance to Senior roles, refactor 15-20% of delivery bullets to focus on Strategy and People Management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillsGapAnalysisCard;

