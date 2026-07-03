'use client';

import React from 'react';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Deadline {
  id: string;
  title: string;
  type: 'Interview' | 'Assessment' | 'Application';
  date: string;
  timeLeft: string;
}

const defaultDeadlines: Deadline[] = [
  { id: '1', title: 'Google Interview', type: 'Interview', date: 'Tomorrow - 10:00 AM', timeLeft: '1d left' },
  { id: '2', title: 'Stripe Online Assessment', type: 'Assessment', date: 'Oct 24 - 11:59 PM', timeLeft: '2d left' },
  { id: '3', title: 'Meta Follow-up', type: 'Application', date: 'Oct 25', timeLeft: '3d left' },
];

export default function UpcomingDeadlinesWidget({ deadlines = defaultDeadlines, loading = false, empty = false }: { deadlines?: Deadline[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="upcoming-deadlines"
      title="Upcoming Deadlines"
      subtitle="Priority Action Items"
      type="list"
      userTier={['focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No upcoming deadlines",
        description: "You're all caught up for now.",
      }}
      className="h-full"
    >
      <div className="space-y-3">
        {deadlines.map((deadline) => (
          <div 
            key={deadline.id} 
            className="group p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                  deadline.type === 'Interview' ? 'bg-amber-100 text-amber-700' :
                  deadline.type === 'Assessment' ? 'bg-indigo-100 text-indigo-700' :
                  'bg-blue-100 text-blue-700'
                )}>
                  {deadline.type}
                </div>
                <span className="text-[10px] font-bold text-rose-500">{deadline.timeLeft}</span>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#83d60d] transition-colors" />
            </div>
            
            <h4 className="text-small font-black text-gray-800 dark:text-gray-200 mb-1">{deadline.title}</h4>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
              <Calendar size={10} />
              <span>{deadline.date}</span>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
