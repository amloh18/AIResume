'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FileText, TrendingUp, Clock, XCircle, CheckCircle, AlertCircle, ExternalLink, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: 'pending' | 'applied' | 'interview' | 'rejected' | 'offer' | 'failed';
  appliedAt: string;
  source: string;
}

interface ApplicationsPanelProps {
  userId?: string;
}

export function ApplicationsPanel({ userId }: ApplicationsPanelProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'success' | 'failed'>('all');

  // Sample data for demo
  const sampleApplications: Application[] = [
    {
      id: '1',
      jobTitle: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'London, UK',
      status: 'applied',
      appliedAt: '2026-03-15',
      source: 'linkedin',
    },
    {
      id: '2',
      jobTitle: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'Bangalore, India',
      status: 'interview',
      appliedAt: '2026-03-10',
      source: 'indeed',
    },
    {
      id: '3',
      jobTitle: 'Backend Engineer',
      company: 'Google',
      location: 'Remote',
      status: 'rejected',
      appliedAt: '2026-03-05',
      source: 'google',
    },
    {
      id: '4',
      jobTitle: 'Product Manager',
      company: 'Amazon',
      location: 'London, UK',
      status: 'pending',
      appliedAt: '2026-03-16',
      source: 'linkedin',
    },
  ];

  useEffect(() => {
    // In production, fetch from API
    // For demo, use sample data
    setTimeout(() => {
      setApplications(sampleApplications);
      setLoading(false);
    }, 500);
  }, [userId]);

  const filteredApplications = useMemo(() => {
    if (filter === 'all') return applications;
    if (filter === 'success') return applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer');
    if (filter === 'failed') return applications.filter(a => a.status === 'rejected' || a.status === 'failed');
    if (filter === 'pending') return applications.filter(a => a.status === 'pending');
    return applications;
  }, [applications, filter]);

  const stats = useMemo(() => {
    const total = applications.length;
    const success = applications.filter(a => a.status === 'applied' || a.status === 'interview' || a.status === 'offer').length;
    const failed = applications.filter(a => a.status === 'rejected' || a.status === 'failed').length;
    const pending = applications.filter(a => a.status === 'pending').length;
    
    return {
      total,
      success,
      failed,
      pending,
      successRate: total > 0 ? Math.round((success / total) * 100) : 0,
    };
  }, [applications]);

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 'interview':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      case 'offer':
        return 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300';
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
      case 'failed':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
    }
  };

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'applied':
        return <FileText className="w-4 h-4" />;
      case 'interview':
        return <AlertCircle className="w-4 h-4" />;
      case 'offer':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'failed':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleViewInTracker = (applicationId: string) => {
    // Navigate to tracker page
    router.push(`/dashboard/tracker?jobId=${applicationId}`);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <FileText className="w-4 h-4" />
            Total
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            Success Rate
          </div>
          <div className="text-2xl font-bold text-lime-500">
            {stats.successRate}%
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <Clock className="w-4 h-4" />
            Pending
          </div>
          <div className="text-2xl font-bold text-yellow-500">
            {stats.pending}
          </div>
        </div>
        
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <XCircle className="w-4 h-4" />
            Failed
          </div>
          <div className="text-2xl font-bold text-red-500">
            {stats.failed}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {([
          { key: 'all', label: 'All', count: stats.total },
          { key: 'success', label: 'Success', count: stats.success },
          { key: 'pending', label: 'Pending', count: stats.pending },
          { key: 'failed', label: 'Failed', count: stats.failed },
        ] as const).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              filter === f.key
                ? 'bg-lime-500 text-black'
                : 'bg-white dark:bg-[#141810] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Application List */}
      {filteredApplications.length > 0 ? (
        <div className="space-y-3">
          {filteredApplications.map((app) => (
            <div 
              key={app.id}
              className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-4 hover:border-lime-500/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {app.jobTitle}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${getStatusColor(app.status)}`}>
                      {getStatusIcon(app.status)}
                      {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span>{app.company}</span>
                    <span>•</span>
                    <span>{app.location}</span>
                    <span>•</span>
                    <span className="text-xs">Applied {app.appliedAt}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleViewInTracker(app.id)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors"
                >
                  View
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No applications yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Start applying to jobs to see your application history here
          </p>
        </div>
      )}
    </div>
  );
}

export default ApplicationsPanel;
