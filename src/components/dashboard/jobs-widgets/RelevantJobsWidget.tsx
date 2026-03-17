'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, MapPin, DollarSign, ExternalLink, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface RelevantJobsWidgetProps {
  userId?: string;
  limit?: number;
}

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary?: string;
  source: string;
  matchScore?: number;
  postedDate: string;
}

export function RelevantJobsWidget({ userId, limit = 5 }: RelevantJobsWidgetProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sample jobs for demo
  const sampleJobs: Job[] = [
    {
      id: '1',
      title: 'Senior Software Engineer',
      company: 'Tech Corp',
      location: 'London, UK',
      salary: '£60,000 - £80,000',
      source: 'linkedin',
      matchScore: 92,
      postedDate: '2 days ago'
    },
    {
      id: '2',
      title: 'Full Stack Developer',
      company: 'StartupXYZ',
      location: 'Remote',
      salary: '$80,000 - $120,000',
      source: 'indeed',
      matchScore: 88,
      postedDate: '1 day ago'
    },
    {
      id: '3',
      title: 'Backend Engineer',
      company: 'Google',
      location: 'Bangalore, India',
      salary: '₹25,00,000 - ₹45,00,000',
      source: 'google',
      matchScore: 85,
      postedDate: '3 days ago'
    },
    {
      id: '4',
      title: 'Product Manager',
      company: 'Amazon',
      location: 'London, UK',
      salary: '£55,000 - £75,000',
      source: 'linkedin',
      matchScore: 78,
      postedDate: '5 hours ago'
    },
    {
      id: '5',
      title: 'DevOps Engineer',
      company: 'Microsoft',
      location: 'Hyderabad, India',
      salary: '₹20,00,000 - ₹35,00,000',
      source: 'indeed',
      matchScore: 75,
      postedDate: '1 week ago'
    }
  ];

  const fetchJobs = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    
    try {
      const response = await fetch(`/api/jobs/portal?action=discover&limit=${limit}`, {
        headers: { 'x-user-id': userId || 'temp-user-id' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || sampleJobs);
      } else {
        setJobs(sampleJobs);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs(sampleJobs);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [userId, limit]);

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'linkedin':
        return 'in';
      case 'indeed':
        return '✓';
      case 'google':
        return 'G';
      default:
        return '●';
    }
  };

  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Relevant Jobs</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Based on your profile
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchJobs(true)}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-lime-600 dark:text-gray-400 dark:hover:text-lime-400 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.slice(0, limit).map((job) => (
            <Link
              key={job.id}
              href={`/dashboard/jobs?jobId=${job.id}`}
              className="block p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
            >
              <div className="flex items-start justify-between mb-1">
                <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                  {job.title}
                </h4>
                {job.matchScore && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getMatchScoreColor(job.matchScore)}`}>
                    {job.matchScore}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span>{job.company}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {job.location}
                </span>
              </div>
              {job.salary && (
                <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-500 mt-1">
                  <DollarSign className="w-3 h-3" />
                  {job.salary}
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {job.postedDate} • {job.source}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-lime-500" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Link to Discover */}
      <Link 
        href="/dashboard/jobs?tab=discover"
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-lime-600 dark:text-lime-400 hover:bg-lime-50 dark:hover:bg-lime-900/20 rounded-lg transition-colors"
      >
        Discover More Jobs
        <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

export default RelevantJobsWidget;
