'use client';

import React from 'react';
import { Target, Edit2, Award, Plus } from 'lucide-react';

interface JobRoleCardProps {
  targetRole?: string;
  seniorityLevel?: string;
  optimizationScore?: number;
  cvType?: 'master' | 'standalone';
  mode?: 'create' | 'edit' | 'edit-master' | 'journey';
  onEditRole?: () => void;
  onAddJD?: () => void;
  hasJD?: boolean;
}

const seniorityLabels: Record<string, string> = {
  beginner: 'Beginner (0-2 years)',
  experienced: 'Experienced (2-5 years)',
  professional: 'Professional (5-10 years)',
  senior: 'Senior (10-15 years)',
  executive: 'Executive (15+ years)'
};

export default function JobRoleCard({
  targetRole,
  seniorityLevel,
  optimizationScore,
  cvType = 'master',
  mode = 'create',
  onEditRole,
  onAddJD,
  hasJD = false
}: JobRoleCardProps) {
  const role = targetRole || 'Not set';
  const seniority = seniorityLevel ? seniorityLabels[seniorityLevel] || seniorityLevel : 'Not set';
  const isMaster = cvType === 'master';
  const isStandalone = cvType === 'standalone';
  const isEditMode = mode === 'edit' || mode === 'edit-master';

  return (
    <div className="bg-white dark:bg-[#1a230f] rounded-xl shadow-sm shadow-black/10 dark:shadow-black/30 border border-gray-200 dark:border-white/5 overflow-hidden p-3">
      {/* Role Title with Edit Button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Target className="w-4 h-4 text-[color:var(--accent-primary)] flex-shrink-0" />
          <span className="text-sm font-semibold text-[color:var(--text-primary)] truncate">
            {role}
          </span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditRole?.();
          }}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
          title="Edit Role"
        >
          <Edit2 className="w-3.5 h-3.5 text-[color:var(--text-secondary)]" />
        </button>
      </div>

      {/* Seniority Level */}
      <div className="flex items-center gap-2 mb-3">
        <Award className="w-3.5 h-3.5 text-[color:var(--text-tertiary)] flex-shrink-0" />
        <span className="text-xs text-[color:var(--text-secondary)] truncate">{seniority}</span>
      </div>

      {/* Mode Chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {isMaster && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-[#013f2e]/20 text-[#013f2e] rounded border border-[#013f2e]/30">
            Profile
          </span>
        )}
        {isStandalone && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 rounded border border-purple-400/30">
            Standalone
          </span>
        )}
        {isEditMode && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-400/30">
            Edit
          </span>
        )}
        {!isEditMode && mode === 'create' && (
          <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded border border-emerald-400/30">
            Create
          </span>
        )}
      </div>

      {/* Add JD Button - only for non-master CVs without JD */}
      {!isMaster && !hasJD && onAddJD && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddJD();
          }}
          className="w-full px-3 py-2 bg-[#013f2e]/10 hover:bg-[#013f2e]/20 border border-[#013f2e]/30 rounded-lg text-[10px] font-medium text-[#013f2e] transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3 h-3" />
          <span>Add JD</span>
        </button>
      )}
    </div>
  );
}
