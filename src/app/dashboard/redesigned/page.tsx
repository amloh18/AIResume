'use client';

import React, { Suspense } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import SidebarNav from '@/components/dashboard/SidebarNav';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import CVEditorCard from '@/components/dashboard/cards/CVEditorCard';
import JobTrackerCard from '@/components/dashboard/cards/JobTrackerCard';
import ApplicationTrackerCard from '@/components/dashboard/cards/ApplicationTrackerCard';
import InterviewCoachCard from '@/components/dashboard/cards/InterviewCoachCard';
import ProgressOverviewChart from '@/components/dashboard/charts/ProgressOverviewChart';
import ApplicationFunnel from '@/components/dashboard/charts/ApplicationFunnel';
import ActivityFeed from '@/components/dashboard/feeds/ActivityFeed';
import AIInsightsWidget from '@/components/dashboard/widgets/AIInsightsWidget';
import TopSkillsWidget from '@/components/dashboard/widgets/TopSkillsWidget';
import JobRecommendationsWidget from '@/components/dashboard/widgets/JobRecommendationsWidget';
import SalaryInsightsWidget from '@/components/dashboard/widgets/SalaryInsightsWidget';
import StreakWidget from '@/components/dashboard/widgets/StreakWidget';
import GoalsWidget from '@/components/dashboard/widgets/GoalsWidget';

export default function RedesignedDashboard() {
  return (
    <RouteGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50/50 dark:bg-black">
        {/* Sidebar */}
        <SidebarNav />

        {/* Main Content Area */}
        <div className="lg:ml-[84px] transition-all duration-300 lg:expanded:ml-[240px]">
          <div className="p-4 md:p-6 lg:p-8 pt-16 lg:pt-8">
            
            {/* Greeting Header */}
            <div className="mb-6">
              <GreetingHeader />
            </div>

            {/* Top Hub Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-6">
              <CVEditorCard />
              <JobTrackerCard />
              <ApplicationTrackerCard />
              <InterviewCoachCard />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
              <div className="lg:col-span-2">
                <ProgressOverviewChart />
              </div>
              <div className="lg:col-span-1">
                <ApplicationFunnel />
              </div>
            </div>

            {/* Widgets Grid - Top Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
              {/* Left column: AI Insights */}
              <div className="lg:col-span-1">
                <AIInsightsWidget />
              </div>

              {/* Middle column: Top Skills */}
              <div className="lg:col-span-1">
                <TopSkillsWidget />
              </div>

              {/* Right column: Salary Insights */}
              <div className="lg:col-span-1">
                <SalaryInsightsWidget />
              </div>
            </div>

            {/* Middle Row: Activity Feed + Job Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              <ActivityFeed />
              <JobRecommendationsWidget />
            </div>

            {/* Bottom Row: Streak + Goals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6">
              <StreakWidget />
              <GoalsWidget />
            </div>

          </div>
        </div>
      </div>
    </RouteGuard>
  );
}

// CSS to handle expanded state class
const style = document.createElement('style');
style.innerHTML = `
  .expanded\\:ml-\\[240px\\] {
    margin-left: 240px;
  }
  @media (min-width: 1024px) {
    .lg:expanded\\:ml-\\[240px\\] {
      margin-left: 240px;
    }
  }
`;
document.head.appendChild(style);
