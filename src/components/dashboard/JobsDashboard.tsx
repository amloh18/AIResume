'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { JobsMetrics, JobListing, JobsFilter } from '@/types/automation-schema';
import MetricsGrid from './JobsDashboard/MetricsGrid';
import ChartsRow from './JobsDashboard/ChartsRow';
import FiltersBar from './JobsDashboard/FiltersBar';
import JobsTable from './JobsDashboard/JobsTable';
import JobDetailModal from './JobsDashboard/JobDetailModal';
import JobsLoadingState from './JobsDashboard/JobsLoadingState';
import JobsErrorState from './JobsDashboard/JobsErrorState';

export default function JobsDashboard() {
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
        throw new Error('Failed to fetch metrics');
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
        throw new Error('Failed to fetch jobs');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Jobs Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            AI-powered job matching and automation
            <span className="ml-2 inline-flex items-center rounded-full bg-lime-500/20 px-2.5 py-0.5 text-xs font-medium text-lime-600 dark:text-lime-400">
              BETA
            </span>
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <MetricsGrid metrics={metrics} loading={!metrics} />

      {/* Charts Row */}
      {metrics && <ChartsRow metrics={metrics} loading={!metrics} />}

      {/* Filters Bar */}
      <FiltersBar
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleResetFilters}
        metrics={metrics}
      />

      {/* Jobs Table */}
      <JobsTable
        jobs={jobs}
        loading={loading}
        onJobSelect={setSelectedJob}
        page={page}
        pageSize={pageSize}
        total={total}
        hasMore={hasMore}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        sortBy={filters.sortBy}
        sortOrder={filters.sortOrder}
        onSortChange={(sortBy, sortOrder) =>
          handleFilterChange({ sortBy, sortOrder })
        }
      />

      {/* Job Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={() => {
            console.log('Apply to job:', selectedJob._id);
          }}
        />
      )}
    </div>
  );
}
