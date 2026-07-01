'use client';

import React from 'react';
import { CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Fix {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

const defaultFixes: Fix[] = [
  { id: '1', text: 'Add measurable achievements to 2 roles', priority: 'high' },
  { id: '2', text: 'Improve ATS keywords for "React/Node"', priority: 'medium' },
  { id: '3', text: 'Add React.js to skills section', priority: 'medium' },
  { id: '4', text: 'Expand leadership signals in experience', priority: 'low' },
];

export default function SuggestedFixesWidget({ fixes = defaultFixes, loading = false, empty = false }: { fixes?: Fix[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="suggested-fixes"
      title="Suggested Fixes"
      subtitle="AI-Generated Improvements"
      type="list"
      userTier={['starter', 'focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "Your CV looks great",
        description: "No major issues found. You're ready to apply!",
      }}
      className="h-full"
    >
      <div className="space-y-3">
        {fixes.map((fix) => (
          <div 
            key={fix.id} 
            className={cn(
              "flex items-start gap-3 p-3 rounded-2xl border transition-all hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer group",
              fix.priority === 'high' ? 'border-rose-100 dark:border-rose-900/20 bg-rose-50/30 dark:bg-rose-900/5' : 'border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]'
            )}
          >
            <div className={cn(
              "w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5",
              fix.priority === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            )}>
              {fix.priority === 'high' ? <AlertCircle size={12} /> : <CheckCircle2 size={12} />}
            </div>
            <div className="flex-1">
              <p className="text-small font-bold text-gray-700 dark:text-gray-300 leading-snug">
                {fix.text}
              </p>
            </div>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-[#83d60d] transition-colors" />
          </div>
        ))}
      </div>
      
      <button className="w-full mt-4 py-3 rounded-2xl bg-[#f0fbc9] dark:bg-[#83d60d]/10 text-[#487e04] dark:text-[#83d60d] text-[10px] font-black uppercase tracking-widest hover:bg-[#e2f7aa] transition-colors">
        Apply All Fixes
      </button>
    </DashboardWidget>
  );
}
