'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, AlertCircle, CheckCircle, Building, Eye, Globe, MapPin, Bell, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { JobApplication } from '@/types/job';
import { JobTable, JobTableHeader, JobTableRow, JobTableCompanyCell, JobTableRoleCell, JobTableLocationCell, JobTableCompCell } from './JobTablePrimitives';



interface AppliedStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  isFullScreen?: boolean;
}

const AppliedStageView: React.FC<AppliedStageViewProps> = ({
  jobs,
  onJobClick,
  onJobStatusUpdate,
  isFullScreen = false
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [activityForm, setActivityForm] = useState<{ jobId: string; note: string } | null>(null);

  const getDaysSinceApplication = (applicationDate?: Date | string): number => {
    if (!applicationDate) return 0;
    const date = typeof applicationDate === 'string' ? new Date(applicationDate) : applicationDate;
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysUntilDeadline = (deadline?: Date | string): number | null => {
    if (!deadline) return null;
    const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const now = new Date();
    const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const isFollowUpNeeded = (job: JobApplication): boolean => {
    const daysSince = getDaysSinceApplication(job.applicationDate);
    const daysSinceUpdate = getDaysSinceApplication(job.updatedAt);
    return daysSince >= 7 && daysSinceUpdate >= 7;
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const dateA = a.applicationDate ? (typeof a.applicationDate === 'string' ? new Date(a.applicationDate) : a.applicationDate).getTime() : 0;
      const dateB = b.applicationDate ? (typeof b.applicationDate === 'string' ? new Date(b.applicationDate) : b.applicationDate).getTime() : 0;
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [jobs, sortOrder]);

  const handleLogActivity = (job: JobApplication, e: React.MouseEvent) => {
    e.stopPropagation();
    setActivityForm({ jobId: job.id || job._id, note: '' });
  };

  const submitActivity = async (jobId: string) => {
    if (!activityForm?.note.trim()) return;
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          followUps: {
            type: 'email',
            description: activityForm.note.trim(),
            date: new Date().toISOString(),
            outcome: 'sent'
          }
        }),
      });
      if (response.ok) {
        toast.success('Activity logged');
        setActivityForm(null);
        onJobStatusUpdate(jobId, 'applied');
      } else {
        toast.error('Failed to log activity');
      }
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error('Failed to log activity');
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No applied jobs
        </h3>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Jobs you've applied to will appear here.
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
          className="flex items-center gap-2 text-small font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <TrendingUp size={14} />
          <span>Sort by Most Recent ({sortOrder === 'desc' ? 'Newest First' : 'Oldest First'})</span>
        </button>
      </div>

      <JobTable
        headers={
          <>
            <JobTableHeader label="Company" />
            <JobTableHeader label="Role" />
            <JobTableHeader label="Location" />
            <JobTableHeader label="Comp Range" />
            <JobTableHeader label="Applied On" />
            <JobTableHeader label="Elapsed Time" />
            <JobTableHeader label="Platform" />
            <JobTableHeader label="Next Follow-up" />
            <JobTableHeader label="Action" align="right" />
          </>
        }
      >
        {sortedJobs.map((job) => {
          const daysSinceApplication = getDaysSinceApplication(job.applicationDate);
          const needsFollowUp = isFollowUpNeeded(job);
          const appliedDate = job.applicationDate ? (typeof job.applicationDate === 'string' ? new Date(job.applicationDate) : job.applicationDate) : null;

          // Calculate follow up date (7 days after last update/application)
          const lastUpdate = job.updatedAt ? new Date(job.updatedAt) : new Date();
          const followUpDate = new Date(lastUpdate);
          followUpDate.setDate(followUpDate.getDate() + 7);

          return (
            <JobTableRow key={job.id || job._id} job={job} onClick={() => onJobClick(job)}>
              <JobTableCompanyCell job={job} />
              <JobTableRoleCell job={job} />
              <JobTableLocationCell job={job} />
              <JobTableCompCell job={job} />

              {/* Applied On */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                  <Calendar size={14} />
                  <span>{appliedDate ? appliedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}</span>
                </div>
              </td>

              {/* Elapsed Time */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium ${daysSinceApplication > 14 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  daysSinceApplication > 7 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                  {daysSinceApplication} days ago
                </span>
              </td>

              {/* Platform */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                  <Globe size={14} />
                  <span>{job.source || 'Manual'}</span>
                </div>
              </td>

              {/* Next Follow-up */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`flex items-center gap-1.5 text-small ${needsFollowUp ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                  <Bell size={14} />
                  <span>{followUpDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              </td>

              {/* Action */}
              <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                {activityForm?.jobId === (job.id || job._id) ? (
                  <div className="flex justify-end gap-2">
                    <input
                      type="text"
                      value={activityForm.note}
                      onChange={(e) => setActivityForm({ ...activityForm, note: e.target.value })}
                      placeholder="Log a note..."
                      className="px-3 py-1.5 text-small border border-[color:var(--border-primary)] rounded-lg bg-[var(--bg-primary)] text-[color:var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
                      autoFocus
                    />
                    <button
                      onClick={() => submitActivity(job.id || job._id)}
                      className="px-3 py-1.5 bg-[var(--accent-primary)] text-[#141810] text-small font-bold rounded-lg hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setActivityForm(null)}
                      className="px-3 py-1.5 bg-[var(--bg-secondary)] text-[color:var(--text-primary)] text-small rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleLogActivity(job, e)}
                    className="px-3 py-1.5 border border-[color:var(--border-primary)] text-[color:var(--text-primary)] text-small font-medium rounded-lg hover:bg-[var(--hover-bg)] transition-colors inline-flex items-center gap-1.5"
                  >
                    Log Activity
                  </button>
                )}
              </td>
            </JobTableRow>
          );
        })}
      </JobTable>
    </div>
  );
};

export default AppliedStageView;
