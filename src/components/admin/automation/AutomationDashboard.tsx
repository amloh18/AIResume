'use client';

import React from 'react';
import { Sparkles, LayoutDashboard, ShieldAlert } from 'lucide-react';
import AutomationOverview from './AutomationOverview';
import FailedApplicationsQueue from './FailedApplicationsQueue';

interface AutomationDashboardProps {
  activeSubTab?: string;
  onSubTabChange?: (sub: string) => void;
}

export default function AutomationDashboard({
  activeSubTab = 'overview',
  onSubTabChange,
}: AutomationDashboardProps) {
  const subTabs = [
    { id: 'overview', label: 'Queue & Health', icon: LayoutDashboard },
    { id: 'review', label: 'Review Queue & Triage', icon: ShieldAlert },
  ];

  const currentTab = activeSubTab || 'overview';

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Autonomous Auto-Apply Supervisor
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Auto-Apply Engine & Reliability Control Room
          </h1>
          <p className="text-sm text-white/50 mt-1">
            Real-time Playwright worker monitoring, crash reconciliation watchdog, and ATS submission verification.
          </p>
        </div>
      </div>

      {/* Sub Tab Navigation Pill Bar */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-white/[0.03] border border-white/5 overflow-x-auto">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSubTabChange && onSubTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Render View */}
      {currentTab === 'overview' && <AutomationOverview />}
      {currentTab === 'review' && <FailedApplicationsQueue />}
    </div>
  );
}
