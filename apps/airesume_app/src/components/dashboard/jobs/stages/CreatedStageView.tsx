'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, MapPin, Download, TrendingUp, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { CVJourney } from '@/types/cv';
import { getCurrencySymbol } from '@/lib/config/job-constants';
import { getJourneyAtsScore } from '@/lib/utils/cv-scoring';
import { chipState } from '@/components/ui/chip-styles';

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
  };
  jobDescription?: string;
  trustSnapshot?: {
    ghostRiskLevel?: 'low' | 'medium' | 'high';
  };
  createdAt: string;
}

interface CreatedStageViewProps {
  jobs: JobApplication[];
  journeys?: CVJourney[];
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
  onJobClick: (job: JobApplication) => void;
  onRefresh?: () => void;
  onDownload?: (job: JobApplication) => void;
}

const CreatedStageView: React.FC<CreatedStageViewProps> = ({
  jobs,
  getJobJourneys,
  onJobClick,
  onRefresh,
  onDownload
}) => {
  const [showReadyOnly, setShowReadyOnly] = useState(false);

  const getCompRange = (job: JobApplication) => {
    if (!job.salary?.min && !job.salary?.max) return '-';
    const currency = getCurrencySymbol(job.salary.currency);
    const min = job.salary.min ? `${currency}${job.salary.min >= 1000 ? (job.salary.min / 1000).toFixed(0) + 'k' : job.salary.min}` : '';
    const max = job.salary.max ? `${currency}${job.salary.max >= 1000 ? (job.salary.max / 1000).toFixed(0) + 'k' : job.salary.max}` : '';
    return min && max ? `${min} - ${max}` : min || max;
  };

  const filteredJobs = showReadyOnly
    ? jobs.filter(job => {
      const journeys = getJobJourneys(job.id);
      // ATS-labelled value must come from an ATS measurement — never job.matchScore.
      const atsScore = getJourneyAtsScore(journeys[0], job);
      return typeof atsScore === 'number' && atsScore >= 80;
    })
    : jobs;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <div className="text-body font-semibold text-gray-900 dark:text-white mb-2">
          No created jobs
        </div>
        <p className="text-small text-gray-500 dark:text-gray-400">
          Jobs with generated documents will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#141810] rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
      {/* Quick Filter Bar */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-white/10 flex items-center justify-end">
        <button
          onClick={() => setShowReadyOnly(!showReadyOnly)}
          aria-pressed={showReadyOnly}
          className={`${chipState(showReadyOnly ? 'active' : 'idle', 'md')} font-medium`}
        >
          <CheckCircle size={14} />
          <span>Ready to Apply (ATS &gt; 80)</span>
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-[#1c2018]">
            <tr>
              {/* Universal Columns */}
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Comp Range</th>

              {/* Stage Specific Columns */}
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">ATS Score</th>
              <th className="px-6 py-4 text-center text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CV Status</th>
              <th className="px-6 py-4 text-center text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">CL Status</th>
              <th className="px-6 py-4 text-left text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk Factor</th>

              <th className="px-6 py-4 text-right text-small font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/10">
            {filteredJobs.map((job) => {
              const journeys = getJobJourneys(job.id);
              const journey = journeys[0]; // Primary journey
              const atsScore = getJourneyAtsScore(journey, job);
              const hasCV = !!journey?.cvId;
              const hasCL = !!journey?.coverLetterId;
              const riskLevel = job.trustSnapshot?.ghostRiskLevel || 'unknown';

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
                      <CompanyLogo company={job.company} size={32} logoUrl={job.companyLogo} jobId={job.id || job._id} />
                      <span className="text-small font-semibold text-gray-900 dark:text-white">{job.company}</span>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-small text-gray-900 dark:text-white">{job.jobTitle || job.title}</span>
                  </td>

                  {/* Location */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-small text-gray-500 dark:text-gray-400">
                      <MapPin size={14} />
                      <span className="truncate max-w-[150px]">{job.location || '-'}</span>
                    </div>
                  </td>

                  {/* Comp Range */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-small text-gray-600 dark:text-gray-300">{getCompRange(job)}</span>
                  </td>

                  {/* ATS Score */}
                  <td className="px-6 py-4 whitespace-nowrap align-middle">
                    <div className="w-24">
                      {typeof atsScore === 'number' ? (
                        <>
                          <div className="flex justify-between text-small mb-1">
                            <span className={atsScore >= 80 ? 'text-green-600 dark:text-green-400 font-medium' : 'text-amber-600 dark:text-amber-400'}>
                              {atsScore}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${atsScore >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                              style={{ width: `${atsScore}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        // No ATS measurement exists yet. Show that plainly rather
                        // than substituting a job-fit score under the ATS label.
                        <span className="text-small text-gray-400 dark:text-gray-500" title="No ATS measurement recorded for this document yet">
                          Not measured
                        </span>
                      )}
                    </div>
                  </td>

                  {/* CV Status */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {hasCV ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                    )}
                  </td>

                  {/* CL Status */}
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {hasCL ? (
                      <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mx-auto" />
                    )}
                  </td>

                  {/* Risk Factor */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Shield size={14} className={riskLevel === 'low' ? 'text-blue-500' : 'text-gray-400'} />
                      <span className={`text-small ${riskLevel === 'low' ? 'text-gray-600 dark:text-gray-300' :
                        riskLevel === 'high' ? 'text-red-500' : 'text-gray-500'
                        }`}>
                        {riskLevel === 'low' ? 'Low Risk' : riskLevel === 'high' ? 'High Risk' : 'Analyzing...'}
                      </span>
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => onDownload?.(job)}
                        className="p-1.5 bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                        title="Download Docs"
                      >
                        <Download size={16} />
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

export default CreatedStageView;
