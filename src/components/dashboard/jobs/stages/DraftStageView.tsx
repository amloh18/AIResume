'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Building, MapPin, TrendingUp, Sparkles, DollarSign, MoreHorizontal, Award, Globe, Calendar } from 'lucide-react';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  companyLogo?: string;
  location?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  jobDescription?: string;
  description?: string;
  matchScore?: number;
  atsScore?: number;
  sponsorship?: 'yes' | 'no' | 'unknown';
  source?: string;
  createdAt: string;
}

interface DraftStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onCreateJourney: (job: JobApplication) => Promise<void>;
}

const DraftStageView: React.FC<DraftStageViewProps> = ({
  jobs,
  onJobClick,
  onCreateJourney
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const handleCreateJourney = async (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await onCreateJourney(job);
    } catch (error) {
      console.error('Error creating journey:', error);
    }
  };

  const getCompRange = (job: JobApplication) => {
    if (!job.salary?.min && !job.salary?.max) return '-';
    const currency = job.salary.currency || '$';
    const min = job.salary.min ? `${currency}${job.salary.min >= 1000 ? (job.salary.min / 1000).toFixed(0) + 'k' : job.salary.min}` : '';
    const max = job.salary.max ? `${currency}${job.salary.max >= 1000 ? (job.salary.max / 1000).toFixed(0) + 'k' : job.salary.max}` : '';
    return min && max ? `${min} - ${max}` : min || max;
  };

  const sortedJobs = [...jobs].sort((a, b) => {
    const scoreA = a.matchScore || 0;
    const scoreB = b.matchScore || 0;
    return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
  });

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No draft jobs
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Add a job to get started with your application journey.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Quick Filter Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-end">
        <button
          onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <TrendingUp size={14} />
          <span>Sort by Match Score ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#1c2018]">
            <tr>
              {/* Universal Columns */}
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comp Range</th>

              {/* Stage Specific Columns */}
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Match Score</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sponsorship</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date Added</th>

              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {sortedJobs.map((job) => {
              const matchScore = job.matchScore || 98; // Mock default if missing
              return (
                <motion.tr
                  key={job.id || job._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => onJobClick(job)}
                >
                  {/* Company */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-gray-400 overflow-hidden">
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={`${job.company} logo`}
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : null}
                        <span style={{ display: job.companyLogo ? 'none' : 'block' }}>
                          {job.company.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">{job.company}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">{job.jobTitle || job.title}</span>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <MapPin size={14} />
                      <span className="truncate max-w-[150px]">{job.location || '-'}</span>
                    </div>
                  </td>

                  {/* Comp Range */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{getCompRange(job)}</span>
                  </td>

                  {/* Match Score */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${matchScore >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                      matchScore >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                      {matchScore}%
                    </span>
                  </td>

                  {/* Sponsorship */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {job.sponsorship === 'yes' ? (
                      <div className="text-gray-500 dark:text-gray-400" title="Sponsorship Available">
                        <Award size={16} />
                      </div>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-700">-</span>
                    )}
                  </td>

                  {/* Source */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <Globe size={14} />
                      <span>{job.source || 'Manual'}</span>
                    </div>
                  </td>

                  {/* Date Added */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                      <Calendar size={14} />
                      <span>{new Date(job.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCreateJourney(job, e)}
                      className="px-3 py-1.5 bg-lime-500 text-[#141810] text-xs font-bold rounded-lg hover:bg-lime-400 transition-colors inline-flex items-center gap-1.5"
                    >
                      <Sparkles size={14} />
                      Generate Docs
                    </button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DraftStageView;
