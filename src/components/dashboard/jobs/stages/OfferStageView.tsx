'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Building, DollarSign, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface JobApplication {
  id: string;
  _id: string;
  jobTitle: string;
  title?: string;
  company: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'hourly' | 'monthly' | 'yearly';
  };
  deadline?: Date | string;
  updatedAt: string;
  notes?: string;
}

interface OfferStageViewProps {
  jobs: JobApplication[];
  onJobClick: (job: JobApplication) => void;
  onJobStatusUpdate: (jobId: string, newStatus: string) => Promise<void>;
}

const OfferStageView: React.FC<OfferStageViewProps> = ({
  jobs,
  onJobClick,
  onJobStatusUpdate
}) => {
  const getDaysUntilDeadline = (deadline?: Date | string): number | null => {
    if (!deadline) return null;
    const date = typeof deadline === 'string' ? new Date(deadline) : deadline;
    const now = new Date();
    const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const formatSalary = (salary?: JobApplication['salary']): string => {
    if (!salary) return 'Not specified';
    const currency = salary.currency || '$';
    const period = salary.period === 'yearly' ? 'yr' : salary.period === 'monthly' ? 'mo' : 'hr';
    
    if (salary.min && salary.max) {
      return `${currency}${salary.min.toLocaleString()}-${salary.max.toLocaleString()}/${period}`;
    } else if (salary.min) {
      return `${currency}${salary.min.toLocaleString()}+/${period}`;
    } else if (salary.max) {
      return `${currency}${salary.max.toLocaleString()}/${period}`;
    }
    return 'Not specified';
  };

  const handleOfferAction = async (job: JobApplication, action: 'accept' | 'negotiate' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      let newStatus = job.status;
      if (action === 'accept') {
        newStatus = 'accepted';
      } else if (action === 'decline') {
        newStatus = 'rejected';
      }
      // For negotiate, we might want to add a 'negotiating' status or keep as 'offer'
      
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
    <div className="space-y-4">
      {jobs.map((job) => {
        const daysUntilDeadline = getDaysUntilDeadline(job.deadline);
        const deadlineStatus = daysUntilDeadline === null 
          ? 'none'
          : daysUntilDeadline < 0 
            ? 'overdue' 
            : daysUntilDeadline <= 3 
              ? 'approaching' 
              : 'normal';

        return (
          <motion.div
            key={job.id || job._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-[#1a2015] border rounded-lg p-4 md:p-6 hover:shadow-lg transition-all cursor-pointer ${
              deadlineStatus === 'overdue' 
                ? 'border-red-300 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10' 
                : deadlineStatus === 'approaching'
                  ? 'border-yellow-300 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
                  : 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10'
            }`}
            onClick={() => onJobClick(job)}
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              {/* Left: Job Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Building className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 truncate">
                      {job.jobTitle || job.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {job.company}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                  {/* Salary */}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-medium">{formatSalary(job.salary)}</span>
                  </div>

                  {/* Offer Date */}
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Offer: {job.updatedAt 
                        ? (typeof job.updatedAt === 'string' 
                            ? new Date(job.updatedAt).toLocaleDateString() 
                            : job.updatedAt.toLocaleDateString())
                        : 'N/A'}
                    </span>
                  </div>

                  {/* Deadline */}
                  {job.deadline && (
                    <div className={`flex items-center gap-2 ${
                      deadlineStatus === 'overdue' 
                        ? 'text-red-600 dark:text-red-400 font-semibold' 
                        : deadlineStatus === 'approaching'
                          ? 'text-yellow-600 dark:text-yellow-400 font-semibold'
                          : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      <Clock className="w-4 h-4" />
                      <span>
                        {deadlineStatus === 'overdue' 
                          ? `Overdue by ${Math.abs(daysUntilDeadline!)} days`
                          : deadlineStatus === 'approaching'
                            ? `${daysUntilDeadline} days left`
                            : `Deadline: ${(typeof job.deadline === 'string' ? new Date(job.deadline) : job.deadline).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Deadline Warning */}
                {deadlineStatus !== 'normal' && job.deadline && (
                  <div className={`p-2 rounded-lg mb-3 ${
                    deadlineStatus === 'overdue'
                      ? 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700'
                  }`}>
                    <div className={`flex items-center gap-2 text-sm ${
                      deadlineStatus === 'overdue'
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-yellow-700 dark:text-yellow-400'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {deadlineStatus === 'overdue' 
                          ? 'Response deadline has passed'
                          : 'Response deadline approaching'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Actions */}
              <div className="flex flex-col gap-2 flex-shrink-0">
                <motion.button
                  onClick={(e) => handleOfferAction(job, 'accept', e)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Accept Offer
                </motion.button>
                <motion.button
                  onClick={(e) => handleOfferAction(job, 'negotiate', e)}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Negotiate
                </motion.button>
                <motion.button
                  onClick={(e) => handleOfferAction(job, 'decline', e)}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Decline
                </motion.button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default OfferStageView;

