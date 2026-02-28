'use client';

import React from 'react';
import type { JobListing } from '@/types/automation-schema';
import { X, ExternalLink, MapPin, Clock, Send, Plus } from 'lucide-react';
import MatchScoreBar from './MatchScoreBar';
import StatusBadge from './StatusBadge';

interface JobDetailModalProps {
  job: JobListing;
  onClose: () => void;
  onApply: () => void;
}

export default function JobDetailModal({
  job,
  onClose,
  onApply,
}: JobDetailModalProps) {
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {job.title}
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              {job.company}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Key Info */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <MapPin className="w-4 h-4" />
              <span>{job.location}</span>
              {job.remote && (
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs rounded-full">
                  Remote
                </span>
              )}
            </div>
            {job.postedDate && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(job.postedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium">
              {job.source.replace('_', ' ')}
            </div>
            <div className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium">
              {job.atsType}
            </div>
          </div>

          {/* Match Score */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Match Score
            </h3>
            <MatchScoreBar score={job.matchScore} />
            {job.matchBreakdown && (
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span>Skills:</span>
                  <span className="font-medium">{job.matchBreakdown.skills}%</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span>Title:</span>
                  <span className="font-medium">{job.matchBreakdown.title}%</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span>Location:</span>
                  <span className="font-medium">{job.matchBreakdown.location}%</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                  <span>Recency:</span>
                  <span className="font-medium">{job.matchBreakdown.recency}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Salary */}
          {job.salaryMin && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Salary Range
              </h3>
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                {job.salaryCurrency}
                {job.salaryMin.toLocaleString()}
                {job.salaryMax && ` - ${job.salaryCurrency}${job.salaryMax.toLocaleString()}`}
              </p>
            </div>
          )}

          {/* Application Status */}
          {job.appliedStatus && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Application Status
              </h3>
              <StatusBadge status={job.appliedStatus} />
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Job Description
              </h3>
              <div className="prose dark:prose-invert text-sm text-gray-600 dark:text-gray-400 max-h-64 overflow-y-auto">
                {job.description}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Original
          </a>
          {!job.appliedStatus && (
            <>
              <button
                onClick={onApply}
                className="flex items-center gap-2 px-6 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                Auto-Apply
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                <Plus className="w-4 h-4" />
                Add to Tracker
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
