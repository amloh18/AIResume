'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { JobsMetrics } from '@/types/automation-schema';
import {
  FileText,
  TrendingUp,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Search,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Filter,
  RefreshCw,
  Layers,
  ChevronRight,
  Briefcase
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import CompanyLogo from '@/components/ui/CompanyLogo';

export interface ApplicationItem {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: 'applied' | 'interview' | 'offer' | 'rejected' | 'pending' | 'failed';
  appliedAt: string;
  source: 'naukri' | 'indeed' | 'greenhouse' | 'lever' | 'adzuna' | 'workable' | 'direct';
  matchScore: number;
  salary?: string;
  applyUrl?: string;
}

interface ApplicationsPanelProps {
  userId?: string;
  metrics?: JobsMetrics | null;
}

export function ApplicationsPanel({ userId, metrics }: ApplicationsPanelProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'appliedAt' | 'matchScore' | 'company'>('appliedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs?limit=all', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawJobs = data?.data?.jobs || (Array.isArray(data?.jobs) ? data.jobs : []);

        const mapped: ApplicationItem[] = rawJobs.map((job: any) => {
          let status: ApplicationItem['status'] = 'applied';
          if (['applied', 'interview', 'offer', 'rejected'].includes(job.status)) {
            status = job.status as any;
          } else if (job.status === 'screening' || job.status === 'created' || job.status === 'draft') {
            status = 'pending';
          } else if (job.status === 'accepted') {
            status = 'offer';
          }

          let salaryStr = '';
          if (job.salary) {
            if (typeof job.salary === 'string') {
              salaryStr = job.salary;
            } else if (typeof job.salary === 'object') {
              const cur = job.salary.currency || '$';
              const min = job.salary.min ? `${cur}${job.salary.min.toLocaleString()}` : '';
              const max = job.salary.max ? `${cur}${job.salary.max.toLocaleString()}` : '';
              salaryStr = min && max ? `${min} - ${max}` : (min || max || '');
            }
          }

          let appliedDate = job.appliedAt || job.applicationDate || job.createdAt || new Date().toISOString();
          if (appliedDate instanceof Date) {
            appliedDate = appliedDate.toISOString().split('T')[0];
          } else if (typeof appliedDate === 'string' && appliedDate.includes('T')) {
            appliedDate = appliedDate.split('T')[0];
          }

          let src = 'direct';
          const validSources = ['naukri', 'indeed', 'greenhouse', 'lever', 'adzuna', 'workable', 'direct'];
          if (job.source && validSources.includes(job.source)) {
            src = job.source;
          } else if (job.source === 'company-website') {
            src = 'direct';
          }

          return {
            id: job.id || job._id,
            jobTitle: job.jobTitle || job.title || 'Role',
            company: job.company || 'Company',
            location: job.location || 'Remote',
            status,
            appliedAt: appliedDate,
            source: src as any,
            matchScore: typeof job.matchScore === 'number' ? job.matchScore : (job.atsScore || 85),
            salary: salaryStr || undefined,
            applyUrl: job.jobUrl || job.applyUrl || undefined,
          };
        });

        setApplications(mapped);
      }
    } catch (err) {
      console.error('Failed to fetch live applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();

    const handleJobUpdate = () => {
      loadApplications();
    };

    window.addEventListener('jobUpdated', handleJobUpdate);
    return () => window.removeEventListener('jobUpdated', handleJobUpdate);
  }, [userId]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const total = applications.length;
    const applied = applications.filter((a) => a.status === 'applied').length;
    const interview = applications.filter((a) => a.status === 'interview').length;
    const offer = applications.filter((a) => a.status === 'offer').length;
    const rejected = applications.filter((a) => a.status === 'rejected').length;
    const pending = applications.filter((a) => a.status === 'pending').length;
    const avgScore = total > 0
      ? Math.round(applications.reduce((acc, a) => acc + (a.matchScore || 0), 0) / total)
      : (metrics?.averageMatchScore || 85);
    const successRate = total > 0 ? Math.round(((interview + offer) / total) * 100) : 0;

    return {
      total: metrics?.appliedThisWeek ? Math.max(metrics.appliedThisWeek, total) : total,
      applied,
      interview,
      offer,
      rejected,
      pending,
      avgScore,
      successRate,
    };
  }, [applications, metrics]);

  // Filter & Sort
  const filteredList = useMemo(() => {
    return applications
      .filter((app) => {
        if (statusFilter !== 'all' && app.status !== statusFilter) return false;
        if (sourceFilter !== 'all' && app.source !== sourceFilter) return false;
        if (search) {
          const q = search.toLowerCase();
          return (
            app.jobTitle.toLowerCase().includes(q) ||
            app.company.toLowerCase().includes(q) ||
            app.location.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        const dir = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'matchScore') return (a.matchScore - b.matchScore) * dir;
        if (sortBy === 'company') return a.company.localeCompare(b.company) * dir;
        return (new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()) * dir;
      });
  }, [applications, statusFilter, sourceFilter, search, sortBy, sortOrder]);

  const getStatusBadge = (status: ApplicationItem['status']) => {
    switch (status) {
      case 'offer':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
            <CheckCircle className="w-3 h-3 text-emerald-500" />
            Offer Received
          </span>
        );
      case 'interview':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
            <Sparkles className="w-3 h-3 text-purple-500" />
            Interviewing
          </span>
        );
      case 'applied':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30">
            <CheckCircle className="w-3 h-3 text-blue-500" />
            Applied
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-500" />
            Submitting
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30">
            <XCircle className="w-3 h-3 text-red-500" />
            Declined
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            {status}
          </span>
        );
    }
  };

  const getSourceBadge = (source: ApplicationItem['source']) => {
    switch (source) {
      case 'naukri':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Naukri</span>;
      case 'greenhouse':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">Greenhouse</span>;
      case 'indeed':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">Indeed</span>;
      case 'lever':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Lever</span>;
      case 'adzuna':
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">Adzuna</span>;
      default:
        return <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">Direct ATS</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Merged Metrics Summary KPI Cards on Top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Applications */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-lime-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Total Applications</span>
            <div className="p-2 rounded-xl bg-lime-500/10 text-lime-600 dark:text-lime-400">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {stats.total}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Active automation</span> across linked portals
          </div>
        </div>

        {/* Success / Interview Rate */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-lime-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Interview Rate</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
            {stats.successRate}%
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.interview} interviews secured
          </div>
        </div>

        {/* Avg Match Score */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-lime-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Avg CV Match Score</span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
            {stats.avgScore}%
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Tailored against active job descriptions
          </div>
        </div>

        {/* Pending & In-Review */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:border-lime-500/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Active Submissions</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-amber-600 dark:text-amber-400">
            {stats.applied + stats.pending}
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {stats.applied} delivered · {stats.pending} queuing
          </div>
        </div>
      </div>

      {/* 2. Controls & Filter Bar */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-sm space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role, company, location..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-lime-500"
            />
          </div>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="all">All Portals / Sources</option>
            <option value="naukri">Naukri.com</option>
            <option value="greenhouse">Greenhouse ATS</option>
            <option value="indeed">Indeed</option>
            <option value="lever">Lever ATS</option>
            <option value="adzuna">Adzuna</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="appliedAt">Sort by Date Applied</option>
            <option value="matchScore">Sort by Match Score</option>
            <option value="company">Sort by Company</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            title="Toggle sort order"
            className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a230f] text-gray-700 dark:text-gray-300 hover:border-lime-500 text-xs"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide border-t border-gray-100 dark:border-white/5 pt-3">
          {[
            { id: 'all', label: 'All Applications', count: stats.total },
            { id: 'applied', label: 'Applied', count: stats.applied },
            { id: 'interview', label: 'Interviewing', count: stats.interview },
            { id: 'offer', label: 'Offers', count: stats.offer },
            { id: 'pending', label: 'In Queue', count: stats.pending },
            { id: 'rejected', label: 'Declined', count: stats.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-[#0f3822] dark:bg-[#133820] text-white border border-[#1a4a2c] shadow-sm'
                  : 'bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-400'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Pure Table-Only Applications View */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3" />
            <p className="text-xs text-gray-500 dark:text-gray-400">Loading your applications...</p>
          </div>
        ) : filteredList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3.5 px-5">Job Role & Title</th>
                  <th className="py-3.5 px-4">Company</th>
                  <th className="py-3.5 px-4">Location</th>
                  <th className="py-3.5 px-4">Portal / ATS</th>
                  <th className="py-3.5 px-4">Match Score</th>
                  <th className="py-3.5 px-4">Date Applied</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
                {filteredList.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Job Role */}
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-gray-900 dark:text-white text-xs hover:text-lime-600 dark:hover:text-lime-400 transition-colors">
                        {app.jobTitle}
                      </div>
                      {app.salary && (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-normal">
                          {app.salary}
                        </div>
                      )}
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center font-bold text-gray-700 dark:text-gray-300 text-[10px]">
                          {app.company.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-xs">{app.company}</span>
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="truncate max-w-[160px]">{app.location}</span>
                      </div>
                    </td>

                    {/* Source / ATS */}
                    <td className="py-3.5 px-4">
                      {getSourceBadge(app.source)}
                    </td>

                    {/* Match Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-lime-500" />
                        <span className="font-bold text-gray-900 dark:text-white text-xs">
                          {app.matchScore}%
                        </span>
                      </div>
                    </td>

                    {/* Applied Date */}
                    <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400 text-xs">
                      {app.appliedAt}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {getStatusBadge(app.status)}
                    </td>

                    {/* Action Links */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {app.applyUrl && (
                          <a
                            href={app.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-lime-500 text-gray-600 dark:text-gray-300 hover:text-lime-600 transition-colors"
                            title="Open portal posting"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => router.push(`/dashboard/tracker?jobId=${app.id}`)}
                          className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-lime-500 hover:text-black text-gray-700 dark:text-gray-300 text-[11px] font-semibold transition-colors flex items-center gap-1"
                        >
                          <span>Tracker</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-gray-400">
              <Briefcase className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
              No matching applications found
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Try changing your search query or status filter to see other application entries.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ApplicationsPanel;
