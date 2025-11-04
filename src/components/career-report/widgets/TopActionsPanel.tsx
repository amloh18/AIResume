'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Target, Sparkles } from 'lucide-react';

interface TopActionsPanelProps {
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
  };
  strategicSuggestions?: {
    hardSkill?: { skill: string; rationale: string } | string;
    softSkill?: { skill: string; rationale: string } | string;
    experienceReframe?: { original: string; improved: string; rationale: string };
  };
  cvOptimization?: {
    totalLength?: string;
    bulletPointLength?: string;
  };
}

const TopActionsPanel: React.FC<TopActionsPanelProps> = ({
  impactScore,
  strategicSuggestions,
  cvOptimization
}) => {
  const actions = [];

  // Action 1: Add quantifiable statements
  const quantifiableNeeded = Math.max(0, 10 - (impactScore?.quantifiableStatements || 0));
  if (quantifiableNeeded > 0) {
    const estimatedPoints = Math.min(quantifiableNeeded * 4, 30);
    actions.push({
      id: 'quantifiable',
      priority: 1,
      title: `Add ${quantifiableNeeded} more quantifiable statements`,
      description: `Add numbers, percentages, and metrics to your experience bullets. Current: ${impactScore?.quantifiableStatements || 0}/15`,
      estimatedPoints,
      icon: TrendingUp,
      color: 'red'
    });
  }

  // Action 2: Improve CV length
  if (cvOptimization?.totalLength && !cvOptimization.totalLength.includes('1')) {
    actions.push({
      id: 'length',
      priority: 2,
      title: 'Optimize CV length to 1 page',
      description: `Your CV is currently ${cvOptimization.totalLength}. Condense to 1 page for better ATS compatibility.`,
      estimatedPoints: 15,
      icon: Target,
      color: 'yellow'
    });
  }

  // Action 3: Add hard skill
  if (strategicSuggestions?.hardSkill) {
    const skill = typeof strategicSuggestions.hardSkill === 'string' 
      ? strategicSuggestions.hardSkill 
      : strategicSuggestions.hardSkill.skill;
    actions.push({
      id: 'hardSkill',
      priority: 3,
      title: `Develop critical skill: ${skill}`,
      description: typeof strategicSuggestions.hardSkill === 'object' 
        ? strategicSuggestions.hardSkill.rationale 
        : 'Essential for career advancement',
      estimatedPoints: 20,
      icon: Sparkles,
      color: 'blue'
    });
  }

  // If we have less than 3 actions, add generic ones
  if (actions.length < 3) {
    const highImpactNeeded = Math.max(0, 25 - (impactScore?.highImpactVerbs || 0));
    if (highImpactNeeded > 0 && !actions.find(a => a.id === 'verbs')) {
      actions.push({
        id: 'verbs',
        priority: actions.length + 1,
        title: `Replace ${highImpactNeeded} verbs with high-impact alternatives`,
        description: 'Use action verbs like "Spearheaded", "Drove", "Architected" instead of passive language.',
        estimatedPoints: 12,
        icon: TrendingUp,
        color: 'purple'
      });
    }
  }

  // Sort by priority and take top 3
  const topActions = actions.sort((a, b) => a.priority - b.priority).slice(0, 3);

  const getColorClasses = (color: string) => {
    const colors = {
      red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400',
      yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600 dark:text-yellow-400',
      blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <Target className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Top 3 Priority Actions</h3>
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm leading-relaxed">
        Focus on these actions to maximize your CV score improvement.
      </p>

      <div className="space-y-4">
        {topActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <motion.div
              key={action.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-8 h-8 rounded bg-[#80FF00]/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#80FF00]" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#80FF00] bg-[#80FF00]/10 px-2 py-0.5 rounded">
                        #{action.priority}
                      </span>
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                        +{action.estimatedPoints} pts
                      </span>
                    </div>
                    <h4 className="text-[#80FF00] font-bold mb-2 text-sm">{action.title}</h4>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{action.description}</p>
                  </div>
                </div>
                <button className="flex items-center gap-1 text-sm font-semibold text-[#80FF00] hover:underline flex-shrink-0">
                  Apply
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {topActions.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#80FF00]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-[#80FF00]" />
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Your CV is in excellent shape! No critical actions needed.
          </p>
        </div>
      )}
    </div>
  );
};

export default TopActionsPanel;

