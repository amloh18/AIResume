'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, XCircle, Target } from 'lucide-react';

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
    return <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">{text}</p>;
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
        {/* Row 1: Gauge and Score Breakdown in 2 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Column 1: Circular Gauge */}
          <div className="flex items-center justify-center">
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
          </div>

          {/* Column 2: Impact Score and Coherence */}
          <div className="space-y-4">
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
        </div>

        {/* Row 2: Experience Level - Full Width */}
        {experienceLevel && (
          <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-[#80FF00]" />
              <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Experience Level</h4>
            </div>
            <h4 className="text-xl font-bold text-[#80FF00] mb-2">{experienceLevel.level}</h4>
            {convertToBulletPoints(experienceLevel.rationale)}
          </div>
        )}

        {/* Row 3: Quick Stats - Full Width */}
        <div className="bg-gray-50 dark:bg-[#313a28] border border-gray-200 dark:border-white/10 rounded-lg p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start">
              <span className="text-sm text-gray-600 dark:text-gray-400">Quantifiable Statements</span>
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {impactScore?.quantifiableStatements || 0}/15
              </span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start">
              <span className="text-sm text-gray-600 dark:text-gray-400">High-Impact Verbs</span>
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
                {impactScore?.highImpactVerbs || 0}/30
              </span>
            </div>
            <div className="flex items-center justify-between sm:flex-col sm:items-start sm:justify-start">
              <span className="text-sm text-gray-600 dark:text-gray-400">CV Length</span>
              <span className="font-semibold text-gray-900 dark:text-white text-lg">
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

