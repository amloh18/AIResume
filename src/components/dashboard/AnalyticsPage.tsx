'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Briefcase, FileText, BarChart3 } from 'lucide-react';

// Dynamic imports for code splitting
const Analytics = dynamic(() => import('@/components/dashboard/Analytics'), {
  ssr: false,
});

const JobsTracker = dynamic(() => import('@/components/dashboard/JobsTracker'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div></div>
});

const Canvas = dynamic(() => import('@/components/dashboard/Canvas'), {
  ssr: false,
});

type TabType = 'tracker' | 'documents' | 'analytics';

const tabs = [
  { id: 'tracker', label: 'Tracker', icon: Briefcase },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

function AnalyticsTabNav({ activeTab }: { activeTab: TabType }) {
  const handleClick = (tab: TabType) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    window.history.pushState({}, '', `/dashboard?${params.toString()}`);
    // Force re-render by triggering a small state change
    window.dispatchEvent(new Event('popstate'));
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab.id as TabType)}
              className={`flex items-center gap-2 py-3 px-4 border-b-2 font-medium text-sm transition-all duration-200 ${
                isActive
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

function AnalyticsPageContent() {
  const searchParams = useSearchParams();
  
  // Get tab directly from URL - no local state needed
  const activeTab: TabType = (() => {
    const tab = searchParams.get('tab');
    if (tab && ['tracker', 'documents', 'analytics'].includes(tab)) {
      return tab as TabType;
    }
    return 'tracker'; // Default tab
  })();

  // Render content based on URL parameter
  const renderContent = () => {
    switch (activeTab) {
      case 'tracker':
        return <JobsTracker />;
      case 'documents':
        return <Canvas />;
      case 'analytics':
        return <Analytics />;
      default:
        return <JobsTracker />;
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation - Always visible at top */}
      <div className="flex-shrink-0 bg-[#f3f2ee] dark:bg-[#1a230f]">
        <AnalyticsTabNav activeTab={activeTab} />
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    }>
      <AnalyticsPageContent />
    </Suspense>
  );
}
