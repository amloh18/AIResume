'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, FileText, BarChart3 } from 'lucide-react';

type TabType = 'tracker' | 'documents' | 'analytics';

const tabs = [
  { id: 'tracker', label: 'Tracker', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

interface AnalyticsTabNavigationProps {
  activeTab: TabType;
}

export function AnalyticsTabNavigation({ activeTab }: AnalyticsTabNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTabChange = (tab: TabType) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
      <nav className="-mb-px flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as TabType)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 rounded-t-lg ${
                activeTab === tab.id
                  ? 'border-lime-500 text-lime-600 dark:text-lime-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

export type { TabType };
