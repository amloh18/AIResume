'use client';

import React from 'react';
import { Tag, Plus } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Keyword {
  name: string;
  category: string;
}

const defaultKeywords: Keyword[] = [
  { name: 'Docker', category: 'DevOps' },
  { name: 'GraphQL', category: 'Backend' },
  { name: 'System Design', category: 'Architecture' },
  { name: 'Kubernetes', category: 'DevOps' },
  { name: 'Next.js', category: 'Frontend' },
];

export default function KeywordGapsWidget({ keywords = defaultKeywords, loading = false, empty = false }: { keywords?: Keyword[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="keyword-gaps"
      title="Keyword Gaps"
      subtitle="Missing Skills from ATS"
      type="list"
      userTier={['starter', 'focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No keyword gaps detected",
        description: "Run an ATS scan on a tailored CV to find missing keywords for your target role.",
      }}
      className="h-full"
    >
      <div className="flex flex-wrap gap-2">
        {keywords.map((kw) => (
          <div 
            key={kw.name} 
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/50 transition-all cursor-pointer"
          >
            <Tag size={12} className="text-gray-400 group-hover:text-[#83d60d]" />
            <span className="text-small font-bold text-gray-600 dark:text-gray-300">{kw.name}</span>
            <span className="text-[9px] font-black text-gray-300 dark:text-white/20 uppercase">{kw.category}</span>
            <div className="w-4 h-4 rounded-full bg-white dark:bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Plus size={10} className="text-[#83d60d]" />
            </div>
          </div>
        ))}
      </div>
      
      {keywords.length > 0 && (
        <div className="mt-6 p-4 rounded-[24px] bg-slate-900 dark:bg-black border border-gray-800">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Pro Tip</p>
          <p className="text-[11px] font-medium text-gray-300 leading-relaxed">
            Adding these {keywords.length} keyword{keywords.length > 1 ? 's' : ''} could increase your match score by up to <span className="text-[#83d60d] font-black">{Math.min(40, keywords.length * 5)}%</span>.
          </p>
        </div>
      )}
    </DashboardWidget>
  );
}
