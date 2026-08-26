'use client';

import React from 'react';
import { FileText, ExternalLink, Clock } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  matchScore: number;
  updatedAt: string;
  role: string;
}

export default function TailoredCVWidget({ docs, loading = false, empty = false }: { docs?: Document[], loading?: boolean, empty?: boolean }) {
  const displayDocs = docs || [];
  const isEmpty = empty || displayDocs.length === 0;
  return (
    <DashboardWidget
      id="tailored-cvs"
      title="Tailored CVs"
      subtitle="Job-Specific Documents"
      type="list"
      userTier={['starter', 'focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No tailored CVs yet",
        description: "Generate one from a job posting to see it here.",
        action: {
          label: "Generate CV",
          onClick: () => console.log('Generate CV'),
          primary: true
        }
      }}
      className="h-full"
    >
      <div className="space-y-3">
        {displayDocs.map((doc) => (
          <div 
            key={doc.id} 
            className="group flex items-center gap-4 p-3 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[#83d60d]">
              <FileText size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-small font-black text-gray-800 dark:text-gray-200 truncate">{doc.title}</h4>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{doc.role}</p>
            </div>
            <div className="text-right">
              <div className="text-small font-black text-[#83d60d]">{doc.matchScore}%</div>
              <div className="text-[9px] font-medium text-gray-400 flex items-center gap-1 justify-end">
                <Clock size={8} />
                {doc.updatedAt}
              </div>
            </div>
            <ExternalLink size={14} className="text-gray-300 group-hover:text-[#83d60d] transition-colors" />
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
