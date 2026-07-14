'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Building, DollarSign, Calendar, Clock, AlertCircle, Eye, MapPin, TrendingUp, XCircle, Handshake } from 'lucide-react';
import toast from 'react-hot-toast';
import { JobApplication } from '@/types/job';
import { JobTable, JobTableHeader, JobTableRow, JobTableCompanyCell, JobTableRoleCell, JobTableLocationCell } from './JobTablePrimitives';



interface OfferStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
  isFullScreen?: boolean;
}

const OfferStageView: React.FC<OfferStageViewProps> = ({
  jobs,
  onJobClick,
  onJobStatusUpdate
}) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const getDaysUntilDeadline = (deadline?: Date | string): number | null => {
    if (!deadline) return null;
    const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const now = new Date();
    return Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getOfferValue = (job: JobApplication): number => {
    // Priority: Offer Details Salary > Salary Max > Salary Min > 0
    if (job.offerDetails?.salary) return job.offerDetails.salary;
    if (job.salary?.max) return job.salary.max;
    if (job.salary?.min) return job.salary.min;
    return 0;
  };

  const formatCurrency = (amount: number, currency = '$') => {
    return `${currency}${amount.toLocaleString()}`;
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const valA = getOfferValue(a);
      const valB = getOfferValue(b);
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });
  }, [jobs, sortOrder]);

  const handleOfferAction = async (job: JobApplication, action: 'accept' | 'negotiate' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let newStatus = job.status;
      if (action === 'accept') {
        newStatus = 'accepted';
      } else if (action === 'decline') {
        newStatus = 'rejected';
      }

      await onJobStatusUpdate(job.id || job._id, newStatus);
      toast.success(`Offer ${action === 'accept' ? 'accepted' : action === 'decline' ? 'declined' : 'negotiation started'}!`);
    } catch (error) {
      console.error('Error updating offer status:', error);
      toast.error('Failed to update offer status');
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CheckCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No offers yet
        </h3>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Keep applying! Your offers will appear here.
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
          <span>Sort by Value ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</span>
        </button>
      </div>

      <JobTable
        headers={
          <>
            <JobTableHeader label="Company" />
            <JobTableHeader label="Role" />
            <JobTableHeader label="Location" />
            <JobTableHeader label="Offer Value" />
            <JobTableHeader label="Components" />
            <JobTableHeader label="Deadline" />
            <JobTableHeader label="Status" />
            <JobTableHeader label="Action" align="right" />
          </>
        }
      >
        {sortedJobs.map((job) => {
          const daysUntilDeadline = getDaysUntilDeadline(job.deadline);
          const offerValue = getOfferValue(job);
          const currency = job.offerDetails?.salary ? '$' : (job.salary?.currency || '$');

          return (
            <JobTableRow key={job.id || job._id} job={job} onClick={() => onJobClick(job)}>
              <JobTableCompanyCell job={job} />
              <JobTableRoleCell job={job} />
              <JobTableLocationCell job={job} />

              {/* Offer Value */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <span className="text-h3 font-bold text-green-600 dark:text-green-400">
                    {offerValue > 0 ? formatCurrency(offerValue, currency) : 'TBD'}
                  </span>
                </div>
              </td>

              {/* Components */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col text-small text-gray-500 dark:text-gray-400">
                  {job.offerDetails?.bonus && <span>Bonus: {job.offerDetails.bonus}</span>}
                  {job.offerDetails?.equity && <span>Equity: {job.offerDetails.equity}</span>}
                  {!job.offerDetails?.bonus && !job.offerDetails?.equity && <span>-</span>}
                </div>
              </td>

              {/* Deadline */}
              <td className="px-6 py-4 whitespace-nowrap">
                {job.deadline ? (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-small font-medium ${daysUntilDeadline !== null && daysUntilDeadline < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                    daysUntilDeadline !== null && daysUntilDeadline <= 3 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                    {daysUntilDeadline !== null && daysUntilDeadline < 0 ? 'Expired' : `${daysUntilDeadline}d left`}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>

              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-small font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                  {job.status}
                </span>
              </td>

              {/* Action */}
              <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={(e) => handleOfferAction(job, 'accept', e)}
                    className="p-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    title="Accept Offer"
                  >
                    <CheckCircle size={16} />
                  </button>
                  <button
                    onClick={(e) => handleOfferAction(job, 'negotiate', e)}
                    className="p-1.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    title="Negotiate"
                  >
                    <Handshake size={16} />
                  </button>
                  <button
                    onClick={(e) => handleOfferAction(job, 'decline', e)}
                    className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                    title="Decline Offer"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </td>
            </JobTableRow>
          );
        })}
      </JobTable>
    </div>
  );
};

export default OfferStageView;
