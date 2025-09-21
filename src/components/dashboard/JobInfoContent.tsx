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

  if (isEditingJob) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Edit size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Editing Job Information
            </h3>
          </div>
          <p className="text-blue-700 dark:text-blue-300 text-sm">
            Make changes to the job details below. Use Ctrl+S to save or Esc to cancel.
          </p>
        </div>

        {/* Job URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job URL
          </label>
          <input
            type="url"
            value={editedJob.jobUrl}
            onChange={(e) => setEditedJob({...editedJob, jobUrl: e.target.value})}
            placeholder="https://..."
            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Salary */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Salary Range
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input
              type="number"
              value={editedJob.salary.min}
              onChange={(e) => setEditedJob({...editedJob, salary: {...editedJob.salary, min: e.target.value}})}
              placeholder="Min"
              className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              value={editedJob.salary.max}
              onChange={(e) => setEditedJob({...editedJob, salary: {...editedJob.salary, max: e.target.value}})}
              placeholder="Max"
              className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={editedJob.salary.currency}
              onChange={(e) => setEditedJob({...editedJob, salary: {...editedJob.salary, currency: e.target.value}})}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="CAD">CAD</option>
            </select>
            <select
              value={editedJob.salary.period}
              onChange={(e) => setEditedJob({...editedJob, salary: {...editedJob.salary, period: e.target.value}})}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
        </div>

        {/* Status, Priority, Sponsorship */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={editedJob.status}
              onChange={(e) => setEditedJob({...editedJob, status: e.target.value})}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created">Created</option>
              <option value="applied">Applied</option>
              <option value="screening">Screening</option>
              <option value="interview">Interview</option>
              <option value="offer">Offer</option>
              <option value="rejected">Rejected</option>
              <option value="accepted">Accepted</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority
            </label>
            <select
              value={editedJob.priority}
              onChange={(e) => setEditedJob({...editedJob, priority: e.target.value})}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sponsorship
            </label>
            <select
              value={editedJob.sponsorship}
              onChange={(e) => setEditedJob({...editedJob, sponsorship: e.target.value})}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unknown">Unknown</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Application Date
            </label>
            <input
              type="date"
              value={editedJob.applicationDate}
              onChange={(e) => setEditedJob({...editedJob, applicationDate: e.target.value})}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deadline
            </label>
            <input
              type="date"
              value={editedJob.deadline}
              onChange={(e) => setEditedJob({...editedJob, deadline: e.target.value})}
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Job Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Job Description
          </label>
          <textarea
            value={editedJob.jobDescription}
            onChange={(e) => setEditedJob({...editedJob, jobDescription: e.target.value})}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                onCancelEditJob();
              } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                onSaveJob();
              }
            }}
            placeholder="Enter job description..."
            className="w-full h-32 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSavingJob}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Notes
          </label>
          <textarea
            value={editedJob.notes}
            onChange={(e) => setEditedJob({...editedJob, notes: e.target.value})}
            placeholder="Add any notes about this job..."
            className="w-full h-24 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSavingJob}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={editedJob.tags}
            onChange={(e) => setEditedJob({...editedJob, tags: e.target.value})}
            placeholder="remote, senior, full-time..."
            className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSavingJob}
          />
        </div>

        {/* Save/Cancel Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <motion.button
            onClick={onCancelEditJob}
            disabled={isSavingJob}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            onClick={onSaveJob}
            disabled={isSavingJob}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isSavingJob ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <CheckCircle size={16} />
                </motion.div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle size={16} />
                Save Changes
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job URL */}
      {job.jobUrl && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ExternalLink size={20} />
            Job URL
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <a 
              href={job.jobUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline break-all"
            >
              {job.jobUrl}
            </a>
          </div>
        </div>
      )}

      {/* Salary & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign size={20} />
            Salary
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300">
              {job.salary?.min && job.salary?.max 
                ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()} ${job.salary.period || 'yearly'}`
                : job.salary?.min 
                  ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}+ ${job.salary.period || 'yearly'}`
                  : job.salary?.max
                    ? `Up to ${job.salary.currency || '$'}${job.salary.max.toLocaleString()} ${job.salary.period || 'yearly'}`
                    : 'Not specified'
              }
            </p>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Settings size={20} />
            Status & Priority
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                job.status === 'applied' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                job.status === 'interview' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                job.status === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                job.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}>
                {job.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Priority:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                job.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                job.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              }`}>
                {job.priority}
              </span>
            </div>
            {job.sponsorship && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Sponsorship:</span>
                <span className="capitalize">{job.sponsorship}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dates */}
      {(job.applicationDate || job.deadline) && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar size={20} />
            Important Dates
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {job.applicationDate && (
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Application Date:</span>
                <p className="text-gray-900 dark:text-white font-medium">{formatDate(job.applicationDate)}</p>
              </div>
            )}
            {job.deadline && (
              <div>
                <span className="text-gray-600 dark:text-gray-400 text-sm">Deadline:</span>
                <p className="text-gray-900 dark:text-white font-medium">{formatDate(job.deadline)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Job Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} />
          Job Description
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
          <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
            {job.jobDescription || job.description || 'No job description available'}
          </p>
        </div>
      </div>

      {/* Notes */}
      {job.notes && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={20} />
            Notes
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
              {job.notes}
            </p>
          </div>
        </div>
      )}

      {/* Tags */}
      {job.tags && job.tags.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Star size={20} />
            Tags
          </h3>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex flex-wrap gap-2">
              {job.tags.map((tag: string, index: number) => (
                <span 
                  key={index}
                  className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Job Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
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
