'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, Briefcase, PenTool, TrendingUp, Target, Sparkles, Zap, 
  Lightbulb, Plus, Edit, Eye, Trash2, Calendar, CheckCircle, Heart,
  MessageSquare, User, BarChart3
} from 'lucide-react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import AnalyticsJourneyWidget from './AnalyticsJourneyWidget';
import ProgressTrackingWidget from './ProgressTrackingWidget';
import ApplicationStatsWidget from './ApplicationStatsWidget';
import PageHeader from './PageHeader';
import MasterCVBadge from './MasterCVBadge';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { useParallelDataFetching } from '@/lib/hooks/useOptimizedDataFetching';
import { AnalyticsSkeleton } from '@/components/ui/OptimizedSkeletons';
import { usePerformanceMonitor } from '@/lib/utils/performanceMonitor';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import ComprehensiveATSAnalyzer from '@/components/studio/ComprehensiveATSAnalyzer';

// Helper functions for CV scoring
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

// Helper function to calculate CV completion percentage
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

// 1. Combined CV Management Section - CV Health Score + Master CV Management + Quick Actions + Monthly Goal
const CVManagementSection: React.FC<{ 
  cvHealthScore: number; 
  cvs: any[];
  drafts: any[];
  onImproveScore: () => void;
  onCreateCV: () => void;
  onAddJob: () => void;
  onWriteCoverLetter: () => void;
  onCreateCoverLetter: () => void;
  onCreateJob: () => void;
  onSetMasterCV: (cvId: string) => void;
  predictions?: any;
  onUpdateGoal?: (goal: number) => void;
  userId?: string;
  jobs?: any[];
}> = ({ cvHealthScore, cvs, drafts, onImproveScore, onCreateCV, onAddJob, onWriteCoverLetter, onCreateCoverLetter, onCreateJob, onSetMasterCV, predictions, onUpdateGoal, userId, jobs = [] }) => {
  const [showATSWidget, setShowATSWidget] = useState(false);
  
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const status = getStatus(cvHealthScore);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - cvHealthScore / 100);

  // Find master CV - handle both old and new metadata formats
  const masterCV = cvs.find(cv => {
    const isMasterAtRoot = cv.isMaster === true;
    const isMasterInMetadata = cv.metadata?.isMaster === true;
    const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
    return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
  });
  const otherCVs = cvs.filter(cv => {
    const isMasterAtRoot = cv.isMaster === true;
    const isMasterInMetadata = cv.metadata?.isMaster === true;
    const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
    return !(isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString);
  });

  

  return (
    <div className="glass-widget-premium rounded-xl p-4 h-full flex flex-col w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">CV Management</h2>
        <div className="flex items-center gap-2">
          <MasterCVBadge />
        </div>
      </div>
      
      <div className="space-y-6 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
          {/* Left Column: CV Health Score - Takes both rows */}
          <div className="row-span-2">
            <div className="text-center flex flex-col justify-center h-full">
              <div className="relative w-32 h-32 lg:w-40 lg:h-40 mx-auto mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
              <p className="text-gray-600 dark:text-white/60 text-xs mb-1">{masterCV?.title || 'Master CV Health'}</p>
              <p className={`text-xs font-medium ${status.color}`}>{status.label}</p>
              
              {/* ATS Analysis Toggle */}
              <motion.button
                onClick={() => setShowATSWidget(!showATSWidget)}
                className="mt-3 px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs rounded-lg transition-colors flex items-center gap-1 justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Target className="h-3 w-3" />
                {showATSWidget ? 'Hide ATS Analysis' : 'Show ATS Analysis'}
              </motion.button>
            </div>
          </div>
          
          {/* ATS Analysis Widget */}
          {showATSWidget && masterCV && (
            <div className="row-span-2">
              <div className="h-full max-h-96 overflow-y-auto">
                <ComprehensiveATSAnalyzer
                  selectedJobId={jobs.length > 0 ? jobs[0].id : undefined}
                  onJobSelection={() => {}}
                  userId={userId}
                  cvData={masterCV.cvData}
                  jobData={jobs.length > 0 ? jobs[0] : undefined}
                  cvId={masterCV.id}
                  onUpdateField={(path, value) => {
                    console.log('CV field update:', path, value);
                  }}
                  onScoreUpdate={(score) => {
                    console.log('ATS Score updated:', score);
                  }}
                />
              </div>
            </div>
          )}

          {/* Right Column */}
          <div className="space-y-6">
            {/* Top Row: Professional Title */}
            {cvs.length > 0 && (
              <div className="glass-card-premium rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-400/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-400 rounded-full flex items-center justify-center overflow-hidden">
                    <User size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-gray-900 dark:text-white font-bold text-lg">Mid Level Professional</h4>
                    <p className="text-gray-600 dark:text-white/60 text-sm">3 years experience • 3 skills</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Row: Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-gray-900 dark:text-white font-medium text-sm flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <motion.button 
                  onClick={onCreateCV}
                  className="w-full p-3 bg-lime-400/20 text-lime-400 rounded-lg text-sm font-medium hover:bg-lime-400/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Plus size={16} /> Create New CV
                </motion.button>
                <motion.button 
                  onClick={onCreateCoverLetter}
                  className="w-full p-3 bg-purple-400/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-400/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <MessageSquare size={16} /> Create Cover Letter
                </motion.button>
                <motion.button 
                  onClick={onCreateJob}
                  className="w-full p-3 bg-blue-400/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-400/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Briefcase size={16} /> Add Job Application
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

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
    <div className="glass-widget-premium rounded-xl p-6">
      
        <div className="space-y-4">
          {/* Key Metrics */}

          {/* 3-Week Calendar View */}
          <div className="glass-card-premium rounded-lg p-4">
            <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-4">Application Calendar (3 Weeks)</h3>
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-600 dark:text-white/60 py-1">
                  {day}
                </div>
              ))}
              
              {/* Calendar days */}
              {(() => {
                const today = new Date();
                const startDate = new Date(today);
                // Go back to start of previous week (Monday)
                // Adjust for Monday start: getDay() returns 0 for Sunday, so we need to adjust
                const dayOfWeek = today.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday = 1, Sunday = 0
                startDate.setDate(today.getDate() + mondayOffset - 7);
                
                const calendarDays = [];
                for (let i = 0; i < 21; i++) { // 3 weeks * 7 days
                  const currentDate = new Date(startDate);
                  currentDate.setDate(startDate.getDate() + i);
                  
                  // Count applications for this date
                  const dayApplications = jobs.filter(job => {
                    const jobDate = new Date(job.createdAt);
                    return jobDate.toDateString() === currentDate.toDateString();
                  }).length;
                  
                  // Count deadlines for this date
                  const dayDeadlines = jobs.filter(job => {
                    if (!job.deadline) return false;
                    const deadlineDate = new Date(job.deadline);
                    return deadlineDate.toDateString() === currentDate.toDateString();
                  }).length;
                  
                  const isToday = currentDate.toDateString() === today.toDateString();
                  const isPast = currentDate < today;
                  const isFuture = currentDate > today;
                  
                  // Determine if this is a deadline day
                  const isDeadlineDay = dayDeadlines > 0;
                  
                  calendarDays.push(
                    <div 
                      key={i} 
                      className={`
                        aspect-square flex flex-col items-center justify-center text-xs rounded transition-all duration-200
                        ${isToday ? 'bg-blue-400/20 dark:bg-blue-400/20 text-blue-400 font-medium' : 
                          isPast ? 'text-gray-600 dark:text-white/60' : 
                          'text-gray-400 dark:text-white/40'}
                        ${dayApplications > 0 ? 'bg-green-400/20 dark:bg-green-400/20 text-green-400' : ''}
                        ${isDeadlineDay ? 'bg-red-400/20 dark:bg-red-400/20 text-red-400' : ''}
                        hover:bg-gray-100 dark:hover:bg-white/5 cursor-pointer
                      `}
                    >
                      <div className="font-medium text-xs">{currentDate.getDate()}</div>
                      <div className="flex gap-0.5 mt-0.5">
                        {dayApplications > 0 && (
                          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        )}
                        {isDeadlineDay && (
                          <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  );
                }
                return calendarDays;
              })()}
          </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-600 dark:text-white/60">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Applications</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span>Deadlines</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span>Today</span>
              </div>
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
  </div>
);
};

// 3. The "Intelligence Dashboard" - Enhanced Market Intelligence + AI Insights
const IntelligenceDashboard: React.FC<{ 
  predictions: any;
  marketIntelligence: any;
  jobs: any[];
  cvs: any[];
  userAvatar?: string;
  onUpdateGoal?: (goal: number) => void;
}> = ({ predictions, marketIntelligence, jobs, cvs, userAvatar, onUpdateGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(predictions?.monthlyGoal || 20);

  // Extract user profile data from Master CV
  const extractUserProfile = () => {
    const masterCV = cvs.find(cv => cv.isMaster === true || cv.metadata?.isMaster === true);
    if (!masterCV?.cvData) return null;

    const profile = {
      experience: 0,
      skills: [],
      industries: [],
      jobTitles: [],
      location: '',
      experienceLevel: 'entry'
    };

    // Calculate years of experience
    if (masterCV.cvData.work && Array.isArray(masterCV.cvData.work)) {
      const workExperience = masterCV.cvData.work;
      profile.jobTitles = workExperience.map(job => job.position || job.title).filter(Boolean);
      
      // Calculate total experience
      const startDates = workExperience
        .map(job => new Date(job.startDate))
        .filter(date => !isNaN(date.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (startDates.length > 0) {
        const earliestStart = startDates[0];
        const now = new Date();
        profile.experience = Math.floor((now.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24 * 365));
      }

      // Determine experience level
      if (profile.experience >= 8) profile.experienceLevel = 'senior';
      else if (profile.experience >= 3) profile.experienceLevel = 'mid';
      else profile.experienceLevel = 'entry';
    }

    // Extract skills
    if (masterCV.cvData.skills && Array.isArray(masterCV.cvData.skills)) {
      profile.skills = masterCV.cvData.skills.map(skill => skill.name || skill).filter(Boolean);
    }

    // Extract location
    if (masterCV.cvData.basics?.location) {
      profile.location = masterCV.cvData.basics.location.city || masterCV.cvData.basics.location.address || '';
    }

    // Extract industries from applied jobs
    const jobIndustries = jobs.map(job => job.industry).filter(Boolean);
    profile.industries = [...new Set(jobIndustries)];

    return profile;
  };

  const userProfile = extractUserProfile();

  // Calculate competitive analysis metrics
  const calculateCompetitiveAnalysis = () => {
    const now = new Date();
    const thisMonth = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
    });

    const responsiveJobs = jobs.filter(job => job.status !== 'created' && job.status !== 'applied');
    const interviewJobs = jobs.filter(job => job.status === 'interview' || job.status === 'offer' || job.status === 'accepted');
    
    const metrics = {
      applicationVolume: thisMonth.length,
      responseRate: jobs.length > 0 ? Math.round((responsiveJobs.length / jobs.length) * 100) : 0,
      interviewRate: jobs.length > 0 ? Math.round((interviewJobs.length / jobs.length) * 100) : 0,
      timeToOffer: 0
    };

    // Calculate time to offer
    const offerJobs = jobs.filter(job => job.status === 'offer' || job.status === 'accepted');
    if (offerJobs.length > 0) {
      const totalDays = offerJobs.reduce((sum, job) => {
        const applied = new Date(job.applicationDate || job.createdAt);
        const offered = new Date(job.lastStatusUpdate || job.updatedAt);
        return sum + Math.abs(offered.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      metrics.timeToOffer = Math.round(totalDays / offerJobs.length);
    }

    // Industry benchmarks based on experience level
    const benchmarks = {
      entry: { appVolume: 20, responseRate: 20, interviewRate: 10, timeToOffer: 45 },
      mid: { appVolume: 15, responseRate: 30, interviewRate: 15, timeToOffer: 35 },
      senior: { appVolume: 10, responseRate: 40, interviewRate: 20, timeToOffer: 30 }
    };

    const userBenchmark = benchmarks[userProfile?.experienceLevel || 'entry'] || benchmarks.entry;

    return {
      metrics,
      benchmark: userBenchmark,
      percentile: {
        appVolume: Math.min(100, Math.round((metrics.applicationVolume / userBenchmark.appVolume) * 100)),
        responseRate: Math.min(100, Math.round((metrics.responseRate / userBenchmark.responseRate) * 100)),
        interviewRate: Math.min(100, Math.round((metrics.interviewRate / userBenchmark.interviewRate) * 100)),
        timeToOffer: metrics.timeToOffer > 0 ? Math.max(0, Math.round(100 - ((metrics.timeToOffer / userBenchmark.timeToOffer) * 100))) : 0
      }
    };
  };

  // Calculate industry-specific market data
  const calculateMarketData = () => {
    if (!userProfile) return null;

    const industryJobs = jobs.filter(job => 
      userProfile.industries.includes(job.industry) || 
      userProfile.jobTitles.some(title => job.title?.toLowerCase().includes(title.toLowerCase()))
    );

    const salaryData = jobs.filter(job => job.salary?.min || job.salary?.max);
    const avgSalary = salaryData.length > 0 ? 
      salaryData.reduce((sum, job) => sum + (job.salary?.min || job.salary?.max || 0), 0) / salaryData.length : 0;

    const responseTimes = jobs.filter(job => job.lastStatusUpdate).map(job => {
      const applied = new Date(job.applicationDate || job.createdAt);
      const response = new Date(job.lastStatusUpdate);
      return Math.abs(response.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24);
    });

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0;

    return {
      industryJobs: industryJobs.length,
      avgSalary: Math.round(avgSalary / 1000),
      avgResponseTime: Math.round(avgResponseTime),
      marketDemandScore: Math.round((jobs.filter(job => job.status !== 'created' && job.status !== 'applied').length / Math.max(jobs.length, 1)) * 100),
      skillMatchScore: userProfile.skills.length > 0 ? 
        Math.round((userProfile.skills.filter(skill => 
          jobs.some(job => job.requirements?.toLowerCase().includes(skill.toLowerCase()))
        ).length / userProfile.skills.length) * 100) : 0
    };
  };

  const competitiveData = calculateCompetitiveAnalysis();
  const marketData = calculateMarketData();

  const handleUpdateGoal = async () => {
    if (onUpdateGoal) {
      await onUpdateGoal(newGoal);
      setIsEditingGoal(false);
    }
  };



  return (
    <div className="glass-widget-premium rounded-xl p-6 min-h-[400px]">
      <div className="space-y-4 h-full">

                    
                    

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
    <div className="glass-widget-premium rounded-xl p-6">
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

      {/* First Row: Application Conversion Funnel and Performance Metrics - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Application Conversion Funnel */}
        <div>
        <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-blue-400" />
          Application Conversion Funnel
        </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400 mb-1">{metrics.applicationFunnel.applied}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Applied</div>
                </div>
            
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{metrics.applicationFunnel.interview}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Interview</div>
                  </div>
            
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400 mb-1">{metrics.applicationFunnel.offer}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Offered</div>
              </div>
            
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-400 mb-1">{jobs.filter(job => job.status === 'rejected').length}</div>
              <div className="text-gray-600 dark:text-white/60 text-xs">Rejection</div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
        <div>
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
            <Target size={14} className="text-green-400" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 glass-card-premium rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-medium text-sm mb-3 flex items-center gap-2">
            <Lightbulb size={14} className="text-yellow-400" />
            Performance Analysis & AI Insights
          </h3>
          <div className="space-y-3">
            {/* AI-Powered Insights */}
            {(() => {
              // Generate AI-powered insights based on user's job data
              const insights = [];
              const now = new Date();
              const thisMonth = jobs.filter(job => {
                const jobDate = new Date(job.createdAt);
                return jobDate.getMonth() === now.getMonth() && jobDate.getFullYear() === now.getFullYear();
              });
              
              const responseRate = jobs.filter(job => job.status !== 'created' && job.status !== 'applied').length / Math.max(jobs.length, 1) * 100;
              const interviewRate = jobs.filter(job => job.status === 'interview' || job.status === 'offer' || job.status === 'accepted').length / Math.max(jobs.length, 1) * 100;
              
              if (thisMonth.length < 5) {
                insights.push({
                  icon: '📈',
                  title: 'Increase Application Volume',
                  message: 'Consider applying to 5-7 jobs per week for better opportunities',
                  priority: 'medium'
                });
              }
              
              if (responseRate < 20) {
                insights.push({
                  icon: '🎯',
                  title: 'Improve CV Targeting',
                  message: 'Focus on roles that match your skills more closely',
                  priority: 'high'
                });
              }
              
              if (interviewRate < 10) {
                insights.push({
                  icon: '💼',
                  title: 'Enhance Application Quality',
                  message: 'Tailor each application to the specific job requirements',
                  priority: 'high'
                });
              }
              
              if (metrics.responseTime > 14) {
                insights.push({
                  icon: '⏰',
                  title: 'Faster Follow-ups',
                  message: 'Follow up within 3-5 days to improve response rates',
                  priority: 'medium'
                });
              }
              
              return insights;
            })().map((insight, index) => (
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
            
            {/* Traditional Performance Analysis */}
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
  analyticsData?: any;
}> = ({ jobs, onViewJob, analyticsData }) => {
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
    .slice(0, 3);

  const statusDistribution = jobs.reduce((acc, job) => {
    acc[job.status] = (acc[job.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="glass-widget-premium rounded-xl p-6 h-full flex flex-col w-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white">Recent Jobs</h2>
      </div>
      
      {/* Job Applications List */}
      <div className="space-y-2">
        {lastJobs.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">No recent applications</div>
            <div className="text-sm text-gray-500">Start applying to jobs to see them here</div>
          </div>
        ) : (
          lastJobs.map((job, index) => (
            <motion.div
              key={job.id || job._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-white/5 transition-all duration-300 cursor-pointer"
              onClick={() => onViewJob(job.id || job._id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm text-white truncate">{job.jobTitle || job.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    job.status === 'applied' ? 'bg-green-600 dark:bg-green-600 text-green-300' :
                    job.status === 'interview' ? 'bg-yellow-600 dark:bg-yellow-600 text-yellow-300' :
                    job.status === 'offer' ? 'bg-green-600 dark:bg-green-600 text-green-300' :
                    'bg-gray-600 dark:bg-gray-600 text-gray-300'
                  }`}>
                    {job.status === 'applied' ? 'Applied' :
                     job.status === 'interview' ? 'Interviewing' :
                     job.status === 'offer' ? 'Offer' :
                     job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{job.companyName || job.company}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

// Main Analytics Component
const Analytics: React.FC = () => {
  const { user, loading: authLoading, isAuthenticated } = useUnifiedAuth();
  const { createCV } = useCreateCV();
  const { isOpen: isMobileMenuOpen, toggleSidebar } = useMobileSidebar();
  const { userData, loading: userLoading, error: userError } = useUserData();
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const searchParams = useSearchParams();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);
  
  // Performance monitoring
  const { startPageLoad, endPageLoad, startDataFetch, endDataFetch } = usePerformanceMonitor('Analytics');
  
  // Handle URL parameters for payment modal
  useEffect(() => {
    const plan = searchParams.get('plan');
    const showModal = searchParams.get('showPaymentModal');
    
    if (plan && showModal === 'true') {
      setSelectedPlanKey(plan);
      setShowPaymentModal(true);
    }
  }, [searchParams]);
  
  // Get user ID for data fetching using unified authentication
  const userId = getUserIdForAPI(user);
  
  // Memoize performance monitoring functions to prevent re-renders
  const memoizedStartDataFetch = useCallback(() => startDataFetch(), [startDataFetch]);
  const memoizedEndDataFetch = useCallback(() => endDataFetch(), [endDataFetch]);

  // Memoize fetchers with priority-based loading
  const fetchers = useMemo(() => ({
    // High priority - essential for Analytics page
    cvs: () => {
      memoizedStartDataFetch();
      return authenticatedFetch('/api/cvs').then(res => {
        memoizedEndDataFetch();
        return res.json();
      });
    },
    jobs: () => {
      memoizedStartDataFetch();
      return authenticatedFetch('/api/jobs').then(res => {
        memoizedEndDataFetch();
        return res.json();
      });
    },
    // Medium priority - analytics data
    analytics: () => {
      memoizedStartDataFetch();
      return authenticatedFetch(`/api/analytics/progress?userId=${userId}&period=${selectedPeriod}`).then(res => {
        memoizedEndDataFetch();
        return res.json();
      }).catch(() => {
        memoizedEndDataFetch();
        return { success: false, data: null };
      });
    },
    // Low priority - optional data
    drafts: () => {
      memoizedStartDataFetch();
      return authenticatedFetch('/api/drafts').then(res => {
        memoizedEndDataFetch();
        return res.json();
      }).catch(() => {
        memoizedEndDataFetch();
        return { success: false, data: { drafts: [] } };
      });
    }
  }), [userId, selectedPeriod, memoizedStartDataFetch, memoizedEndDataFetch]);
  
  // Optimized parallel data fetching with priority
  const {
    data: dashboardData,
    loading,
    errors,
    refetch
  } = useParallelDataFetching(
    fetchers,
    {
      cacheDuration: 300000, // 5 minutes
      staleWhileRevalidate: true,
      priority: ['cvs', 'jobs', 'analytics', 'drafts'], // Priority order for Analytics page
      timeout: 10000, // 10 second timeout for individual requests
      retryAttempts: 2 // Retry failed requests twice
    }
  );

  // Use standardized user data from hook
  const userProfile = userData;
  const jobs = (dashboardData as any)?.jobs?.success ? (dashboardData as any).jobs.data?.jobs || [] : [];
  const cvs = (dashboardData as any)?.cvs?.success ? (dashboardData as any).cvs.data?.cvs || [] : [];
  const analyticsData = (dashboardData as any)?.analytics?.success ? (dashboardData as any).analytics.data : null;
  const drafts = (dashboardData as any)?.drafts?.success ? (dashboardData as any).drafts.data?.drafts || [] : [];

  const handleUpdateMonthlyGoal = async (newGoal: number) => {
    try {
      const response = await authenticatedFetch('/api/user/update-monthly-goal', {
        method: 'PUT',
        body: JSON.stringify({ monthlyGoal: newGoal }),
      });
      if (response.ok) {
        // Refresh data using the optimized data fetching system
        refetch();
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
        // Refresh data using the optimized data fetching system
        refetch();
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

  // Old data fetching logic removed - now using optimized parallel data fetching

  // User profile updates now handled by the optimized data fetching system


  // Analytics data loading now handled by optimized parallel data fetching

  // loadData function removed - now using optimized parallel data fetching

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateCVHealthScore = () => {
    // Find master CV and calculate its completion percentage
    // Handle both old and new metadata formats
    const masterCV = cvs.find((cv: any) => {
      const isMasterAtRoot = cv.isMaster === true;
      const isMasterInMetadata = cv.metadata?.isMaster === true;
      const isMasterInMetadataString = cv.metadata?.isMaster === 'true';
      return isMasterAtRoot || isMasterInMetadata || isMasterInMetadataString;
    });
    
    if (!masterCV) {
      return 0;
    }
    
    const healthScore = calculateCompletionPercentage(masterCV);
    return healthScore;
  };
  
  const cvHealthScore = calculateCVHealthScore();

  // Performance monitoring
  useEffect(() => {
    startPageLoad();
    return () => {
      endPageLoad();
    };
  }, [startPageLoad, endPageLoad]);

  // Show page with partial data - always render structure immediately
  const hasCriticalData = userProfile && (cvs.length > 0 || jobs.length > 0);
  const showPartialData = !loading || hasCriticalData;

  return (
    <div className="dashboard-page space-y-4">
      {/* Page Header */}
      <PageHeader
        title={`Hello, ${getUserDisplayName(userProfile)}`}
        description="Welcome back! Here's your career progress overview."
        user={{
          name: getUserDisplayName(userProfile),
          email: getUserEmail(userProfile),
          username: userProfile?.username || '',
          profilePhoto: getUserAvatar(userProfile),
          designation: userProfile?.role || '',
          role: user?.role,
          subscription: userProfile?.subscription
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* First Row: CV Management and Recent Applications */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex w-full">
          <CVManagementSection
            cvHealthScore={cvHealthScore}
            cvs={cvs}
            drafts={drafts}
            onImproveScore={() => window.location.href = '/studio'}
            onCreateCV={async () => {
              try {
                const currentUserId = userId;
                if (userId) {
                  await createCV({ userId });
                }
              } catch (error) {
                console.error('Error creating CV:', error);
              }
            }}
            onAddJob={() => window.location.href = '/dashboard/application-tracker'}
            onWriteCoverLetter={() => window.location.href = '/studio?type=cover_letter'}
            onCreateCoverLetter={() => window.location.href = '/studio?type=cover_letter'}
            onCreateJob={() => window.location.href = '/dashboard/application-tracker'}
            onSetMasterCV={handleSetMasterCV}
            predictions={analyticsData?.predictions}
            onUpdateGoal={handleUpdateMonthlyGoal}
            userId={userId}
            jobs={jobs}
          />
        </div>
        <div className="flex w-full">
          <RecentJobsWidget
            jobs={jobs}
            onViewJob={(jobId) => window.location.href = `/dashboard/application-tracker?job=${jobId}`}
            analyticsData={analyticsData}
          />
        </div>
      </div>

      {/* Second Row: Progress Tracking and Intelligence Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          {userId ? (
            <ProgressTrackingWidget userId={userId} />
          ) : (
            <div className="glass-widget-premium rounded-xl p-6 text-center">
              <div className="text-white/60">Loading progress data...</div>
            </div>
          )}
        </div>
        <div className="lg:col-span-1">
          <ApplicationHub
            drafts={drafts}
            jobs={jobs}
            onResumeDraft={(draftId) => window.location.href = `/studio?draft=${draftId}`}
            onPreviewDraft={(draftId) => window.location.href = `/preview?draft=${draftId}`}
            onDiscardDraft={(draftId) => {
              // TODO: Implement discard draft functionality
            }}
          />
        </div>
      </div>

      {/* Third Row: CV Journeys Widget */}
      <AnalyticsJourneyWidget
        onResumeJourney={(journey) => {
          // Navigate to Application Journey page and resume the specific journey
          window.location.href = `/dashboard/application-journey?resume=${journey.id}`;
        }}
        onDeleteJourney={(journeyId) => {
          // TODO: Implement delete journey functionality
        }}
        onViewJourney={(journey) => {
          // TODO: Implement view journey functionality
          window.location.href = `/dashboard/application-journey`;
        }}
      />

      {/* Fourth Row: Performance Insights - Full Width */}
          <PerformanceInsights
            analyticsData={analyticsData}
            jobs={jobs}
            cvs={cvs}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
      />

      {/* Fifth Row: Application Stats - Full Width */}
      {userId && (
        <div className="w-full">
          <ApplicationStatsWidget userId={userId} />
        </div>
      )}

      {/* Enhanced Payment Modal */}
      <UniversalPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        preselectedPlanKey={selectedPlanKey || undefined}
        onSuccess={(subscription) => {
          console.log('Payment successful:', subscription);
          setShowPaymentModal(false);
          // Optionally refresh the page or show success message
          window.location.reload();
        }}
        returnUrl="/dashboard"
        triggerContext="landing-page-plan-selection"
      />

    </div>
  );
};

export default Analytics;
