'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Building, DollarSign, Calendar, Clock, AlertCircle, Eye, MapPin, TrendingUp, XCircle, Handshake } from 'lucide-react';
import toast from 'react-hot-toast';

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
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  offerDetails?: {
    salary?: number;
    bonus?: string | number;
    equity?: string | number;
  };
  deadline?: Date | string;
  updatedAt: string;
  notes?: string;
  status: 'draft' | 'created' | 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
}

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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No offers yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
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
          className="flex items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <TrendingUp size={14} />
          <span>Sort by Value ({sortOrder === 'desc' ? 'High to Low' : 'Low to High'})</span>
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

              {/* Stage Specific Columns */}
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Offer Value</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Components</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Deadline</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>

              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {sortedJobs.map((job) => {
              const daysUntilDeadline = getDaysUntilDeadline(job.deadline);
              const offerValue = getOfferValue(job);
              const currency = job.offerDetails?.salary ? '$' : (job.salary?.currency || '$');

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
                          {(job.company || 'NA').substring(0, 2).toUpperCase()}
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

                  {/* Offer Value */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg font-bold text-green-600 dark:text-green-400">
                        {offerValue > 0 ? formatCurrency(offerValue, currency) : 'TBD'}
                      </span>
                    </div>
                  </td>

                  {/* Components */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
                      {job.offerDetails?.bonus && <span>Bonus: {job.offerDetails.bonus}</span>}
                      {job.offerDetails?.equity && <span>Equity: {job.offerDetails.equity}</span>}
                      {!job.offerDetails?.bonus && !job.offerDetails?.equity && <span>-</span>}
                    </div>
                  </td>

                  {/* Deadline */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    {job.deadline ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${daysUntilDeadline !== null && daysUntilDeadline < 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
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
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
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
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OfferStageView;
