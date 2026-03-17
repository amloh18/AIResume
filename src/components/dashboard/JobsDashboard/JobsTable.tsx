'use client';

import React from 'react';
import type { JobListing } from '@/types/automation-schema';
import { ExternalLink, Eye, Send } from 'lucide-react';
import MatchScoreBar from './MatchScoreBar';
import StatusBadge from './StatusBadge';

interface JobsTableProps {
  jobs: JobListing[];
  loading: boolean;
  onJobSelect: (job: JobListing) => void;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange: (field: string, order: 'asc' | 'desc') => void;
}

export default function JobsTable({
  jobs,
  loading,
  onJobSelect,
  page,
  pageSize,
  total,
  hasMore,
  onPageChange,
  onPageSizeChange,
}: JobsTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
        <div className="space-y-3">
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-gray-300 dark:bg-gray-700 rounded animate-pulse"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-12 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No jobs match your filters. Try adjusting your search criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-white/10">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-[#1a230f] border-b-2 border-gray-300 dark:border-gray-600">
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Job Title
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Company
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Match
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-[#141810]">
            {jobs.map((job, index) => (
              <tr
                key={job._id}
                className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  index % 2 === 0
                    ? 'bg-white dark:bg-[#141810]'
                    : 'bg-gray-50 dark:bg-[#1a230f]'
                }`}
              >
                <td className="px-4 py-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {job.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {job.source.replace('_', ' ')}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                  {job.company}
                </td>
                <td className="px-4 py-4 text-gray-700 dark:text-gray-300">
                  {job.location}
                </td>
                <td className="px-4 py-4">
                  <MatchScoreBar score={job.matchScore} />
                </td>
                <td className="px-4 py-4">
                  {job.appliedStatus && <StatusBadge status={job.appliedStatus} />}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onJobSelect(job)}
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-600 dark:text-gray-400"
                      title="View details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <a
                      href={job.applyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors text-gray-600 dark:text-gray-400"
                      title="Open job"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3 p-4">
        {jobs.map((job) => (
          <div
            key={job._id}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            onClick={() => onJobSelect(job)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {job.title}
              </h3>
              <MatchScoreBar score={job.matchScore} />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {job.company} • {job.location}
            </p>
            {job.appliedStatus && <StatusBadge status={job.appliedStatus} />}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {(page - 1) * pageSize + 1} to{' '}
          {Math.min(page * pageSize, total)} of {total} jobs
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page}
          </span>
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={!hasMore}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
