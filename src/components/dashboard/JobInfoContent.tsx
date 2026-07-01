'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink, DollarSign, Settings, Calendar, FileText, Star,
  Edit, CheckCircle, Copy, Trash2, Archive, X
} from 'lucide-react';

interface JobInfoContentProps {
  job: any;
  isEditingJob: boolean;
  editedJob: any;
  setEditedJob: (job: any) => void;
  isSavingJob: boolean;
  onSaveJob: () => void;
  onCancelEditJob: () => void;
  onEditJob: () => void;
  onDuplicateJob: () => void;
  onDeleteJob: () => void;
  onArchiveJob: () => void;
  formatDate: (date: any) => string;
}

const JobInfoContent: React.FC<JobInfoContentProps> = ({
  job,
  isEditingJob,
  editedJob,
  setEditedJob,
  isSavingJob,
  onSaveJob,
  onCancelEditJob,
  onEditJob,
  onDuplicateJob,
  onDeleteJob,
  onArchiveJob,
  formatDate
}) => {

  return (
    <div className="space-y-6">
      {/* Job Information Display */}
      <div>
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-4">
          📋 Job Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Job URL */}
          {job.jobUrl && (
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
                Job URL
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 text-small truncate flex-1">
                  {job.jobUrl}
                </span>
                <a
                  href={job.jobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-600 transition-colors"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}

          {/* Salary */}
          {job.salary && (job.salary.min || job.salary.max) && (
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
                Salary
              </label>
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 text-small">
                  {job.salary.min && job.salary.max 
                    ? `${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()}`
                    : job.salary.min 
                    ? `From ${job.salary.min.toLocaleString()}`
                    : `Up to ${job.salary.max.toLocaleString()}`
                  } {job.salary.currency} {job.salary.period && `per ${job.salary.period}`}
                </span>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-gray-600 dark:text-gray-400 text-small capitalize">
                {job.status}
              </span>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
              Priority
            </label>
            <div className="flex items-center gap-2">
              <Star size={16} className="text-yellow-500" />
              <span className="text-gray-600 dark:text-gray-400 text-small capitalize">
                {job.priority}
              </span>
            </div>
          </div>

          {/* Application Date */}
          {job.applicationDate && (
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
                Application Date
              </label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 text-small">
                  {formatDate(job.applicationDate)}
                </span>
              </div>
            </div>
          )}

          {/* Deadline */}
          {job.deadline && (
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deadline
              </label>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 text-small">
                  {formatDate(job.deadline)}
                </span>
              </div>
            </div>
          )}

          {/* Sponsorship */}
          {job.sponsorship && job.sponsorship !== 'unknown' && (
            <div>
              <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sponsorship
              </label>
              <div className="flex items-center gap-2">
                <Settings size={16} className="text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400 text-small capitalize">
                  {job.sponsorship}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Job Description */}
        {job.jobDescription && (
          <div className="mt-4">
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
              Job Description
            </label>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 max-h-32 overflow-y-auto">
              <p className="text-gray-600 dark:text-gray-400 text-small whitespace-pre-wrap">
                {job.jobDescription}
              </p>
            </div>
          </div>
        )}

        {/* Notes */}
        {job.notes && (
          <div className="mt-4">
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes
            </label>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-gray-600 dark:text-gray-400 text-small whitespace-pre-wrap">
                {job.notes}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="mt-4">
            <label className="block text-small font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag: string, index: number) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-small rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Job Actions */}
      <div>
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-4">
          ⚙️ Job Actions
        </h3>
        <div className="flex flex-wrap gap-3">
          <motion.button
            onClick={onEditJob}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Edit size={16} />
            Edit Job
          </motion.button>
          <motion.button
            onClick={onDuplicateJob}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Copy size={16} />
            Duplicate
          </motion.button>
          <motion.button
            onClick={onDeleteJob}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 size={16} />
            Delete
          </motion.button>
          <motion.button
            onClick={onArchiveJob}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              job.isArchived 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Archive size={16} />
            {job.isArchived ? 'Unarchive' : 'Archive'}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default JobInfoContent;