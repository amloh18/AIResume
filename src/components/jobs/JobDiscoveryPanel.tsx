'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Filter, RefreshCw, X, Loader2 } from 'lucide-react';
import JobCard, { JobListing } from './JobCard';
import RegionSelector from './RegionSelector';

interface JobDiscoveryPanelProps {
  userId?: string;
  onJobApply?: (job: JobListing) => void;
}

export function JobDiscoveryPanel({ userId, onJobApply }: JobDiscoveryPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [region, setRegion] = useState<'UK' | 'India'>('UK');
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [minMatchScore, setMinMatchScore] = useState(0);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Sample jobs for demo
  const sampleJobs: JobListing[] = [
    {
      id: '1',
      source: 'linkedin',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'London, UK',
      remote: true,
      atsType: 'greenhouse',
      matchScore: 85,
      salary: { min: 70000, max: 90000, currency: 'GBP', period: 'yearly' },
    },
    {
      id: '2',
      source: 'indeed',
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'Bangalore, India',
      remote: true,
      atsType: 'lever',
      matchScore: 72,
      salary: { min: 1500000, max: 2500000, currency: 'INR', period: 'yearly' },
    },
    {
      id: '3',
      source: 'google',
      title: 'Backend Engineer',
      company: 'Google',
      location: 'Remote',
      remote: true,
      matchScore: 65,
    },
  ];

  const fetchJobs = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        region,
        remote: remoteOnly.toString(),
        limit: '20',
      });

      if (searchQuery.trim()) {
        params.set('keywords', searchQuery.trim());
      }

      const response = await fetch(`/api/jobs/portal?${params}`);
      const data = await response.json();

      if (data.success) {
        setJobs(data.data.jobs || []);
        if (data.data.jobs?.length === 0 && !hasSearched) {
          // Use sample data for demo if no jobs found
          setJobs(sampleJobs);
        }
      } else {
        // Use sample data on error
        if (!hasSearched) {
          setJobs(sampleJobs);
        }
        setError(data.error || 'Failed to fetch jobs');
      }
    } catch (err) {
      // Use sample data on network error
      if (!hasSearched) {
        setJobs(sampleJobs);
      }
      setError('Network error. Showing sample jobs.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasSearched(true);
    }
  }, [region, remoteOnly, searchQuery, hasSearched]);

  // Initial fetch
  useEffect(() => {
    if (!hasSearched) {
      fetchJobs();
    }
  }, []);

  const handleSearch = () => {
    setHasSearched(false);
    fetchJobs();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleApply = async (job: JobListing) => {
    if (onJobApply) {
      onJobApply(job);
    }
    // TODO: Call API to apply
    console.log('Applying to job:', job.id);
  };

  const handleSave = (job: JobListing) => {
    // TODO: Save job to user's list
    console.log('Saving job:', job.id);
  };

  const filteredJobs = jobs.filter(job => 
    (job.matchScore || 0) >= minMatchScore
  );

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs, companies, or keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-10 pr-10 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-[#1a230f] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Region Selector */}
          <RegionSelector value={region} onChange={setRegion} />

          {/* Remote Filter */}
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer bg-gray-50 dark:bg-[#1a230f]">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
              className="w-4 h-4 text-lime-500 rounded focus:ring-lime-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">Remote only</span>
          </label>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={loading || refreshing}
            className="px-6 py-2.5 bg-lime-500 hover:bg-lime-600 disabled:bg-lime-500/50 text-black font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            {loading || refreshing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search Jobs
              </>
            )}
          </button>
        </div>
      </div>

      {/* Match Score Filter */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">Minimum Match:</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-lime-500"
          />
          <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
            {minMatchScore}%
          </span>
          {minMatchScore > 0 && (
            <button
              onClick={() => setMinMatchScore(0)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Jobs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="flex gap-2 mb-4">
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
                <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
              </div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Found {filteredJobs.length} jobs
            </p>
            <button
              onClick={() => fetchJobs(true)}
              disabled={refreshing}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={handleApply}
                onSave={handleSave}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No jobs found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try adjusting your search criteria or filters
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setMinMatchScore(0);
              setRemoteOnly(false);
              fetchJobs();
            }}
            className="px-4 py-2 text-sm text-lime-600 dark:text-lime-400 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

export default JobDiscoveryPanel;
