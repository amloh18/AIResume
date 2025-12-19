'use client';

import React from 'react';
import { Briefcase, Building2, MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface JobCardProps {
  job: {
    id?: string;
    _id?: string;
    jobTitle?: string;
    title?: string;
    company?: string;
    location?: string;
    status?: string;
    jobUrl?: string;
  };
  onClick: () => void;
}

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  created: 'Created',
  applied: 'Applied',
  screening: 'Screening',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn'
};

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
  created: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  applied: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  screening: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
  interview: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  offer: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  accepted: { bg: 'bg-lime-100 dark:bg-lime-900/30', text: 'text-lime-700 dark:text-lime-300' },
  withdrawn: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' }
};

export default function JobCard({ job, onClick }: JobCardProps) {
  const jobId = job.id || job._id || '';
  const jobTitle = job.jobTitle || job.title || 'Untitled Job';
  const company = job.company || 'Unknown Company';
  const location = job.location;
  const status = job.status || 'created';
  const statusLabel = statusLabels[status] || status;
  const statusColor = statusColors[status] || statusColors.created;

  return (
    <motion.div
      onClick={onClick}
      className="relative cursor-pointer group"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Card Background */}
      <div className="absolute inset-0 bg-white dark:bg-[#1a2015] border border-gray-200 dark:border-white/20 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200" />
      
      {/* Card Content */}
      <div className="relative z-10 p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-[color:var(--accent-primary)] flex-shrink-0" />
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate group-hover:text-[color:var(--accent-primary)] transition-colors">
                {jobTitle}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{company}</span>
            </div>
            {location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{location}</span>
              </div>
            )}
          </div>
        </div>

        {/* View Details Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="w-full mt-2 px-2.5 py-1.5 bg-[color:var(--accent-primary)]/10 hover:bg-[color:var(--accent-primary)]/20 text-[color:var(--accent-primary)] rounded-lg text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5 group-hover:bg-[color:var(--accent-primary)]/20"
        >
          <span>View Details</span>
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

