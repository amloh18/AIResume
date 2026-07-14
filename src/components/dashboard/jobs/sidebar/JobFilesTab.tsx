'use client';

import React from 'react';
import { FileText, Eye, Loader2, Sparkles } from 'lucide-react';
import { CVJourney } from '@/types/cv';

interface JobFilesTabProps {
  primaryJourney: CVJourney | undefined;
  previewLoading: 'cv' | 'coverLetter' | null;
  handleOpenDocumentPreview: (type: 'cv' | 'coverLetter') => Promise<void>;
  runSidebarAction: (actionId: any) => Promise<void>;
  journeyCardData: any;
}

const JobFilesTab: React.FC<JobFilesTabProps> = ({
  primaryJourney,
  previewLoading,
  handleOpenDocumentPreview,
  runSidebarAction,
  journeyCardData
}) => {
  return (
    <div className="space-y-4">
      <h4 className="text-small font-bold text-gray-900 dark:text-white uppercase tracking-wider">Tailored Files</h4>
      {primaryJourney && (primaryJourney.cvId || primaryJourney.coverLetterId) ? (
        <div className="grid gap-3">
          {primaryJourney.cvId && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] hover:bg-gray-100/50 dark:hover:bg-[#20291d] transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-emerald-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-small font-semibold text-gray-900 dark:text-white truncate">Tailored CV</p>
                  <p className="text-[10px] text-gray-500 truncate">Linked Document</p>
                </div>
              </div>
              <button
                onClick={() => void handleOpenDocumentPreview('cv')}
                disabled={previewLoading === 'cv'}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-[#80FF00] shrink-0"
              >
                {previewLoading === 'cv' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                Preview
              </button>
            </div>
          )}
          {primaryJourney.coverLetterId && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-[#181f16] hover:bg-gray-100/50 dark:hover:bg-[#20291d] transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-5 w-5 text-indigo-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-small font-semibold text-gray-900 dark:text-white truncate">Tailored Cover Letter</p>
                  <p className="text-[10px] text-gray-500 truncate">Linked Document</p>
                </div>
              </div>
              <button
                onClick={() => void handleOpenDocumentPreview('coverLetter')}
                disabled={previewLoading === 'coverLetter'}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-[#80FF00] shrink-0"
              >
                {previewLoading === 'coverLetter' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
                Preview
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/30 dark:bg-[#181f16]/30 text-center">
          <p className="text-small text-gray-500 dark:text-gray-400 mb-3">No tailored documents linked to this stage yet.</p>
          <button
            onClick={() => void runSidebarAction(journeyCardData.primaryActionId)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 text-white px-3.5 py-2 text-small font-bold transition hover:bg-emerald-600"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Open Journey Editor
          </button>
        </div>
      )}
    </div>
  );
};

export default JobFilesTab;
