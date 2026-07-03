'use client';

import React from 'react';
import { FileText, ExternalLink, Clock } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  updatedAt: string;
  role: string;
}

const defaultDocs: Document[] = [
  { id: '1', title: 'Google - Frontend Dev CL', updatedAt: '1d ago', role: 'Google' },
  { id: '2', title: 'Meta - Senior React CL', updatedAt: '4d ago', role: 'Meta' },
];

export default function CoverLetterWidget({ docs = defaultDocs, loading = false, empty = false }: { docs?: Document[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="cover-letters"
      title="Cover Letters"
      subtitle="Job-Specific Applications"
      type="list"
      userTier={['starter', 'focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No cover letters created yet",
        description: "Generate a cover letter for your next application.",
        action: {
          label: "Create Letter",
          onClick: () => window.location.href = '/editor?tab=cover-letters',
          primary: true
        }
      }}
      className="h-auto min-h-[240px] w-full self-start"
    >
      <div className="space-y-3">
        {docs.map((doc) => (
          <div 
            key={doc.id} 
            className="group flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-blue-500">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-small font-black text-gray-800 dark:text-gray-200 truncate">{doc.title}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{doc.role}</p>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-medium text-gray-400 flex items-center gap-1 justify-end">
                <Clock size={8} />
                {doc.updatedAt}
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
