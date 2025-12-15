'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  Target,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  LineChart,
  Clock,
  UserCheck,
  FileCheck,
  Briefcase,
  Award,
  Database,
  RefreshCw
} from 'lucide-react';
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts';

interface CVJourneyKPIData {
  timeRange: string;
  period: {
    startDate: string;
    endDate: string;
  };
  userEngagement: {
    cvJourneysInitiated: number;
    cvJourneyCompletionRate: number;
    averageDocumentsPerJourney: number;
    masterCVOnboardingCompletion: number;
    studioUsageFrequency: number;
    userRetentionRate: number;
  };
  applicationFunnel: {
    applicationStatusFunnel: Array<{ _id: string; count: number }>;
    trackedToAppliedConversionRate: number;
    averageATSScore: number;
    atsScoreCount: number;
    totalTrackedJobs: number;
    appliedJobs: number;
  };
  contentHealth: {
    orphanedJourneys: number;
    assetGrowthData: {
      cvs: Array<{ _id: any; count: number }>;
      coverLetters: Array<{ _id: any; count: number }>;
    };
    masterCVToTailoredCVRatio: number;
    journeyStatusDistribution: Array<{ _id: string; count: number }>;
    averageCompletionTime: number;
  };
  summary: {
    totalUsers: number;
    totalMasterCVs: number;
    totalTailoredCVs: number;
    totalCoverLetters: number;
    totalJourneys: number;
    completedJourneys: number;
  };
}

const CVJourneyKPIs: React.FC = () => {
  const [kpiData, setKpiData] = useState<CVJourneyKPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchKPIData();
  }, [timeRange]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cv-journey-kpis?range=${timeRange}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setKpiData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.message || 'Failed to fetch KPI data');
      }
    } catch (error) {
      console.error('Error fetching CV Journey KPI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'created': '#6B7280',
      'applied': '#10B981',
      'screening': '#3B82F6',
      'interview': '#F59E0B',
      'offer': '#8B5CF6',
      'rejected': '#EF4444',
      'accepted': '#059669',
      'withdrawn': '#6B7280',
      'in-progress': '#3B82F6',
      'completed': '#10B981',
      'paused': '#F59E0B'
    };
    return colors[status] || '#6B7280';
  };

  const getCompletionRateColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionRateBgColor = (rate: number) => {
    if (rate >= 70) return 'bg-green-100 dark:bg-green-900/20';
    if (rate >= 50) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CV Journey KPIs</h1>
          <div className="animate-pulse bg-gray-200 dark:bg-gray-600 h-10 w-32 rounded"></div>
        </div>
        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!kpiData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CV Journey KPIs</h1>
          <button
            onClick={fetchKPIData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
        <div className="text-center py-12">
          <AlertTriangle size={48} className="mx-auto text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load KPIs</h3>
          <p className="text-gray-600 dark:text-gray-400">Unable to fetch CV Journey KPI data. Please try again.</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const applicationFunnelData = kpiData.applicationFunnel.applicationStatusFunnel.map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    fill: getStatusColor(item._id)
  }));

  const journeyStatusData = kpiData.contentHealth.journeyStatusDistribution.map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    fill: getStatusColor(item._id)
  }));

  // Asset growth data
  const assetGrowthChartData = kpiData.contentHealth.assetGrowthData.cvs.map((cvItem, index) => {
    const coverLetterItem = kpiData.contentHealth.assetGrowthData.coverLetters[index];
    return {
      date: `${cvItem._id.month}/${cvItem._id.day}`,
      cvs: cvItem.count,
      coverLetters: coverLetterItem ? coverLetterItem.count : 0
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CV Journey KPIs</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive metrics for CV Journey management system
            {lastUpdated && (
              <span className="ml-2 text-sm">
                • Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button
            onClick={fetchKPIData}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>
      {/* 1. USER ENGAGEMENT & ADOPTION KPIs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="text-blue-500" size={20} />
          1. User Engagement & Adoption KPIs
        </h2>

        <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6">
          {/* CV Journeys Initiated */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CV Journeys Initiated</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {kpiData.userEngagement.cvJourneysInitiated.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">New job applications tracked</p>
              </div>
              <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
                <Target className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </div>

          {/* CV Journey Completion Rate */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Journey Completion Rate</p>
                <p className={`text-2xl font-bold mt-1 ${getCompletionRateColor(kpiData.userEngagement.cvJourneyCompletionRate)}`}>
                  {kpiData.userEngagement.cvJourneyCompletionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">With both CV & Cover Letter</p>
              </div>
              <div className={`p-3 rounded-full ${getCompletionRateBgColor(kpiData.userEngagement.cvJourneyCompletionRate)}`}>
                <CheckCircle className={`h-6 w-6 ${getCompletionRateColor(kpiData.userEngagement.cvJourneyCompletionRate)}`} />
              </div>
            </div>
          </div>

          {/* Average Documents per Journey */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Documents per User</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {kpiData.userEngagement.averageDocumentsPerJourney.toFixed(1)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tailored CVs + Cover Letters</p>
              </div>
              <div className="p-3 rounded-full bg-purple-500 bg-opacity-10">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </div>

          {/* Master CV Onboarding Completion */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Master CV Completion</p>
                <p className={`text-2xl font-bold mt-1 ${getCompletionRateColor(kpiData.userEngagement.masterCVOnboardingCompletion)}`}>
                  {kpiData.userEngagement.masterCVOnboardingCompletion.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Users with Master CV</p>
              </div>
              <div className={`p-3 rounded-full ${getCompletionRateBgColor(kpiData.userEngagement.masterCVOnboardingCompletion)}`}>
                <UserCheck className={`h-6 w-6 ${getCompletionRateColor(kpiData.userEngagement.masterCVOnboardingCompletion)}`} />
              </div>
            </div>
          </div>

          {/* Studio Usage Frequency */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Studio Usage</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {kpiData.userEngagement.studioUsageFrequency.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Document saves</p>
              </div>
              <div className="p-3 rounded-full bg-green-500 bg-opacity-10">
                <Activity className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </div>

          {/* User Retention Rate */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">User Retention</p>
                <p className={`text-2xl font-bold mt-1 ${getCompletionRateColor(kpiData.userEngagement.userRetentionRate)}`}>
                  {kpiData.userEngagement.userRetentionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Returning users</p>
              </div>
              <div className={`p-3 rounded-full ${getCompletionRateBgColor(kpiData.userEngagement.userRetentionRate)}`}>
                <TrendingUp className={`h-6 w-6 ${getCompletionRateColor(kpiData.userEngagement.userRetentionRate)}`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. APPLICATION FUNNEL & EFFECTIVENESS KPIs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Briefcase className="text-green-500" size={20} />
          2. Application Funnel & Effectiveness KPIs
        </h2>

        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6">
          {/* Application Status Funnel */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Status Funnel</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={applicationFunnelData}>
                <XAxis
                  dataKey="name"
                  stroke="#6B7280"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="value" fill="#3B82F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Metrics */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tracked-to-Applied Rate</p>
                  <p className={`text-2xl font-bold mt-1 ${getCompletionRateColor(kpiData.applicationFunnel.trackedToAppliedConversionRate)}`}>
                    {kpiData.applicationFunnel.trackedToAppliedConversionRate.toFixed(1)}%
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {kpiData.applicationFunnel.appliedJobs} of {kpiData.applicationFunnel.totalTrackedJobs} jobs
                  </p>
                </div>
                <div className={`p-3 rounded-full ${getCompletionRateBgColor(kpiData.applicationFunnel.trackedToAppliedConversionRate)}`}>
                  <Target className={`h-6 w-6 ${getCompletionRateColor(kpiData.applicationFunnel.trackedToAppliedConversionRate)}`} />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average ATS Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {kpiData.applicationFunnel.averageATSScore.toFixed(1)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    From {kpiData.applicationFunnel.atsScoreCount} CVs
                  </p>
                </div>
                <div className="p-3 rounded-full bg-yellow-500 bg-opacity-10">
                  <Award className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CONTENT & SYSTEM HEALTH KPIs */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Database className="text-orange-500" size={20} />
          3. Content & System Health KPIs
        </h2>

        <div className="grid grid-cols-1 desktop:grid-cols-2 gap-6">
          {/* Asset Growth Rate */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Asset Growth Rate</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={assetGrowthChartData}>
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  fontSize={12}
                />
                <YAxis stroke="#6B7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="cvs"
                  stackId="1"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.6}
                  name="CVs"
                />
                <Area
                  type="monotone"
                  dataKey="coverLetters"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Cover Letters"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* System Health Metrics */}
          <div className="space-y-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Orphaned Journeys</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {kpiData.contentHealth.orphanedJourneys}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">14+ days without CV</p>
                </div>
                <div className="p-3 rounded-full bg-red-500 bg-opacity-10">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Master CV Ratio</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {kpiData.contentHealth.masterCVToTailoredCVRatio.toFixed(1)}:1
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Tailored CVs per Master CV</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500 bg-opacity-10">
                  <FileCheck className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Completion Time</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {kpiData.contentHealth.averageCompletionTime.toFixed(1)} days
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Journey to completion</p>
                </div>
                <div className="p-3 rounded-full bg-blue-500 bg-opacity-10">
                  <Clock className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Summary</h3>
        <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.totalUsers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.totalMasterCVs}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Master CVs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.totalTailoredCVs}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tailored CVs</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.totalCoverLetters}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cover Letters</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.totalJourneys}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Journeys</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpiData.summary.completedJourneys}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CVJourneyKPIs;
