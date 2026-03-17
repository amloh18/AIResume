'use client';

import React from 'react';
import { MapPin, Globe, Building2, Bookmark, ExternalLink, Zap } from 'lucide-react';

export interface JobListing {
  id: string;
  source: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  description?: string;
  jobUrl?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  remote?: boolean;
  atsType?: string;
  postedDate?: string;
  matchScore?: number;
}

interface JobCardProps {
  job: JobListing;
  onApply?: (job: JobListing) => void;
  onSave?: (job: JobListing) => void;
  onViewDetails?: (job: JobListing) => void;
  isApplying?: boolean;
  isSaved?: boolean;
}

export function JobCard({ 
  job, 
  onApply, 
  onSave, 
  onViewDetails,
  isApplying = false,
  isSaved = false 
}: JobCardProps) {
  const formatSalary = (salary?: JobListing['salary']) => {
    if (!salary?.min && !salary?.max) return null;
    
    const format = (num: number) => {
      if (salary?.currency === 'GBP') return `£${(num / 1000).toFixed(0)}k`;
      if (salary?.currency === 'INR') return `₹${(num / 100000).toFixed(1)}L`;
      return `$${(num / 1000).toFixed(0)}k`;
    };
    
    if (salary.min && salary.max) {
      return `${format(salary.min)} - ${format(salary.max)}`;
    }
    return salary.min ? `From ${format(salary.min)}` : `Up to ${format(salary.max!)}`;
  };

  const getSourceColor = (source: string) => {
    switch (source.toLowerCase()) {
      case 'linkedin': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'indeed': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'google': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 'glassdoor': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getMatchScoreColor = (score?: number) => {
    if (!score) return 'bg-gray-200 dark:bg-gray-700';
    if (score >= 80) return 'bg-lime-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const salary = formatSalary(job.salary);

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:shadow-lg transition-all duration-200 hover:border-lime-500/30 group">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
            {job.title}
          </h3>
          <div className="flex items-center gap-1.5 mt-1">
            <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {job.company}
            </p>
          </div>
        </div>
        
        {job.companyLogo ? (
          <img 
            src={job.companyLogo} 
            alt={job.company} 
            className="w-10 h-10 rounded-lg object-cover ml-3 flex-shrink-0 bg-gray-50 dark:bg-gray-800"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center ml-3 flex-shrink-0">
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
        )}
      </div>

      {/* Location & Remote */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin className="w-3.5 h-3.5" />
          <span>{job.location || 'Remote'}</span>
        </div>
        
        {job.remote && (
          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
            <Globe className="w-3 h-3 inline mr-1" />
            Remote
          </span>
        )}
        
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSourceColor(job.source)}`}>
          {job.source}
        </span>
        
        {job.atsType && job.atsType !== 'unknown' && (
          <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded uppercase">
            {job.atsType}
          </span>
        )}
      </div>

      {/* Salary */}
      {salary && (
        <div className="mb-3">
          <span className="text-sm font-medium text-lime-600 dark:text-lime-400">
            {salary}{job.salary?.period ? `/${job.salary.period}` : ''}
          </span>
        </div>
      )}

      {/* Match Score */}
      {job.matchScore !== undefined && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">Match:</span>
          <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${getMatchScoreColor(job.matchScore)}`}
              style={{ width: `${job.matchScore}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 min-w-[32px] text-right">
            {job.matchScore}%
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={() => onApply?.(job)}
          disabled={isApplying}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-500/50 text-black font-medium text-sm rounded-lg transition-colors"
        >
          {isApplying ? (
            <>
              <Zap className="w-4 h-4 animate-pulse" />
              Applying...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Apply
            </>
          )}
        </button>
        
        <button
          onClick={() => onSave?.(job)}
          className={`p-2 border rounded-lg transition-colors ${
            isSaved
              ? 'border-lime-500 bg-lime-50 dark:bg-lime-900/20 text-lime-600 dark:text-lime-400'
              : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
          title={isSaved ? 'Saved' : 'Save job'}
        >
          <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
        </button>
        
        {job.jobUrl && (
          <a
            href={job.jobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="View original listing"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default JobCard;
