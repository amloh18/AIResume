'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { JobsMetrics, JobListing, JobsFilter } from '@/types/automation-schema';
import MetricsGrid from './JobsDashboard/MetricsGrid';
import ChartsRow from './JobsDashboard/ChartsRow';
import FiltersBar from './JobsDashboard/FiltersBar';
import JobsTable from './JobsDashboard/JobsTable';
import JobsLoadingState from './JobsDashboard/JobsLoadingState';
import JobsErrorState from './JobsDashboard/JobsErrorState';
import { QuotaIndicator } from '@/components/jobs/QuotaIndicator';
import { RegionSelector } from '@/components/jobs/RegionSelector';
import { Sparkles, Zap, Briefcase, Settings, MapPin, DollarSign, BarChart3, History } from 'lucide-react';
import { AutoApplyPanel } from '@/components/jobs/AutoApplyPanel';
import { ApplicationsPanel } from '@/components/jobs/ApplicationsPanel';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';

export default function JobsDashboard() {
  const [activeTab, setActiveTab] = useState<'discover' | 'metrics' | 'autoapply' | 'applications' | 'settings'>('discover');
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['discover', 'metrics', 'autoapply', 'applications', 'settings'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [searchParams]);
  const [region, setRegion] = useState<'UK' | 'India'>('UK');
  const [metrics, setMetrics] = useState<JobsMetrics | null>(null);
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [filters, setFilters] = useState<JobsFilter>({
    sortBy: 'matchScore',
    sortOrder: 'desc',
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs/metrics', {
        headers: {
          'x-user-id': 'temp-user-id',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch metrics, using default values');
        setMetrics(null);
        return;
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err: any) {
      console.error('Error fetching metrics:', err);
      setError(err.message);
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      });

      if (filters.searchText) params.set('searchText', filters.searchText);
      if (filters.matchScoreMin !== undefined)
        params.set('matchScoreMin', filters.matchScoreMin.toString());
      if (filters.matchScoreMax !== undefined)
        params.set('matchScoreMax', filters.matchScoreMax.toString());
      if (filters.companies?.length)
        params.set('companies', filters.companies.join(','));
      if (filters.locations?.length)
        params.set('locations', filters.locations.join(','));
      if (filters.sources?.length)
        params.set('sources', filters.sources.join(','));
      if (filters.atsTypes?.length)
        params.set('atsTypes', filters.atsTypes.join(','));
      if (filters.appliedStatus?.length)
        params.set('appliedStatus', filters.appliedStatus.join(','));
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.sortOrder) params.set('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/jobs/list?${params}`, {
        headers: {
          'x-user-id': 'temp-user-id',
        },
      });

      if (!response.ok) {
        console.warn('Failed to fetch jobs, using default values');
        setJobs([]);
        setLoading(false);
        return;
      }

      const data = await response.json();
      setJobs(data.jobs);
      setTotal(data.total);
      setHasMore(data.hasMore);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching jobs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      fetchJobs();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [fetchJobs]);

  const handleRetry = () => {
    setError(null);
    fetchMetrics();
    fetchJobs();
  };

  const handleFilterChange = (newFilters: Partial<JobsFilter>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      sortBy: 'matchScore',
      sortOrder: 'desc',
    });
    setPage(1);
  };

  if (error && !metrics) {
    return <JobsErrorState message={error} onRetry={handleRetry} />;
  }

  return (
    <div className="relative">
      {/* Blurred "Coming Soon" Overlay */}
      <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="absolute inset-0 backdrop-blur-[6px] bg-white/20 dark:bg-black/20" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative bg-white dark:bg-[#141810] p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-gray-200 dark:border-[#80FF00]/20 max-w-lg w-full text-center pointer-events-auto mx-4"
        >
          <div className="w-16 h-16 bg-[#80FF00]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-[#80FF00]" />
          </div>
          <h2 className="text-h2 md:text-h1 font-black text-gray-900 dark:text-white uppercase tracking-tighter italic mb-3">
            Jobs Hub Coming Soon
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-body md:text-h3 font-medium leading-relaxed mb-8">
            Automated job applications for power users. We're building the ultimate automation engine to land your dream role while you sleep.
          </p>
          <div className="flex flex-col gap-3">
            <div className="px-4 py-3 bg-[#80FF00]/10 border border-[#80FF00]/20 rounded-xl text-[#80FF00] text-small font-black uppercase tracking-widest italic animate-pulse">
              Exclusive for Pro Users
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-500 font-bold uppercase tracking-widest">
              Available Summer 2026
            </p>
          </div>
        </motion.div>
      </div>

      <div className="space-y-6 opacity-40 grayscale-[0.5] pointer-events-none select-none overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 font-bold text-gray-900 dark:text-white">
              Jobs Hub
            </h1>
            <p className="mt-1 text-small text-gray-600 dark:text-gray-400">
              AI-powered job matching and automation
              <span className="ml-2 inline-flex items-center rounded-full bg-lime-500/20 px-2.5 py-0.5 text-small font-medium text-lime-600 dark:text-lime-400">
                BETA
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <RegionSelector value={region} onChange={setRegion} />
            <QuotaIndicator />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-8">
            {[
              { id: 'discover', label: 'Discover', icon: Sparkles },
              { id: 'metrics', label: 'Metrics', icon: BarChart3 },
              { id: 'autoapply', label: 'Auto-Apply', icon: Zap },
              { id: 'applications', label: 'Applications', icon: Briefcase },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-small transition-all duration-200 outline-none hover:bg-transparent focus:ring-0 focus-visible:ring-0 focus:outline-none focus-visible:outline-none !shadow-none !outline-none hover:!shadow-none focus:!shadow-none group ${activeTab === tab.id
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                style={{ boxShadow: 'none', outline: 'none', WebkitTapHighlightColor: 'transparent' }}
              >
                <tab.icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110" />
                <span className="transition-transform duration-200 group-hover:scale-105">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'discover' && (
          <div className="flex gap-6">
            {/* Left Side - Job List */}
            <div className="w-1/2 space-y-4">
              <FiltersBar
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleResetFilters}
                metrics={metrics}
              />
              <div className="space-y-3 max-h-[calc(100vh-350px)] overflow-y-auto pr-2">
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 animate-pulse">
                        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                  </div>
                ) : jobs.length > 0 ? (
                  jobs.map((job) => (
                    <div
                      key={(job as any)._id || (job as any).id || Math.random().toString()}
                      onClick={() => setSelectedJob(job)}
                      className={`bg-white dark:bg-[#141810] border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedJob && ((selectedJob as any)._id === (job as any)._id || selectedJob === job)
                        ? 'border-lime-500 ring-1 ring-lime-500'
                        : 'border-gray-200 dark:border-white/10 hover:border-lime-400'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                            {job.title}
                          </h3>
                          <p className="text-small text-gray-600 dark:text-gray-400 mt-1">
                            {job.company}
                          </p>
                          <div className="flex items-center gap-2 text-small text-gray-500 dark:text-gray-500 mt-2">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </span>
                          </div>
                        </div>
                        {job.matchScore && (
                          <div className={`ml-3 flex-shrink-0 px-2 py-1 rounded-full text-small font-bold ${job.matchScore >= 80 ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300' :
                            job.matchScore >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                              'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                            }`}>
                            {job.matchScore}%
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <span className="text-small text-gray-400 capitalize">{job.source}</span>
                        <button className="text-small text-lime-600 dark:text-lime-400 font-medium hover:underline">
                          Apply
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl">
                    <Briefcase className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
                      No jobs found
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Try adjusting your search criteria
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-small text-gray-500 dark:text-gray-400">
                  Showing {jobs.length} of {total} jobs
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 text-small border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Previous
                  </button>
                  <span className="text-small text-gray-600 dark:text-gray-400">
                    Page {page}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={!hasMore}
                    className="px-3 py-1 text-small border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side - Job Preview */}
            <div className="w-1/2">
              {selectedJob ? (
                <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 sticky top-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-h3 font-bold text-gray-900 dark:text-white">
                        {selectedJob.title}
                      </h2>
                      <p className="text-h3 text-gray-600 dark:text-gray-400 mt-1">
                        {selectedJob.company}
                      </p>
                    </div>
                    {selectedJob.matchScore && (
                      <div className={`px-3 py-2 rounded-full text-h3 font-bold ${selectedJob.matchScore >= 80 ? 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300' :
                        selectedJob.matchScore >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}>
                        {selectedJob.matchScore}% Match
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <MapPin className="w-4 h-4" />
                      {selectedJob.location}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 capitalize">
                      <Briefcase className="w-4 h-4" />
                      {selectedJob.source}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Description</h3>
                    <p className="text-gray-600 dark:text-gray-400 text-small">
                      {selectedJob.description || 'No description available. Click to view full details on the job posting.'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 bg-lime-500 hover:bg-lime-600 text-black font-medium py-2 px-4 rounded-lg transition-colors">
                      Apply Now
                    </button>
                    <button className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      Save Job
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6 text-center h-full flex items-center justify-center min-h-[400px]">
                  <div>
                    <Sparkles className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
                      Select a job to preview
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      Click on any job from the list to see details
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            {/* Metrics Grid */}
            <MetricsGrid metrics={metrics} loading={!metrics} />

            {/* Charts Row */}
            {metrics && <ChartsRow metrics={metrics} loading={!metrics} />}
          </div>
        )}

        {activeTab === 'autoapply' && (
          <AutoApplyPanel region={region} />
        )}

        {activeTab === 'applications' && (
          <ApplicationsPanel />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
            <h2 className="text-h3 font-semibold text-gray-900 dark:text-white mb-4">
              Auto-Apply Settings
            </h2>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Applications per Hour
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  defaultValue="25"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-small text-gray-500 dark:text-gray-400">
                  Maximum 50 applications per hour (system limit)
                </p>
              </div>
              <div>
                <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Applications per Day
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  defaultValue="50"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-small text-gray-500 dark:text-gray-400">
                  Maximum 100 applications per day (system limit)
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
