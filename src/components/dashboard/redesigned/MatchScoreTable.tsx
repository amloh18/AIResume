'use client';

import React from 'react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface JobMatch {
  job: string;
  company: string;
  match: number;
  stage: string;
  deadline: string;
}

export default function MatchScoreTable({ matches, loading = false, empty = false }: { matches?: JobMatch[], loading?: boolean, empty?: boolean }) {
  const displayMatches = matches || [];
  const isEmpty = empty || displayMatches.length === 0;
  return (
    <DashboardWidget
      id="match-score-table"
      title="Match Scores"
      subtitle="Application Performance"
      type="table"
      userTier={['focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No matches found",
        description: "Add jobs to compare match scores.",
      }}
      className="h-full"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/5">
              <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Job</th>
              <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Match</th>
              <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Stage</th>
              <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Deadline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-white/[0.02]">
            {displayMatches.map((match, i) => (
              <tr key={i} className="group hover:bg-gray-50/50 dark:hover:bg-white/[0.01] transition-colors">
                <td className="py-4 pr-4">
                  <div className="text-small font-black text-gray-800 dark:text-gray-200">{match.job}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{match.company}</div>
                </td>
                <td className="py-4 pr-4">
                  <div className={cn(
                    "text-small font-black",
                    match.match >= 90 ? "text-[#83d60d]" : "text-amber-500"
                  )}>
                    {match.match}%
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <div className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    {match.stage}
                  </div>
                </td>
                <td className="py-4 text-right">
                  <div className="text-[10px] font-bold text-gray-500">{match.deadline}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardWidget>
  );
}
