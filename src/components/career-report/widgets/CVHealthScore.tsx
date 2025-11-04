'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Target } from 'lucide-react';

interface CVHealthScoreProps {
  score: number;
  experienceLevel?: {
    level: string;
    rationale: string;
  };
  impactScore?: {
    quantifiableStatements?: number;
    highImpactVerbs?: number;
    industryKeywords?: number;
  };
  careerCoherence?: {
    score?: number;
  };
  cvOptimization?: {
    totalLength?: string;
    bulletPointLength?: string;
  };
}

const CVHealthScore: React.FC<CVHealthScoreProps> = ({
  score,
  experienceLevel,
  impactScore,
  careerCoherence,
  cvOptimization
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#80FF00]';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#80FF00]';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    return 'Needs Work';
  };

  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-[#80FF00] rounded flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-black" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Overall CV Health Score</h3>
      </div>

      <div className="space-y-4">
        {/* Top Section: Circular Gauge and Experience Level */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Circular Gauge */}
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="50"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <motion.circle
                cx="64"
                cy="64"
                r="50"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={getScoreColor(score)}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center px-1">
                <motion.div
                  className={`text-3xl font-bold ${getScoreColor(score)}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  {score}
                </motion.div>
                <div className={`text-xs font-semibold ${getScoreColor(score)} mt-0.5 leading-tight`}>
                  {getScoreLabel(score)}
                </div>
              </div>
            </div>
          </div>

          {/* Experience Level Section */}
          {experienceLevel && (
            <div className="flex-1 bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-[#80FF00]" />
                <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Experience Level</h4>
              </div>
              <h4 className="text-xl font-bold text-[#80FF00] mb-2">{experienceLevel.level}</h4>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
                {experienceLevel.rationale}
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section: Score Breakdown */}
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Impact Score</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {impactScore ? (
                  Math.round(
                    ((impactScore.quantifiableStatements || 0) / 15) * 30 +
                    ((impactScore.highImpactVerbs || 0) / 30) * 40 +
                    ((impactScore.industryKeywords || 0) / 100) * 30
                  )
                ) : 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Coherence</div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {careerCoherence?.score || 0}%
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Quantifiable Statements</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {impactScore?.quantifiableStatements || 0}/15
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">High-Impact Verbs</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {impactScore?.highImpactVerbs || 0}/30
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">CV Length</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {cvOptimization?.totalLength || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVHealthScore;

