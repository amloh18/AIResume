'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Briefcase, PenTool, TrendingUp, Target, Sparkles, Zap, 
  Lightbulb, Plus, Edit, Eye, Trash2, Calendar, CheckCircle, Heart
} from 'lucide-react';
// import { useSession } from 'next-auth/react'; // Removed - using Clerk now
import { useSession } from 'next-auth/react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import AnalyticsJourneyWidget from './AnalyticsJourneyWidget';
import PageHeader from './PageHeader';
import MasterCVBadge from './MasterCVBadge';
import { authenticatedFetch } from '@/lib/utils/apiUtils';

// 1. Combined CV Management Section - CV Health Score + Master CV Management + Quick Actions
const CVManagementSection: React.FC<{ 
  cvHealthScore: number; 
  cvs: any[];
  onImproveScore: () => void;
  onCreateCV: () => void;
  onAddJob: () => void;
  onWriteCoverLetter: () => void;
  onSetMasterCV: (cvId: string) => void;
}> = ({ cvHealthScore, cvs, onImproveScore, onCreateCV, onAddJob, onWriteCoverLetter, onSetMasterCV }) => {
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const status = getStatus(cvHealthScore);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - cvHealthScore / 100);

  // Find master CV
  console.log('🔍 CVManagementSection - Received CVs:', cvs);
  console.log('🔍 CVManagementSection - CVs length:', cvs.length);
  const masterCV = cvs.find(cv => cv.isMaster);
  const otherCVs = cvs.filter(cv => !cv.isMaster);
  console.log('🔍 CVManagementSection - Master CV:', masterCV);
  console.log('🔍 CVManagementSection - Other CVs:', otherCVs);

  const calculateCompletionPercentage = (cv: any): number => {
    if (cv.status === 'published') return 100;
    if (cv.status === 'archived') return 0;
    
    let totalScore = 0;
    let maxScore = 0;
    
    const sectionWeights = { personalInfo: 25, experience: 30, education: 20, skills: 15, projects: 10 };
    
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;
    
    if (cv.cvData?.work) {
      const experienceScore = calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;
    
    if (cv.cvData?.education) {
      const educationScore = calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;
    
    if (cv.cvData?.skills) {
      const skillsScore = calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;
    
    if (cv.cvData?.projects) {
      const projectsScore = calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;
    
    const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return Math.max(0, Math.min(100, completionPercentage));
  };

  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    let maxScore = 5;
    if (basics.name && basics.name.trim()) score += 1;
    if (basics.email && basics.email.trim()) score += 1;
    if (basics.phone && basics.phone.trim()) score += 1;
    if (basics.location && (basics.location.city || basics.location.address)) score += 1;
    if (basics.summary && basics.summary.trim()) score += 1;
    return (score / maxScore) * 100;
  };
  
  const calculateExperienceScore = (work: any[]): number => {
    if (!Array.isArray(work) || work.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 3;
    work.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.name && entry.name.trim()) entryScore += 1;
      if (entry.position && entry.position.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      if (entry.summary && entry.summary.trim()) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(work.length, maxEntries));
  };
  
  const calculateEducationScore = (education: any[]): number => {
    if (!Array.isArray(education) || education.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 2;
    education.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.institution && entry.institution.trim()) entryScore += 1;
      if (entry.area && entry.area.trim()) entryScore += 1;
      if (entry.studyType && entry.studyType.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(education.length, maxEntries));
  };
  
  const calculateSkillsScore = (skills: any[]): number => {
    if (!Array.isArray(skills) || skills.length === 0) return 0;
    let totalScore = 0;
    const maxSkills = 5;
    skills.slice(0, maxSkills).forEach(skill => {
      let skillScore = 0;
      let maxSkillScore = 2;
      if (skill.name && skill.name.trim()) skillScore += 1;
      if (skill.keywords && Array.isArray(skill.keywords) && skill.keywords.length > 0) skillScore += 1;
      totalScore += (skillScore / maxSkillScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(skills.length, maxSkills));
  };
  
  const calculateProjectsScore = (projects: any[]): number => {
    if (!Array.isArray(projects) || projects.length === 0) return 0;
    let totalScore = 0;
    const maxProjects = 2;
    projects.slice(0, maxProjects).forEach(project => {
      let projectScore = 0;
      let maxProjectScore = 3;
      if (project.name && project.name.trim()) projectScore += 1;
      if (project.description && project.description.trim()) projectScore += 1;
      if (project.url && project.url.trim()) projectScore += 1;
      totalScore += (projectScore / maxProjectScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
  };

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">CV Management</h2>
        <div className="flex items-center gap-2">
          <MasterCVBadge />
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CV Health Score (Master CV Only) */}
        <div className="text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" fill="none" className="text-gray-200 dark:text-white/10" />
              <defs>
                <linearGradient id="cvHealthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" stroke="url(#cvHealthGradient)" strokeWidth="10" fill="none" 
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} 
                className="transition-all duration-1000 ease-out" strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold text-gray-900 dark:text-white">{cvHealthScore}%</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-white/60 text-sm mb-1">Master CV Health</p>
          <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
        </div>

        {/* Master CV Management */}
        <div className="space-y-3">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm flex items-center gap-2">
            <FileText size={14} className="text-lime-400" />
            Master CV
          </h3>
          {masterCV ? (
            <div className="glass-card-premium rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-gray-900 dark:text-white font-medium text-sm truncate">{masterCV.title || 'Untitled CV'}</h4>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-lime-400 rounded-full"></div>
                  <span className="text-xs text-lime-400 font-medium">Master</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-600 dark:text-white/60">
                <span>Progress: {calculateCompletionPercentage(masterCV)}%</span>
                <span>{new Date(masterCV.updatedAt || masterCV.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="mt-2">
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    calculateCompletionPercentage(masterCV) >= 80 ? 'bg-green-400' : 
                    calculateCompletionPercentage(masterCV) >= 60 ? 'bg-yellow-400' : 
                    calculateCompletionPercentage(masterCV) >= 40 ? 'bg-orange-400' : 'bg-red-400'
                  }`} style={{ width: `${calculateCompletionPercentage(masterCV)}%` }}></div>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card-premium rounded-lg p-3 text-center">
              <p className="text-gray-600 dark:text-white/60 text-xs mb-2">No Master CV Set</p>
              <p className="text-gray-500 dark:text-white/50 text-xs">Select a CV below to make it your master</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <motion.button onClick={onImproveScore}
              className="w-full p-2.5 bg-gradient-to-r from-lime-100 to-lime-200 dark:from-lime-400/20 dark:to-lime-500/20 border border-lime-300 dark:border-lime-400/30 text-lime-700 dark:text-lime-400 rounded-lg font-medium hover:from-lime-200 hover:to-lime-300 dark:hover:from-lime-400/30 dark:hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-xs"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkles size={12} /> Improve Score
            </motion.button>
            <motion.button onClick={onCreateCV}
              className="w-full p-2.5 glass-card-premium text-gray-700 dark:text-white/80 rounded-lg flex items-center justify-center gap-2 text-xs"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={12} /> New CV
            </motion.button>
            <motion.button onClick={onAddJob}
              className="w-full p-2.5 glass-card-premium text-gray-700 dark:text-white/80 rounded-lg flex items-center justify-center gap-2 text-xs"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Briefcase size={12} /> Add Job
            </motion.button>
            <motion.button onClick={onWriteCoverLetter}
              className="w-full p-2.5 glass-card-premium text-gray-700 dark:text-white/80 rounded-lg flex items-center justify-center gap-2 text-xs"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <PenTool size={12} /> Cover Letter
            </motion.button>
          </div>
        </div>
      </div>

      {/* All CVs List Row */}
      {cvs.length > 0 && (
        <div className="mt-6">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm flex items-center gap-2 mb-3">
            <FileText size={14} className="text-blue-400" />
            All CVs ({cvs.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {cvs.map((cv) => (
              <div key={cv.id || cv._id} className={`glass-card-premium rounded-lg p-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-white/10 transition-all duration-200 ${
                cv.isMaster ? 'ring-1 ring-lime-400/30 bg-lime-400/5' : ''
              }`}
                onClick={() => onSetMasterCV(cv.id || cv._id)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="text-gray-900 dark:text-white font-medium text-sm truncate">{cv.title || 'Untitled CV'}</h5>
                      {cv.isMaster && (
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-lime-400 rounded-full"></div>
                          <span className="text-xs text-lime-400 font-medium">Master</span>
                        </div>
                      )}
                    </div>
                    <p className="text-gray-500 dark:text-white/50 text-xs">{calculateCompletionPercentage(cv)}% complete</p>
                  </div>
                  {!cv.isMaster && (
                    <button className="text-blue-400 hover:text-blue-300 text-xs font-medium">
                      Set Master
                    </button>
                  )}
                </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-300 ${
                    calculateCompletionPercentage(cv) >= 80 ? 'bg-green-400' : 
                    calculateCompletionPercentage(cv) >= 60 ? 'bg-yellow-400' : 
                    calculateCompletionPercentage(cv) >= 40 ? 'bg-orange-400' : 'bg-red-400'
                  }`} style={{ width: `${calculateCompletionPercentage(cv)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 2. The "Application Hub" - Enhanced with Application Analytics and Trends
const ApplicationHub: React.FC<{ 
  drafts: any[];
  jobs: any[];
  onResumeDraft: (draftId: string) => void;
  onPreviewDraft: (draftId: string) => void;
  onDiscardDraft: (draftId: string) => void;
}> = ({ drafts, jobs, onResumeDraft, onPreviewDraft, onDiscardDraft }) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'cvs'>('analytics');

  const getApplicationStats = () => {
    const now = new Date();
    const thisWeekJobs = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return jobDate >= weekAgo;
    });

    const thisMonthJobs = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    });

    const lastMonthJobs = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return jobDate >= lastMonth && jobDate < thisMonth;
    });

    const responsiveJobs = jobs.filter(job => job.status !== 'created' && job.status !== 'applied');
    const averageResponseTime = responsiveJobs.length > 0 ? 
      Math.round(responsiveJobs.reduce((sum, job) => {
        const applicationDate = new Date(job.applicationDate || job.createdAt);
        const responseDate = new Date(job.lastStatusUpdate || job.updatedAt);
        return sum + Math.abs(responseDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / responsiveJobs.length) : 0;

    const statusDistribution = jobs.reduce((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      applicationsThisWeek: thisWeekJobs.length,
      applicationsThisMonth: thisMonthJobs.length,
      lastMonthApplications: lastMonthJobs.length,
      monthlyGrowth: lastMonthJobs.length > 0 ? 
        Math.round(((thisMonthJobs.length - lastMonthJobs.length) / lastMonthJobs.length) * 100) : 
        thisMonthJobs.length > 0 ? 100 : 0,
      successRate: jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview' || job.status === 'offer' || job.status === 'accepted').length / jobs.length) * 100) : 0,
      responseRate: jobs.length > 0 ? Math.round((responsiveJobs.length / jobs.length) * 100) : 0,
      averageResponseTime,
      statusDistribution,
      upcomingFollowUps: jobs.filter(job => {
        if (!job.followUpDate) return false;
        const followUpDate = new Date(job.followUpDate);
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        return followUpDate <= threeDaysFromNow && followUpDate >= now;
      }).length
    };
  };

  const getWeeklyTrend = () => {
    const weeks = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);
      const weekJobs = jobs.filter(job => {
        const jobDate = new Date(job.createdAt);
        return jobDate >= weekStart && jobDate < weekEnd;
      });
      weeks.push({
        week: `Week ${i === 0 ? 'Current' : `-${i}`}`,
        applications: weekJobs.length,
        responses: weekJobs.filter(job => job.status !== 'created' && job.status !== 'applied').length
      });
    }
    return weeks;
  };

  const stats = getApplicationStats();
  const weeklyTrend = getWeeklyTrend();

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Application Hub</h2>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'analytics' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'glass-card-premium text-gray-600 dark:text-white/60'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <TrendingUp size={14} className="inline mr-2" /> Analytics
        </motion.button>
        <motion.button onClick={() => setActiveTab('cvs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'cvs' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'glass-card-premium text-gray-600 dark:text-white/60'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <FileText size={14} className="inline mr-2" /> Incomplete CVs ({drafts.length})
      </motion.button>
    </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-4">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div className="p-3 glass-card-premium rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400">{stats.applicationsThisMonth}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">This Month</div>
              {stats.monthlyGrowth !== 0 && (
                <div className={`text-xs font-medium ${stats.monthlyGrowth > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}%
                </div>
              )}
            </div>
            <div className="p-3 glass-card-premium rounded-lg text-center">
              <div className="text-lg font-bold text-green-400">{stats.successRate}%</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Success Rate</div>
            </div>
            <div className="p-3 glass-card-premium rounded-lg text-center">
              <div className="text-lg font-bold text-purple-400">{stats.responseRate}%</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Response Rate</div>
            </div>
            <div className="p-3 glass-card-premium rounded-lg text-center">
              <div className="text-lg font-bold text-orange-400">{stats.averageResponseTime}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Avg Response (days)</div>
            </div>
          </div>

          {/* Weekly Trend Chart */}
          <div className="glass-card-premium rounded-lg p-4">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Weekly Application Trend</h3>
            <div className="space-y-2">
              {weeklyTrend.map((week, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-gray-600 dark:text-white/60">{week.week.replace('Week ', 'W')}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 dark:bg-white/10 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-blue-400 to-blue-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (week.applications / Math.max(...weeklyTrend.map(w => w.applications), 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-white/60 w-8">{week.applications}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Application Status Distribution */}
          <div className="glass-card-premium rounded-lg p-4">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Application Status Overview</h3>
            <div className="space-y-2">
              {Object.entries(stats.statusDistribution).map(([status, count]) => {
                const countNum = count as number;
                const percentage = jobs.length > 0 ? Math.round((countNum / jobs.length) * 100) : 0;
                const statusColors = {
                  'created': 'bg-yellow-400',
                  'applied': 'bg-blue-400',
                  'screening': 'bg-orange-400',
                  'interview': 'bg-purple-400',
                  'offer': 'bg-green-400',
                  'accepted': 'bg-emerald-400',
                  'rejected': 'bg-red-400',
                  'withdrawn': 'bg-gray-400'
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-400'}`}></div>
                      <span className="text-xs text-gray-700 dark:text-white/70 capitalize">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-gray-600 dark:text-white/60">{countNum}</div>
                      <div className="text-xs text-gray-500 dark:text-white/50">({percentage}%)</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-gray-700 dark:text-white/80 text-sm">
              <span>Follow-ups Due (Next 3 Days)</span>
              <span className={`font-medium ${stats.upcomingFollowUps > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {stats.upcomingFollowUps || 'None'}
              </span>
            </div>
            {stats.averageResponseTime > 0 && (
              <div className="flex items-center justify-between text-gray-700 dark:text-white/80 text-sm">
                <span>Response Performance</span>
                <span className={`font-medium ${stats.averageResponseTime <= 7 ? 'text-green-400' : stats.averageResponseTime <= 14 ? 'text-yellow-400' : 'text-orange-400'}`}>
                  {stats.averageResponseTime <= 7 ? 'Excellent' : stats.averageResponseTime <= 14 ? 'Good' : 'Needs Improvement'}
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.length > 0 ? drafts.map((draft) => (
            <div key={draft.id} className="p-4 glass-card-premium rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-lime-400/20">
                    <FileText size={16} className="text-lime-400" />
      </div>
      <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-gray-900 dark:text-white font-medium text-sm">{draft.title}</h4>
                      {draft.isMaster && <MasterCVBadge variant="compact" />}
                    </div>
                    <p className="text-gray-600 dark:text-white/40 text-xs">Progress: {draft.progress}%</p>
        </div>
      </div>
                <div className="text-gray-600 dark:text-white/40 text-xs">{draft.lastEdited.toLocaleDateString()}</div>
        </div>
              <div className="mb-4">
                <div className="flex justify-between text-gray-600 dark:text-white/60 text-xs mb-1">
                  <span>Progress</span>
                  <span>{draft.progress}%</span>
      </div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all duration-300 ${
                    draft.progress >= 80 ? 'bg-green-400' : draft.progress >= 60 ? 'bg-yellow-400' : draft.progress >= 40 ? 'bg-orange-400' : 'bg-red-400'
                  }`} style={{ width: `${draft.progress}%` }}></div>
    </div>
            </div>
              <div className="flex items-center gap-2">
                <motion.button onClick={() => onResumeDraft(draft.id)}
                  className="px-3 py-1.5 bg-lime-400/20 text-lime-400 rounded-lg text-xs font-medium hover:bg-lime-400/30 transition-all duration-300 flex items-center gap-1"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Edit size={12} /> Resume
                </motion.button>
                <motion.button onClick={() => onPreviewDraft(draft.id)}
                  className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-xs font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-1"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Eye size={12} /> Preview
                </motion.button>
                <motion.button onClick={() => onDiscardDraft(draft.id)}
                  className="px-3 py-1.5 bg-red-400/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-400/30 transition-all duration-300 flex items-center gap-1"
                  whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Trash2 size={12} /> Discard
                </motion.button>
              </div>
            </div>
          )) : (
            <div className="text-center py-8">
              <CheckCircle size={32} className="text-green-400 mx-auto mb-3" />
              <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-2">All CVs Complete!</h3>
              <p className="text-gray-600 dark:text-white/60 text-xs">Great job! All your CVs are ready for applications.</p>
            </div>
          )}
        </div>
      )}
  </div>
);
};

// 3. The "Intelligence Dashboard" - Enhanced Market Intelligence + AI Insights
const IntelligenceDashboard: React.FC<{ 
  predictions: any;
  marketIntelligence: any;
  jobs: any[];
  onUpdateGoal?: (goal: number) => void;
}> = ({ predictions, marketIntelligence, jobs, onUpdateGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(predictions?.monthlyGoal || 20);

  const handleUpdateGoal = async () => {
    if (onUpdateGoal) {
      await onUpdateGoal(newGoal);
      setIsEditingGoal(false);
    }
  };

  // Generate AI-powered insights based on user's job data
  const generateInsights = () => {
    const insights = [];
    const now = new Date();
    const thisMonth = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    });

    // Application pace analysis
    const weeklyAverage = thisMonth.length / 4;
    if (weeklyAverage < 2) {
      insights.push({
        type: 'action',
        icon: '🚀',
        title: 'Increase Application Rate',
        message: `You're applying to ${weeklyAverage.toFixed(1)} jobs/week. Aim for 3-5 for better results.`,
        priority: 'high'
      });
    } else if (weeklyAverage > 5) {
      insights.push({
        type: 'success',
        icon: '🎯',
        title: 'Great Application Pace',
        message: `${weeklyAverage.toFixed(1)} applications/week is excellent. Focus on quality follow-ups.`,
        priority: 'medium'
      });
    }

    // Response rate analysis
    const responsiveJobs = jobs.filter(job => job.status !== 'created' && job.status !== 'applied');
    const responseRate = jobs.length > 0 ? (responsiveJobs.length / jobs.length) * 100 : 0;
    
    if (responseRate < 20) {
      insights.push({
        type: 'warning',
        icon: '📝',
        title: 'Improve Application Quality',
        message: `${responseRate.toFixed(0)}% response rate suggests CV optimization needed.`,
        priority: 'high'
      });
    }

    // Industry diversification
    const companies = Array.from(new Set(jobs.map(job => job.company)));
    const industries = Array.from(new Set(jobs.map(job => job.industry).filter(Boolean)));
    
    if (companies.length > 10 && industries.length < 3) {
      insights.push({
        type: 'suggestion',
        icon: '🌟',
        title: 'Diversify Industries',
        message: `Consider exploring ${3 - industries.length} more industries to increase opportunities.`,
        priority: 'medium'
      });
    }

    // Salary optimization
    const jobsWithSalary = jobs.filter(job => job.salary?.min || job.salary?.max);
    if (jobsWithSalary.length > 5) {
      const avgSalary = jobsWithSalary.reduce((sum, job) => {
        const salary = job.salary?.min || job.salary?.max || 0;
        return sum + salary;
      }, 0) / jobsWithSalary.length;
      
      insights.push({
        type: 'info',
        icon: '💰',
        title: 'Salary Insights',
        message: `Average target salary: $${(avgSalary / 1000).toFixed(0)}k. Market shows 8% growth.`,
        priority: 'low'
      });
    }

    return insights.slice(0, 4); // Show top 4 insights
  };

  const insights = generateInsights();

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Intelligence Dashboard</h2>
      
      <div className="space-y-6">
        {/* AI-Powered Insights */}
        <div>
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-yellow-400" />
            AI Insights
          </h3>
          {insights.length > 0 ? (
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  insight.priority === 'high' ? 'bg-red-400/10 border-red-400' :
                  insight.priority === 'medium' ? 'bg-yellow-400/10 border-yellow-400' :
                  'bg-blue-400/10 border-blue-400'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{insight.icon}</span>
                    <div className="flex-1">
                      <h4 className="text-gray-900 dark:text-white font-medium text-xs mb-1">{insight.title}</h4>
                      <p className="text-gray-600 dark:text-white/70 text-xs">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 glass-card-premium rounded-lg text-center">
              <p className="text-gray-600 dark:text-white/60 text-xs">Add more job applications to receive personalized insights</p>
            </div>
          )}
        </div>

        {/* Market Intelligence & Predictions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Career Predictions */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
              <Target size={14} className="text-purple-400" />
              Goal Progress
            </h3>
            <div className="space-y-3">
              <div className="p-3 glass-card-premium rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 dark:text-white text-sm">Monthly Goal</span>
                    {!isEditingGoal && (
                      <button onClick={() => setIsEditingGoal(true)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
                    )}
                  </div>
                  <span className="text-gray-600 dark:text-white/60 text-xs">{predictions?.monthlyGoalProgress || 0}%</span>
                </div>
                {isEditingGoal ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="100" value={newGoal} onChange={(e) => setNewGoal(parseInt(e.target.value) || 20)}
                        className="flex-1 px-2 py-1 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded text-gray-900 dark:text-white text-xs" placeholder="Set monthly goal" />
                      <button onClick={handleUpdateGoal} className="px-2 py-1 bg-blue-400 text-black text-xs rounded hover:bg-blue-300">Save</button>
                      <button onClick={() => { setIsEditingGoal(false); setNewGoal(predictions?.monthlyGoal || 20); }}
                        className="px-2 py-1 bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white text-xs rounded hover:bg-gray-300 dark:hover:bg-white/20">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                      <div className="bg-gradient-to-r from-lime-400 to-lime-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, predictions?.monthlyGoalProgress || 0)}%` }}></div>
                    </div>
                    <div className="flex justify-between text-gray-600 dark:text-white/60 text-xs mt-1">
                      <span>{predictions?.jobsThisMonth || 0} / {predictions?.monthlyGoal || 20} jobs</span>
                      <span>{Math.max(0, (predictions?.monthlyGoal || 20) - (predictions?.jobsThisMonth || 0))} remaining</span>
                    </div>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-purple-400">{predictions?.nextWeekInterviews || 0}</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">Expected Interviews</div>
                </div>
                <div className="text-center p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-green-400">{predictions?.successProbability || 0}%</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">Success Rate</div>
                </div>
              </div>
            </div>
          </div>

          {/* Market Intelligence */}
          <div>
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-400" />
              Market Trends
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-green-400">{marketIntelligence?.salaryTrend || '+8%'}</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">Salary Growth</div>
                </div>
                <div className="text-center p-2 bg-gray-100 dark:bg-white/5 rounded-lg">
                  <div className="text-lg font-bold text-blue-400">{marketIntelligence?.remoteOpportunities || '+45%'}</div>
                  <div className="text-gray-600 dark:text-white/60 text-xs">Remote Jobs</div>
                </div>
              </div>
                    
              <div>
                <p className="text-gray-700 dark:text-white/80 text-xs font-medium mb-2">High-Demand Skills:</p>
                <div className="flex flex-wrap gap-1">
                  {(marketIntelligence?.topSkills || ['React', 'TypeScript', 'Node.js', 'Python', 'AWS']).map((skill: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-400/20 text-blue-400 text-xs rounded-full">{skill}</span>
                  ))}
                </div>
              </div>
                    
              <div>
                <p className="text-gray-700 dark:text-white/80 text-xs font-medium mb-2">Active Hiring:</p>
                <div className="flex flex-wrap gap-1">
                  {(marketIntelligence?.hotCompanies || ['Google', 'Microsoft', 'Amazon', 'Meta']).map((company: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full">{company}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 4. The "Performance Insights" Section - Enhanced with Conversion Funnel and Actionable Insights
const PerformanceInsights: React.FC<{ 
  analyticsData: any;
  jobs: any[];
  cvs: any[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}> = ({ analyticsData, jobs, cvs, selectedPeriod, onPeriodChange }) => {
  const calculatePerformanceMetrics = () => {
    const applicationFunnel = {
      applied: jobs.filter(job => job.status === 'applied' || job.status !== 'created').length,
      screening: jobs.filter(job => job.status === 'screening').length,
      interview: jobs.filter(job => job.status === 'interview').length,
      offer: jobs.filter(job => job.status === 'offer' || job.status === 'accepted').length
    };

    const conversionRates = {
      applyToScreen: applicationFunnel.applied > 0 ? Math.round((applicationFunnel.screening / applicationFunnel.applied) * 100) : 0,
      screenToInterview: applicationFunnel.screening > 0 ? Math.round((applicationFunnel.interview / applicationFunnel.screening) * 100) : 0,
      interviewToOffer: applicationFunnel.interview > 0 ? Math.round((applicationFunnel.offer / applicationFunnel.interview) * 100) : 0,
      overallSuccess: jobs.length > 0 ? Math.round((applicationFunnel.offer / jobs.length) * 100) : 0
    };

    // Time-based performance
    const now = new Date();
    const periodFilter = (date: Date) => {
      if (selectedPeriod === 'day') return date.toDateString() === now.toDateString();
      if (selectedPeriod === 'week') return (now.getTime() - date.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      if (selectedPeriod === 'month') return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      return true;
    };

    const periodJobs = jobs.filter(job => periodFilter(new Date(job.createdAt)));
    const periodApplications = periodJobs.length;
    const periodResponses = periodJobs.filter(job => job.status !== 'created' && job.status !== 'applied').length;

    // Performance trends
    const responseTime = jobs.filter(job => job.lastStatusUpdate).reduce((avg, job) => {
      const applied = new Date(job.applicationDate || job.createdAt);
      const response = new Date(job.lastStatusUpdate);
      return avg + Math.abs(response.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
    }, 0) / Math.max(1, jobs.filter(job => job.lastStatusUpdate).length);

    return {
      applicationFunnel,
      conversionRates,
      periodApplications,
      periodResponses,
      responseTime: Math.round(responseTime),
      productivity: {
        applicationsPerWeek: periodApplications,
        qualityScore: conversionRates.overallSuccess,
        improvement: Math.max(0, conversionRates.overallSuccess - 15) // Benchmark against 15% industry average
      }
    };
  };

  const metrics = calculatePerformanceMetrics();

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Performance Insights</h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-600 dark:text-white/60 text-sm">Period:</span>
          {['Day', 'Week', 'Month'].map((period) => (
            <motion.button key={period} onClick={() => onPeriodChange(period.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedPeriod === period.toLowerCase() ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'glass-card-premium text-gray-600 dark:text-white/60'
              }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {period}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Application Conversion Funnel */}
      <div className="mb-6">
        <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" />
          Application Conversion Funnel
        </h3>
        <div className="glass-card-premium rounded-lg p-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Applied', count: metrics.applicationFunnel.applied, color: 'bg-blue-400', width: '100%' },
              { label: 'Screening', count: metrics.applicationFunnel.screening, color: 'bg-orange-400', width: `${metrics.conversionRates.applyToScreen}%` },
              { label: 'Interview', count: metrics.applicationFunnel.interview, color: 'bg-purple-400', width: `${metrics.conversionRates.screenToInterview}%` },
              { label: 'Offer', count: metrics.applicationFunnel.offer, color: 'bg-green-400', width: `${metrics.conversionRates.interviewToOffer}%` }
            ].map((stage, index) => (
              <div key={index} className="text-center">
                <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">{stage.count}</div>
                <div className="text-xs text-gray-600 dark:text-white/60 mb-2">{stage.label}</div>
                <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                  <div 
                    className={`${stage.color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: stage.width }}
                  ></div>
                </div>
                {index > 0 && (
                  <div className="text-xs text-gray-500 dark:text-white/50 mt-1">
                    {index === 1 ? metrics.conversionRates.applyToScreen : 
                     index === 2 ? metrics.conversionRates.screenToInterview : 
                     metrics.conversionRates.interviewToOffer}% conversion
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass-card-premium rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400 mb-1">{metrics.periodApplications}</div>
          <div className="text-gray-600 dark:text-white/60 text-xs">Applications This {selectedPeriod}</div>
        </div>
        
        <div className="glass-card-premium rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-400 mb-1">{metrics.conversionRates.overallSuccess}%</div>
          <div className="text-gray-600 dark:text-white/60 text-xs">Overall Success Rate</div>
          {metrics.productivity.improvement > 0 && (
            <div className="text-xs text-green-400 font-medium">+{metrics.productivity.improvement}% vs Industry</div>
          )}
        </div>
        
        <div className="glass-card-premium rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400 mb-1">{metrics.periodResponses}</div>
          <div className="text-gray-600 dark:text-white/60 text-xs">Responses Received</div>
          <div className="text-xs text-gray-500 dark:text-white/50">
            {metrics.periodApplications > 0 ? Math.round((metrics.periodResponses / metrics.periodApplications) * 100) : 0}% response rate
          </div>
        </div>
        
        <div className="glass-card-premium rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-400 mb-1">{metrics.responseTime}</div>
          <div className="text-gray-600 dark:text-white/60 text-xs">Avg Response Time (days)</div>
          <div className={`text-xs font-medium ${metrics.responseTime <= 7 ? 'text-green-400' : metrics.responseTime <= 14 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.responseTime <= 7 ? 'Excellent' : metrics.responseTime <= 14 ? 'Good' : 'Slow'}
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 glass-card-premium rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Performance Analysis</h3>
          <div className="space-y-2">
            {metrics.conversionRates.applyToScreen < 20 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                <span>Low screening rate - consider improving CV targeting</span>
              </div>
            )}
            {metrics.conversionRates.screenToInterview < 30 && metrics.applicationFunnel.screening > 0 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                <span>Interview conversion needs improvement - optimize phone screening approach</span>
              </div>
            )}
            {metrics.responseTime > 14 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                <span>Follow up more promptly - faster responses improve success rates</span>
              </div>
            )}
            {metrics.productivity.improvement > 0 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                <span>Above industry average - maintain current application quality</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="p-4 glass-card-premium rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Next Actions</h3>
          <div className="space-y-2">
            {metrics.periodApplications < 3 && selectedPeriod === 'week' && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Increase application volume - aim for 5-7 applications per week</span>
              </div>
            )}
            {metrics.conversionRates.overallSuccess < 15 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
                <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
                <span>Focus on quality over quantity - tailor applications more specifically</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
              <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
              <span>Track follow-ups systematically for better response rates</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-xs">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>Continue building your professional network</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. The "Recent Jobs" Widget - Enhanced with Application Timeline and Status Distribution
const RecentJobsWidget: React.FC<{ 
  jobs: any[];
  onViewJob: (jobId: string) => void;
}> = ({ jobs, onViewJob }) => {
  const [activeView, setActiveView] = useState<'timeline' | 'status'>('timeline');
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'text-blue-400';
      case 'screening': return 'text-orange-400';
      case 'interview': return 'text-purple-400';
      case 'offer': return 'text-green-400';
      case 'rejected': return 'text-red-400';
      case 'accepted': return 'text-emerald-400';
      case 'withdrawn': return 'text-gray-400';
      case 'created': return 'text-yellow-400';
      default: return 'text-white/60';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return '📝';
      case 'screening': return '🔍';
      case 'interview': return '🎯';
      case 'offer': return '🎉';
      case 'rejected': return '❌';
      case 'accepted': return '✅';
      case 'withdrawn': return '↩️';
      case 'created': return '📋';
      default: return '📄';
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString();
  };

  const lastJobs = jobs
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusDistribution = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="glass-widget-premium glass-shimmer rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Applications</h2>
        <motion.button 
          onClick={() => window.location.href = '/dashboard/pipeline'}
          className="px-3 py-1.5 bg-blue-400/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-400/30 transition-all duration-300 flex items-center gap-2"
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Briefcase size={14} /> View All
        </motion.button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <motion.button onClick={() => setActiveView('timeline')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeView === 'timeline' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'glass-card-premium text-gray-600 dark:text-white/60'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          Timeline
        </motion.button>
        <motion.button onClick={() => setActiveView('status')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeView === 'status' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'glass-card-premium text-gray-600 dark:text-white/60'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          Status Overview
        </motion.button>
      </div>
      
      {activeView === 'timeline' ? (
        lastJobs.length > 0 ? (
          <div className="space-y-3">
            {lastJobs.map((job) => (
            <motion.div 
              key={job.id || job._id}
              onClick={() => onViewJob(job.id || job._id)}
              className="p-4 glass-card-premium rounded-lg cursor-pointer"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-gray-200 dark:bg-white/10">
                    <Briefcase size={16} className="text-gray-600 dark:text-white/80" />
                  </div>
                                     <div className="flex-1 min-w-0">
                     <h4 className="text-gray-900 dark:text-white font-medium text-sm mb-1 truncate">{job.jobTitle}</h4>
                     <p className="text-gray-600 dark:text-white/60 text-xs mb-1">{job.company}</p>
                     {job.location && (
                       <p className="text-gray-500 dark:text-white/40 text-xs">{job.location}</p>
                     )}
                   </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${getStatusColor(job.status)}`}>
                    {getStatusIcon(job.status)} {job.status}
                  </span>
                  <span className="text-gray-500 dark:text-white/40 text-xs">{formatDate(job.createdAt)}</span>
                </div>
              </div>
              
                             <div className="flex items-center justify-between text-gray-600 dark:text-white/60 text-xs">
                 {job.salary && (job.salary.min || job.salary.max) && (
                   <div className="flex items-center gap-2">
                     <span>💰</span>
                     <span>
                       {job.salary.min && job.salary.max 
                         ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}-${job.salary.max.toLocaleString()}`
                         : job.salary.min 
                           ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}+`
                           : `${job.salary.currency || '$'}${job.salary.max.toLocaleString()}`
                       } {job.salary.period || 'yearly'}
                     </span>
                   </div>
                 )}
                 {job.applicationDate && (
                   <div className="flex items-center gap-2">
                     <span>📅</span>
                     <span>Applied: {formatDate(job.applicationDate)}</span>
                   </div>
                 )}
               </div>
            </motion.div>
          ))}
        </div>
        ) : (
          <div className="text-center py-8">
            <Briefcase size={32} className="text-gray-400 dark:text-white/40 mx-auto mb-3" />
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-2">No Jobs Yet</h3>
            <p className="text-gray-600 dark:text-white/60 text-xs mb-4">Start tracking your job applications to see your recent applications here.</p>
            <motion.button 
              onClick={() => window.location.href = '/dashboard/pipeline'}
              className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-400/30 transition-all duration-300"
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              Add Your First Job
            </motion.button>
          </div>
        )
      ) : (
        // Status Overview
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card-premium rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{jobs.length}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Total Applications</div>
            </div>
            <div className="glass-card-premium rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">
                {jobs.length > 0 ? Math.round(((statusDistribution.interview || 0) + (statusDistribution.offer || 0) + (statusDistribution.accepted || 0)) / jobs.length * 100) : 0}%
              </div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Success Rate</div>
            </div>
          </div>

          <div className="glass-card-premium rounded-lg p-4">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3">Application Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(statusDistribution).map(([status, count]) => {
                const countNum = count as number;
                const percentage = jobs.length > 0 ? Math.round((countNum / jobs.length) * 100) : 0;
                const statusColors = {
                  'created': 'bg-yellow-400',
                  'applied': 'bg-blue-400',
                  'screening': 'bg-orange-400',
                  'interview': 'bg-purple-400',
                  'offer': 'bg-green-400',
                  'accepted': 'bg-emerald-400',
                  'rejected': 'bg-red-400',
                  'withdrawn': 'bg-gray-400'
                };
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-400'}`}></div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-white/70 capitalize font-medium">{status}</span>
                          <span className="text-sm text-gray-600 dark:text-white/60">{countNum} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 mt-1">
                          <div 
                            className={`${statusColors[status as keyof typeof statusColors] || 'bg-gray-400'} h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Analytics Component
const Analytics: React.FC = () => {
  const { data: session } = useSession();
  const { createCV } = useCreateCV();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [drafts, setDrafts] = useState<any[]>([]);

  const handleUpdateMonthlyGoal = async (newGoal: number) => {
    try {
      const response = await authenticatedFetch('/api/user/update-monthly-goal', {
        method: 'PUT',
        body: JSON.stringify({ monthlyGoal: newGoal }),
      });
      if (response.ok) {
        const analyticsResponse = await authenticatedFetch(`/api/analytics?userId=${user?.id || user?._id || session?.user?.id}&period=${selectedPeriod}`);
        if (analyticsResponse.ok) {
          const newAnalyticsData = await analyticsResponse.json();
          setAnalyticsData(newAnalyticsData.data);
        }
      }
    } catch (error) {
      console.error('Error updating monthly goal:', error);
    }
  };

  const handleSetMasterCV = async (cvId: string) => {
    try {
      const response = await authenticatedFetch('/api/cvs/set-master', {
        method: 'PUT',
        body: JSON.stringify({ cvId }),
      });
      if (response.ok) {
        // Reload CVs to reflect the change
        const userId = user?.id || user?._id || session?.user?.id;
        if (userId) {
          const cvsResponse = await authenticatedFetch(`/api/cvs?userId=${userId}`);
          const cvsResult = await cvsResponse.json();
          if (cvsResult.success) {
            const cvData = Array.isArray(cvsResult.data?.cvs) ? cvsResult.data.cvs : [];
            setCvs(cvData);
          }
        }
      }
    } catch (error) {
      console.error('Error setting master CV:', error);
    }
  };

  const calculateCompletionPercentage = (cv: any): number => {
    if (cv.status === 'published') return 100;
    if (cv.status === 'archived') return 0;
    
    let totalScore = 0;
    let maxScore = 0;
    
    const sectionWeights = { personalInfo: 25, experience: 30, education: 20, skills: 15, projects: 10 };
    
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;
    
    if (cv.cvData?.work) {
      const experienceScore = calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;
    
    if (cv.cvData?.education) {
      const educationScore = calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;
    
    if (cv.cvData?.skills) {
      const skillsScore = calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;
    
    if (cv.cvData?.projects) {
      const projectsScore = calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;
    
    const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    return Math.max(0, Math.min(100, completionPercentage));
  };
  
  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    let maxScore = 5;
    if (basics.name && basics.name.trim()) score += 1;
    if (basics.email && basics.email.trim()) score += 1;
    if (basics.phone && basics.phone.trim()) score += 1;
    if (basics.location && (basics.location.city || basics.location.address)) score += 1;
    if (basics.summary && basics.summary.trim()) score += 1;
    return (score / maxScore) * 100;
  };
  
  const calculateExperienceScore = (work: any[]): number => {
    if (!Array.isArray(work) || work.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 3;
    work.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.name && entry.name.trim()) entryScore += 1;
      if (entry.position && entry.position.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      if (entry.summary && entry.summary.trim()) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(work.length, maxEntries));
  };
  
  const calculateEducationScore = (education: any[]): number => {
    if (!Array.isArray(education) || education.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 2;
    education.slice(0, maxEntries).forEach(entry => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.institution && entry.institution.trim()) entryScore += 1;
      if (entry.area && entry.area.trim()) entryScore += 1;
      if (entry.studyType && entry.studyType.trim()) entryScore += 1;
      if (entry.startDate && entry.startDate.trim()) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(education.length, maxEntries));
  };
  
  const calculateSkillsScore = (skills: any[]): number => {
    if (!Array.isArray(skills) || skills.length === 0) return 0;
    let totalScore = 0;
    const maxSkills = 5;
    skills.slice(0, maxSkills).forEach(skill => {
      let skillScore = 0;
      let maxSkillScore = 2;
      if (skill.name && skill.name.trim()) skillScore += 1;
      if (skill.keywords && Array.isArray(skill.keywords) && skill.keywords.length > 0) skillScore += 1;
      totalScore += (skillScore / maxSkillScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(skills.length, maxSkills));
  };
  
  const calculateProjectsScore = (projects: any[]): number => {
    if (!Array.isArray(projects) || projects.length === 0) return 0;
    let totalScore = 0;
    const maxProjects = 2;
    projects.slice(0, maxProjects).forEach(project => {
      let projectScore = 0;
      let maxProjectScore = 3;
      if (project.name && project.name.trim()) projectScore += 1;
      if (project.description && project.description.trim()) projectScore += 1;
      if (project.url && project.url.trim()) projectScore += 1;
      totalScore += (projectScore / maxProjectScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
  };

  useEffect(() => {
    // Check NextAuth session first
    if (session?.user) {
      console.log('🔍 Analytics - NextAuth session found:', session.user);
      setUser(session.user);
      loadData(session.user.id);
    } else {
      // Fallback to Firebase user data
      const userData = localStorage.getItem('user');
      if (userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('🔍 Analytics - Firebase user data:', parsedUser);
          if (parsedUser.firebaseUid) {
            setUser(parsedUser);
            loadData(parsedUser.id || parsedUser._id);
          }
        } catch (error) {
          console.error('Error parsing Firebase user data:', error);
        }
      } else {
        console.log('🔍 Analytics - No user data found in localStorage');
      }
    }
  }, [session]);

  // Listen for user profile updates
  useEffect(() => {
    const handleUserProfileUpdate = (event: CustomEvent) => {
      const updatedUser = event.detail.user;
      setUser((prev: any) => ({
        ...prev,
        name: updatedUser.firstName + ' ' + updatedUser.lastName,
        email: updatedUser.email,
        username: updatedUser.username,
        profilePhoto: updatedUser.avatar || updatedUser.profilePhoto,
        role: session?.user?.role
      }));
    };

    window.addEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleUserProfileUpdate as EventListener);
    };
  }, []);


  useEffect(() => {
    if (user?.id || user?._id) {
      loadAnalyticsDataOnly(user.id || user._id);
    }
  }, [selectedPeriod, user]);

  const loadAnalyticsDataOnly = async (userId: string) => {
    try {
      const analyticsResponse = await authenticatedFetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const loadData = async (userId: string) => {
    try {
      console.log('🔍 Analytics - loadData called with userId:', userId);
      setLoading(true);
      
      const analyticsResponse = await authenticatedFetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
      }
      
      const jobsResponse = await authenticatedFetch(`/api/jobs?userId=${userId}&limit=5&sort=createdAt&order=asc`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        const jobData = Array.isArray(jobsResult.jobs) ? jobsResult.jobs : [];
        setJobs(jobData);
      }

      console.log('🔍 Analytics - Fetching CVs for userId:', userId);
      const cvsResponse = await authenticatedFetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      console.log('🔍 Analytics - CV API response:', cvsResult);
      if (cvsResult.success) {
        const cvData = Array.isArray(cvsResult.data?.cvs) ? cvsResult.data.cvs : [];
        console.log('🔍 Analytics - CV data received:', cvData);
        console.log('🔍 Analytics - Number of CVs:', cvData.length);
        setCvs(cvData);
        
        const incompleteCVs = cvData
          .filter((cv: any) => {
            const progress = calculateCompletionPercentage(cv);
            return progress < 99;
          })
          .sort((a: any, b: any) => {
            const progressA = calculateCompletionPercentage(a);
            const progressB = calculateCompletionPercentage(b);
            if (progressA !== progressB) {
              return progressA - progressB;
            }
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
          })
          .slice(0, 4)
          .map((cv: any) => ({
            id: cv.id || cv._id,
            type: 'cv' as const,
            title: cv.title || 'Untitled CV',
            progress: calculateCompletionPercentage(cv),
            lastEdited: new Date(cv.updatedAt || cv.createdAt),
            cvData: cv.cvData,
            isMaster: cv.isMaster || false
          }));
        
        setDrafts(incompleteCVs);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateCVHealthScore = () => {
    if (!analyticsData) return 0;
    return analyticsData.cvHealthScore || 0;
  };
  
  const cvHealthScore = calculateCVHealthScore();

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="mb-8">
          <div className="h-8 w-64 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>
          <div className="h-4 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          </div>
        </div>

        {/* Main Grid Layout Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Status + Application Hub + Last 5 Jobs */}
          <div className="space-y-6">
            {/* My Status Section Skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="h-6 w-24 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CV Health Score Skeleton */}
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                  <div className="h-3 w-20 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mx-auto mb-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                  <div className="h-3 w-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mx-auto">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                </div>
                {/* Quick Actions Skeleton */}
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-10 w-full bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Application Hub Skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="h-6 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              </div>
              <div className="flex gap-2 mb-6">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="h-8 w-24 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="h-4 w-3/4 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                    <div className="h-3 w-1/2 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column 2: Intelligence Dashboard + Performance */}
          <div className="space-y-6">
            {/* Intelligence Dashboard Skeleton */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
              <div className="h-6 w-40 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, index) => (
                  <div key={index} className="space-y-4">
                    <div className="h-4 w-32 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Array.from({ length: 2 }).map((_, cardIndex) => (
                        <div key={cardIndex} className="p-3 bg-white/5 rounded-lg">
                          <div className="h-6 w-12 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                          <div className="h-3 w-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Insights Skeleton */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 w-40 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
                <div className="flex gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="h-8 w-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* KPI Cards Skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-4">
                    <div className="h-6 w-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-3">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                    <div className="h-4 w-12 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Last 5 Jobs Widget Skeleton */}
            <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 w-28 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
                <div className="h-8 w-20 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded-lg">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                        </div>
                        <div className="flex-1">
                          <div className="h-4 w-3/4 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                          <div className="h-3 w-1/2 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded mb-1">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                          <div className="h-3 w-1/3 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-16 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                        </div>
                        <div className="h-3 w-12 bg-gradient-to-r from-gray-800 to-gray-700 relative overflow-hidden rounded">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={`Hello, ${user?.name || user?.username || 'User'}`}
        description="Welcome back! Here's your career progress overview."
        user={user || { name: 'User', email: 'user@example.com', role: session?.user?.role }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* CV Journey Widget */}
      <AnalyticsJourneyWidget
        onResumeJourney={(journey) => {
          // Navigate to CV Journey page and resume the specific journey
          console.log('Resume journey:', journey);
          window.location.href = `/dashboard/cv-journey?resume=${journey.id}`;
        }}
        onDeleteJourney={(journeyId) => {
          // TODO: Implement delete journey functionality
          console.log('Delete journey:', journeyId);
        }}
        onViewJourney={(journey) => {
          // TODO: Implement view journey functionality
          console.log('View journey:', journey);
          window.location.href = `/dashboard/cv-journey`;
        }}
      />

      {/* CV Management Section */}
      <CVManagementSection
        cvHealthScore={cvHealthScore}
        cvs={cvs}
        onImproveScore={() => window.location.href = '/studio'}
        onCreateCV={async () => {
          try {
            const userId = user?.id || user?._id || session?.user?.id;
            if (userId) {
              await createCV({ userId });
            }
          } catch (error) {
            console.error('Error creating CV:', error);
          }
        }}
        onAddJob={() => window.location.href = '/dashboard/pipeline'}
        onWriteCoverLetter={() => window.location.href = '/studio?type=cover_letter'}
        onSetMasterCV={handleSetMasterCV}
      />

      {/* Main Grid Layout - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Column 1: Application Hub + Last 5 Jobs */}
        <div className="space-y-6">
          <ApplicationHub
            drafts={drafts}
            jobs={jobs}
            onResumeDraft={(draftId) => window.location.href = `/studio?draft=${draftId}`}
            onPreviewDraft={(draftId) => window.location.href = `/preview?draft=${draftId}`}
            onDiscardDraft={(draftId) => console.log('Discard draft', draftId)}
          />

          <RecentJobsWidget
            jobs={jobs}
            onViewJob={(jobId) => window.location.href = `/dashboard/pipeline?job=${jobId}`}
          />
        </div>
                        
        {/* Column 2: Intelligence Dashboard + Performance Insights */}
        <div className="space-y-6">
          <IntelligenceDashboard
            predictions={analyticsData?.predictions || {}} 
            marketIntelligence={analyticsData?.marketIntelligence || {}}
            jobs={jobs}
            onUpdateGoal={handleUpdateMonthlyGoal}
          />

          <PerformanceInsights
            analyticsData={analyticsData}
            jobs={jobs}
            cvs={cvs}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>
      </div>

    </div>
  );
};

export default Analytics;
