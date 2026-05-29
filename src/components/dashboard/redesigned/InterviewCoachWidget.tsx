'use client';

import React from 'react';
import { Play, Trophy, Clock } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

export default function InterviewCoachWidget({ loading = false, empty = false }: { loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="interview-coach"
      title="Interview Coach"
      subtitle="AI-Powered Preparation"
      type="list"
      userTier={['focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "Start your first session",
        description: "Prepare for your interviews with AI-generated questions.",
        action: {
          label: "Start Session",
          onClick: () => console.log('Start Session'),
          primary: true
        }
      }}
      className="h-full"
    >
      <div className="flex items-center gap-6 mb-6">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle className="text-gray-100 dark:text-white/5" strokeWidth="3" stroke="currentColor" fill="none" cx="18" cy="18" r="16" />
            <circle 
              className="text-indigo-500 transition-all duration-1000" 
              strokeWidth="3" 
              strokeDasharray="60, 100"
              strokeLinecap="round" stroke="currentColor" fill="none" cx="18" cy="18" r="16" 
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-sm font-black text-gray-900 dark:text-white">60%</span>
          </div>
        </div>
        
        <div className="flex-1">
          <h4 className="text-sm font-black text-gray-800 dark:text-gray-200">React Interview Prep</h4>
          <p className="text-xs text-gray-500 font-medium mt-1">Next: Advanced Hooks & SSR</p>
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Trophy size={14} className="text-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">7 Day Streak</span>
            </div>
          </div>
        </div>
      </div>
      
      <button className="w-full flex items-center justify-center gap-2 py-4 rounded-3xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all group shadow-lg shadow-indigo-600/20">
        <Play size={14} fill="currentColor" />
        Resume Session
      </button>
    </DashboardWidget>
  );
}
