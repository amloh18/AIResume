import React from 'react';
import { motion } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { JobApplication } from '@/types/job';

export const JobTable = ({ children, headers }: { children: React.ReactNode, headers: React.ReactNode }) => (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50 dark:bg-[#1c2018]">
        <tr>{headers}</tr>
      </thead>
      <tbody className="divide-y divide-gray-200 dark:divide-white/10">
        {children}
      </tbody>
    </table>
  </div>
);

export const JobTableHeader = ({ label, align = 'left', className = '' }: { label: React.ReactNode, align?: 'left' | 'right' | 'center', className?: string }) => (
  <th className={`px-6 py-4 text-${align} text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ${className}`}>
    {label}
  </th>
);

export const JobTableRow = ({ job, onClick, children }: { job: JobApplication, onClick?: () => void, children: React.ReactNode }) => (
  <motion.tr
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="group hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
    onClick={onClick}
  >
    {children}
  </motion.tr>
);

export const JobTableCompanyCell = ({ job }: { job: JobApplication }) => (
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center text-small font-bold text-gray-500 dark:text-gray-400 overflow-hidden shrink-0">
        {job.companyLogo ? (
          <img
            src={job.companyLogo}
            alt={`${job.company} logo`}
            className="w-full h-full object-contain"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        ) : null}
        <span style={{ display: job.companyLogo ? 'none' : 'block' }}>
          {job.company.substring(0, 2).toUpperCase()}
        </span>
      </div>
      <span className="text-small font-semibold text-gray-900 dark:text-white">{job.company}</span>
    </div>
  </td>
);

export const JobTableRoleCell = ({ job }: { job: JobApplication }) => (
  <td className="px-6 py-4 whitespace-nowrap">
    <span className="text-small text-gray-900 dark:text-white">{job.jobTitle || job.title}</span>
  </td>
);

export const JobTableLocationCell = ({ job }: { job: JobApplication }) => (
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
      <MapPin size={14} className="shrink-0" />
      <span className="truncate max-w-[150px]">{job.location || '-'}</span>
    </div>
  </td>
);

export const JobTableCompCell = ({ job }: { job: JobApplication }) => {
  const getCompRange = () => {
    if (!job.salary?.min && !job.salary?.max) return '-';
    const currency = job.salary.currency || '$';
    const min = job.salary.min ? `${currency}${job.salary.min >= 1000 ? (job.salary.min / 1000).toFixed(0) + 'k' : job.salary.min}` : '';
    const max = job.salary.max ? `${currency}${job.salary.max >= 1000 ? (job.salary.max / 1000).toFixed(0) + 'k' : job.salary.max}` : '';
    return min && max ? `${min} - ${max}` : min || max;
  };

  return (
    <td className="px-6 py-4 whitespace-nowrap">
      <span className="text-small text-gray-600 dark:text-gray-300">{getCompRange()}</span>
    </td>
  );
};
