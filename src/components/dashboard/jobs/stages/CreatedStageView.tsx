'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Building, MapPin, Download, Zap, TrendingUp, AlertTriangle, CheckCircle, Shield, Globe, Calendar, DollarSign } from 'lucide-react';
import { CVJourney } from '@/types/cv';
import { JobApplication } from '@/types/job';
import { JobTable, JobTableHeader, JobTableRow, JobTableCompanyCell, JobTableRoleCell, JobTableLocationCell, JobTableCompCell } from './JobTablePrimitives';



interface CreatedStageViewProps {
  jobs: JobApplication[];
  journeys?: CVJourney[];
  getJobJourneys: (jobId: string) => CVJourney[];
  getJourneyProgress: (journey: CVJourney) => number;
  getJourneyStatusText: (jobJourneys: CVJourney[], jobStatus?: string) => string;
  onJobClick: (job: JobApplication) => void;
  onRefresh?: () => void;
  onImproveATS?: (job: JobApplication) => void;
  onDownload?: (job: JobApplication) => void;
}

const CreatedStageView: React.FC<CreatedStageViewProps> = ({
  jobs,
  getJobJourneys,
  onJobClick,
  onRefresh,
  onImproveATS,
  onDownload,
}) => {
  const [showReadyOnly, setShowReadyOnly] = useState(false);

  const filteredJobs = showReadyOnly
    ? jobs.filter(job => {
      const journeys = getJobJourneys(job.id);
      const atsScore = journeys[0]?.atsScore || (job as any).atsScore || (job as any).matchScore || 0;
      return atsScore >= 80;
    })
    : jobs;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-h3 font-semibold text-gray-900 dark:text-white mb-2">
          No created jobs
        </h3>
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
          className={`flex items-center gap-2 text-small font-medium px-3 py-1.5 rounded-lg transition-colors ${showReadyOnly
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5'
            }`}
        >
          <CheckCircle size={14} />
          <span>Ready to Apply (ATS &gt; 80)</span>
        </button>
      </div>

      <JobTable
        headers={
          <>
            <JobTableHeader label="Company" />
            <JobTableHeader label="Role" />
            <JobTableHeader label="Location" />
            <JobTableHeader label="Comp Range" />
            <JobTableHeader label="ATS Score" />
            <JobTableHeader label="CV Status" align="center" />
            <JobTableHeader label="CL Status" align="center" />
            <JobTableHeader label="Risk Factor" />
            <JobTableHeader label="Actions" align="right" />
          </>
        }
      >
        {filteredJobs.map((job) => {
          const journeys = getJobJourneys(job.id);
          const journey = journeys[0]; // Primary journey
          const atsScore = journey?.atsScore || (job as any).atsScore || (job as any).matchScore || 0;
          const hasCV = !!journey?.cvId;
          const hasCL = !!journey?.coverLetterId;
          const riskLevel = job.trustSnapshot?.ghostRiskLevel || 'unknown';

          return (
            <JobTableRow key={job.id || job._id} job={job} onClick={() => onJobClick(job)}>
              <JobTableCompanyCell job={job} />
              <JobTableRoleCell job={job} />
              <JobTableLocationCell job={job} />
              <JobTableCompCell job={job} />

              {/* ATS Score */}
              <td className="px-6 py-4 whitespace-nowrap align-middle">
                <div className="w-24">
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
                    onClick={(e) => {
                      e.stopPropagation();
                      onImproveATS?.(job);
                    }}
                    className="p-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary)]/20 transition-colors"
                    title="Improve ATS"
                  >
                    <Zap size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownload?.(job);
                    }}
                    className="p-1.5 bg-[var(--bg-secondary)] text-[color:var(--text-primary)] rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    title="Download Docs"
                  >
                    <Download size={16} />
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

export default CreatedStageView;
