'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Edit2, Award } from 'lucide-react';

interface JobRoleCardProps {
  targetRole?: string;
  seniorityLevel?: string;
  optimizationScore?: number;
  cvType?: 'master' | 'standalone';
  onEditRole?: () => void;
}

const seniorityLabels: Record<string, string> = {
  beginner: 'Beginner (0-2 years)',
  experienced: 'Experienced (2-5 years)',
  professional: 'Professional (5-10 years)',
  senior: 'Senior (10-15 years)',
  executive: 'Executive (15+ years)'
};

const getScoreColor = (score?: number) => {
  if (!score) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' };
  if (score >= 80) return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' };
  if (score >= 60) return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' };
  return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' };
};

export default function JobRoleCard({
  targetRole,
  seniorityLevel,
  optimizationScore,
  cvType = 'master',
  onEditRole
}: JobRoleCardProps) {
  const role = targetRole || 'Not set';
  const seniority = seniorityLevel ? seniorityLabels[seniorityLevel] || seniorityLevel : 'Not set';
  const scoreColor = getScoreColor(optimizationScore);
  const isMaster = cvType === 'master';

  return (
    <motion.div
      className="relative cursor-pointer group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Card Background */}
      <div className="absolute inset-0 bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-white/20 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200" />
      
      {/* Card Content */}
      <div className="relative z-10 p-3 space-y-2">
        {/* Header with Badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="w-3.5 h-3.5 text-[color:var(--accent-primary)] flex-shrink-0" />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-[color:var(--accent-primary)] transition-colors">
                {role}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Award className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{seniority}</span>
            </div>
          </div>
          {isMaster && (
            <span className="px-2 py-0.5 text-[10px] font-medium bg-[#80FF00]/20 text-[#80FF00] rounded border border-[#80FF00]/30">
              Master CV
            </span>
          )}
        </div>

        {/* Optimization Score */}
        {optimizationScore !== undefined && (
          <div className="pt-2 border-t border-gray-100 dark:border-white/10">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                Optimization Score
              </span>
              <span className={`text-xs font-semibold ${scoreColor.text}`}>
                {optimizationScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${scoreColor.bg}`}
                style={{ width: `${optimizationScore}%` }}
              />
            </div>
          </div>
        )}

        {/* Edit Role Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditRole?.();
          }}
          className="w-full mt-2 px-2.5 py-1.5 bg-[color:var(--accent-primary)]/10 hover:bg-[color:var(--accent-primary)]/20 text-[color:var(--accent-primary)] rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5 group-hover:bg-[color:var(--accent-primary)]/20"
        >
          <Edit2 className="w-3 h-3" />
          <span>Edit Role</span>
        </button>
      </div>
    </motion.div>
  );
}

