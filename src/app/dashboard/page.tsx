'use client';

import React, { Suspense } from 'react';
import RouteGuard from '@/components/auth/RouteGuard';
import GreetingHeader from '@/components/dashboard/GreetingHeader';
import CVEditorCard from '@/components/dashboard/cards/CVEditorCard';
import JobTrackerCard from '@/components/dashboard/cards/JobTrackerCard';
import ApplicationTrackerCard from '@/components/dashboard/cards/ApplicationTrackerCard';
import InterviewCoachCard from '@/components/dashboard/cards/InterviewCoachCard';
import ProgressOverviewChart from '@/components/dashboard/charts/ProgressOverviewChart';
import ApplicationFunnel from '@/components/dashboard/charts/ApplicationFunnel';
import AIInsightsWidget from '@/components/dashboard/widgets/AIInsightsWidget';
import TopSkillsWidget from '@/components/dashboard/widgets/TopSkillsWidget';
import JobRecommendationsWidget from '@/components/dashboard/widgets/JobRecommendationsWidget';
import SalaryInsightsWidget from '@/components/dashboard/widgets/SalaryInsightsWidget';
import StreakWidget from '@/components/dashboard/widgets/StreakWidget';
import GoalsWidget from '@/components/dashboard/widgets/GoalsWidget';

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <RouteGuard requireAuth={true}>
        <DashboardContent />
      </RouteGuard>
    </Suspense>
  );
}

function DashboardContent() {
  return (
    <div className="space-y-6">
      {/* Greeting Header with Search and Profile Strength */}
      <GreetingHeader />

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <CVEditorCard />
        <JobTrackerCard />
        <ApplicationTrackerCard />
        <InterviewCoachCard />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2">
          <ProgressOverviewChart className="h-full" />
        </div>
        <div className="lg:col-span-1">
          <ApplicationFunnel className="h-full" />
        </div>
      </div>

      {/* Intelligence & Goals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <GoalsWidget />
        <AIInsightsWidget />
        <TopSkillsWidget />
      </div>

      {/* Market & Engagement Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <SalaryInsightsWidget />
        <StreakWidget />
        <JobRecommendationsWidget />
      </div>

    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
    </div>
  );
}
