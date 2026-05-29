'use client';

import React from 'react';
import { Play, Pause, Settings, Zap, Target } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

export default function AutonomousBotWidget({ isActive = true, loading = false, empty = false }: { isActive?: boolean, loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="autonomous-bot"
      title="Autonomous Bot"
      subtitle="AI Mission Control"
      type="hero"
      userTier={['smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "Automation not configured",
        description: "Complete setup to activate your AI job hunter.",
        action: {
          label: "Setup Bot",
          onClick: () => console.log('Setup Bot'),
          primary: true
        }
      }}
      className="h-full bg-slate-900 dark:bg-black text-white"
    >
      <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center gap-4 mb-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all",
              isActive ? "bg-[#83d60d] text-slate-900 shadow-[#83d60d]/20" : "bg-gray-800 text-gray-400"
            )}>
              <Zap size={24} className={isActive ? "animate-pulse" : ""} />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500">System Status</div>
              <div className={cn(
                "text-xl font-black",
                isActive ? "text-[#83d60d]" : "text-gray-400"
              )}>
                {isActive ? 'ACTIVE' : 'PAUSED'}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Jobs Applied</div>
              <div className="text-3xl font-black">23</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Matches Found</div>
              <div className="text-3xl font-black text-[#83d60d]">147</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Avg Match Score</div>
              <div className="text-3xl font-black">92%</div>
            </div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Active Rules</div>
              <div className="text-3xl font-black text-blue-400">4</div>
            </div>
          </div>
        </div>
        
        <div className="w-full lg:w-48 flex flex-col gap-3">
          <button className={cn(
            "flex-1 flex flex-col items-center justify-center gap-2 rounded-[24px] transition-all",
            isActive ? "bg-white/10 hover:bg-white/20 text-white" : "bg-[#83d60d] hover:bg-[#a2f02d] text-slate-900"
          )}>
            {isActive ? <Pause size={24} /> : <Play size={24} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isActive ? 'Pause Bot' : 'Resume Bot'}</span>
          </button>
          
          <button className="flex-1 flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-[24px] transition-all">
            <Settings size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Tune Rules</span>
          </button>
        </div>
      </div>
    </DashboardWidget>
  );
}
