'use client';

import React from 'react';
import { ToggleLeft, ToggleRight, Sliders, DollarSign, Globe } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

export default function AutomationSettingsWidget({ loading = false }: { loading?: boolean }) {
  const [autoApply, setAutoApply] = React.useState(true);
  const [matchThreshold, setMatchThreshold] = React.useState(85);

  return (
    <DashboardWidget
      id="automation-settings"
      title="Automation Settings"
      subtitle="Control & Parameters"
      type="settings"
      userTier={['smart']}
      loading={loading}
      className="h-full"
    >
      <div className="space-y-6">
        {/* Auto Apply Toggle */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
              autoApply ? "bg-[#83d60d]/20 text-[#83d60d]" : "bg-gray-200 text-gray-500"
            )}>
              <ToggleRight size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">Auto Apply</p>
              <p className="text-[10px] text-gray-500 font-medium">Automatic submission</p>
            </div>
          </div>
          <button 
            onClick={() => setAutoApply(!autoApply)}
            className={cn(
              "w-10 h-5 rounded-full relative transition-all duration-300",
              autoApply ? "bg-[#83d60d]" : "bg-gray-300"
            )}
          >
            <div className={cn(
              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all duration-300",
              autoApply ? "right-1" : "left-1"
            )} />
          </button>
        </div>

        {/* Match Threshold Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sliders size={14} className="text-gray-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Match Threshold</span>
            </div>
            <span className="text-xs font-black text-[#83d60d]">{matchThreshold}%</span>
          </div>
          <input 
            type="range" 
            min="50" 
            max="100" 
            value={matchThreshold} 
            onChange={(e) => setMatchThreshold(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full appearance-none cursor-pointer accent-[#83d60d]"
          />
        </div>

        {/* Preferences Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer group">
            <DollarSign size={14} className="text-gray-400 group-hover:text-[#83d60d] mb-2" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Salary</p>
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">$120k+</p>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer group">
            <Globe size={14} className="text-gray-400 group-hover:text-[#83d60d] mb-2" />
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Type</p>
            <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">Remote</p>
          </div>
        </div>
      </div>
    </DashboardWidget>
  );
}
