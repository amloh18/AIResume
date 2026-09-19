'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Briefcase, PenTool, TrendingUp, Target, Sparkles, Zap,
  Lightbulb, Plus, Edit, Eye, Trash2, Calendar, CheckCircle, Heart,
  MessageSquare, User, BarChart3, SearchX, Clock, ChevronRight, ChevronLeft, Check, X, Edit2
} from 'lucide-react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import { useUserData, getUserDisplayName, getUserEmail, getUserAvatar } from '@/lib/hooks/useUserData';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { getCvScoreForDisplay } from '@/lib/utils/cv-scoring';

import ProgressTrackingWidget from './ProgressTrackingWidget';
import ApplicationStatsWidget from './ApplicationStatsWidget';
import PageHeader from './PageHeader';
import MasterCVBadge from './MasterCVBadge';
import { authenticatedFetch } from '@/lib/utils/apiUtils';
import { usePerformanceMonitor } from '@/lib/utils/performanceMonitor';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import PaymentPastDueBanner from './PaymentPastDueBanner';
import SubscriptionExpiryBanner from './SubscriptionExpiryBanner';
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';
import SegmentedToggle from '@/components/ui/SegmentedToggle';

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
    const category = skill.category || skill.name || '';
    const skillItems = Array.isArray(skill.skills) ? skill.skills : Array.isArray(skill.keywords) ? skill.keywords : [];
    if (category && category.trim()) skillScore += 1;
    if (skillItems.length > 0) skillScore += 1;
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
  // Use canonical score selector first
  const canonicalScore = getCvScoreForDisplay(cv);
  if (canonicalScore !== undefined && canonicalScore !== null) {
    return canonicalScore;
  }

  // Fallback to report score
  const reportScore = 
    cv.metadata?.surgeonAnalysis?.scoreReport?.overall_score ??
    cv.scoreReport?.overall_score ??
    cv.metadata?.cvScore ??
    cv.cvScore;

  if (reportScore !== undefined && reportScore !== null) {
    return reportScore;
  }

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

  // Function to navigate to canvas page and open report sidepanel for master CV
  const router = useRouter();
  const handleShowATSAnalysis = () => {
    if (masterCV) {
      // Navigate to editor in edit-master mode to view/edit the master CV
      router.push(`/editor?mode=edit-master&cvId=${masterCV.id}`);
    } else {
      // If no master CV, navigate to editor step 1
      router.push('/editor');
    }
  };

  // Function to navigate to edit Master CV
  const handleEditMasterCV = () => {
    if (masterCV) {
      // Navigate to master CV mode for editing in Resume Enhancer
      router.push(`/editor?mode=edit-master&cvId=${masterCV.id}`);
    } else {
      // If no master CV, navigate to Resume Enhancer to create one
      router.push('/editor');
    }
  };

  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const status = getStatus(cvHealthScore);
  const circumference = 2 * Math.PI * 44;
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

  // Extract professional profile information from Master CV
  const getProfessionalProfile = () => {
    if (!masterCV) {
      return {
        experienceLevel: 'Professional',
        yearsExperience: 0,
        skillsCount: 0
      };
    }

    // Try to get data from Career Report (AI Analysis) first
    const aiAnalysis = masterCV.metadata?.aiAnalysis;
    let experienceLevel = 'Professional';
    let yearsExperience = 0;
    let skillsCount = 0;

    // Get experience level from AI analysis if available
    if (aiAnalysis?.experienceLevel?.level) {
      experienceLevel = aiAnalysis.experienceLevel.level;
    }

    // Calculate years of experience from work history
    if (masterCV.cvData?.work && Array.isArray(masterCV.cvData.work) && masterCV.cvData.work.length > 0) {
      const workEntries = masterCV.cvData.work;

      // Get all start dates and calculate total experience
      const startDates = workEntries
        .map((job: any) => {
          const startDate = job.startDate;
          if (!startDate) return null;

          // Try parsing various date formats
          const parsedDate = new Date(startDate);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate;
          }

          // Try parsing "YYYY-MM" or "MM/YYYY" formats
          const yearMonthMatch = startDate.match(/(\d{4})[-\/](\d{1,2})/);
          if (yearMonthMatch) {
            const year = parseInt(yearMonthMatch[1]);
            const month = parseInt(yearMonthMatch[2]) - 1; // Month is 0-indexed
            return new Date(year, month, 1);
          }

          // Try parsing just year
          const yearMatch = startDate.match(/(\d{4})/);
          if (yearMatch) {
            const year = parseInt(yearMatch[1]);
            return new Date(year, 0, 1);
          }

          return null;
        })
        .filter((date: any) => date !== null && !isNaN(date.getTime()))
        .sort((a: any, b: any) => a!.getTime() - b!.getTime());

      if (startDates.length > 0 && startDates[0]) {
        const earliestStart = startDates[0];
        const now = new Date();
        const yearsDiff = (now.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24 * 365);
        yearsExperience = Math.floor(yearsDiff);
      }
    }

    // Count skills from CV data
    if (masterCV.cvData?.skills) {
      if (Array.isArray(masterCV.cvData.skills)) {
        // Handle different skill formats
        skillsCount = masterCV.cvData.skills.reduce((count: number, skill: any) => {
          if (typeof skill === 'string') {
            return count + 1;
          } else if (skill?.skills && Array.isArray(skill.skills)) {
            // Unified format: { category, skills[] }
            return count + skill.skills.length;
          } else if (skill?.keywords && Array.isArray(skill.keywords)) {
            // Legacy format: { name, keywords[] }
            return count + skill.keywords.length;
          } else if (skill?.category) {
            return count + 1;
          } else if (skill?.name) {
            return count + 1;
          }
          return count;
        }, 0);
      }
    }

    return {
      experienceLevel,
      yearsExperience,
      skillsCount
    };
  };

  const profile = getProfessionalProfile();

  // If no master CV, show CTA to create one
  if (!masterCV) {
    const handleCreateMasterCV = () => {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fromOnboarding', 'true');
        sessionStorage.setItem('welcomeDismissed', 'true');
      }
      router.push('/editor');
    };

    return (
      <div
        className="glass-widget-premium rounded-xl p-4 h-full flex flex-col w-full"
        data-analytics-widget="cv-management"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-h3 font-bold text-gray-900 dark:text-white">CV Management</h2>
          <div className="flex items-center gap-2">
            <MasterCVBadge />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 py-8">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-600 to-[#013f2e] rounded-2xl flex items-center justify-center mb-4 shadow-md">
            <FileText className="w-10 h-10 text-white" />
          </div>

          <div className="space-y-2">
            <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
              Create Your Master CV
            </h3>
            <p className="text-gray-600 dark:text-white/70 text-small max-w-md mx-auto leading-relaxed">
              Your Master CV acts as the foundation for all your tailored CVs and job tracking. Create it once, and we'll use it as a base for every job application you track.
            </p>
          </div>

          <div className="space-y-3 mt-6 w-full max-w-sm">
            <motion.button
              onClick={handleCreateMasterCV}
              className="w-full px-6 py-3 bg-[#013f2e] hover:bg-[#025c43] text-white rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              Create Master CV
            </motion.button>
            <p className="text-small text-gray-500 dark:text-white/50">
              Required for tailored CVs and job tracking
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="glass-widget-premium rounded-xl p-4 h-full flex flex-col w-full"
      data-analytics-widget="cv-management"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-h3 font-bold text-gray-900 dark:text-white">CV Management</h2>
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
                  <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-white/10" />
                  <defs>
                    <linearGradient id="cvHealthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                  <circle cx="50" cy="50" r="44" stroke="url(#cvHealthGradient)" strokeWidth="8" fill="none"
                    strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-1000 ease-out" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-h3 font-bold text-gray-900 dark:text-white">{cvHealthScore}%</span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-gray-600 dark:text-white/60 text-small">{masterCV?.title || 'Master CV Health'}</p>
                <motion.button
                  onClick={handleEditMasterCV}
                  className="text-gray-600 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Edit Master CV"
                >
                  <Edit size={14} />
                </motion.button>
              </div>
              <p className={`text-small font-medium ${status.color}`}>{status.label}</p>

            </div>
          </div>


          {/* Right Column */}
          <div className="space-y-6">
            {/* Top Row: Professional Title */}
            {cvs.length > 0 && (
              <div className="glass-card-premium rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-400/20">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h4 className="text-gray-900 dark:text-white font-bold text-h3">
                      {profile.experienceLevel}
                    </h4>
                    <p className="text-gray-600 dark:text-white/60 text-small">
                      {profile.yearsExperience > 0
                        ? `${profile.yearsExperience} ${profile.yearsExperience === 1 ? 'year' : 'years'} experience`
                        : 'No experience listed'
                      }
                      {profile.skillsCount > 0 && ` • ${profile.skillsCount} ${profile.skillsCount === 1 ? 'skill' : 'skills'}`}
                      {profile.yearsExperience === 0 && profile.skillsCount === 0 && ' • Complete your profile'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Row: Quick Actions */}
            <div className="space-y-3">
              <h3 className="text-gray-900 dark:text-white font-medium text-small flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <motion.button
                  onClick={handleShowATSAnalysis}
                  className="w-full p-3 bg-purple-400/20 text-purple-400 rounded-lg text-small font-medium hover:bg-purple-400/30 transition-all duration-300 flex items-center gap-2"
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Target size={16} /> Show ATS Analysis
                </motion.button>
                <motion.button
                  onClick={onCreateJob}
                  className="w-full p-3 bg-blue-400/20 text-blue-400 rounded-lg text-small font-medium hover:bg-blue-400/30 transition-all duration-300 flex items-center gap-2"
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

// 2. Application Calendar Widget (3 Weeks)
export const ApplicationCalendarWidget: React.FC<{
  jobs: any[];
}> = ({ jobs }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedType, setSelectedType] = useState<'deadlines' | 'applications' | null>(null);

  // Get deadlines for a specific date
  const getDeadlinesForDate = (date: Date) => {
    return jobs.filter(job => {
      if (!job.deadline) return false;
      const deadlineDate = new Date(job.deadline);
      return deadlineDate.toDateString() === date.toDateString();
    }).map(job => ({
      ...job,
      deadlineDate: new Date(job.deadline)
    }));
  };

  // Get applications for a specific date
  const getApplicationsForDate = (date: Date) => {
    return jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      return jobDate.toDateString() === date.toDateString();
    });
  };

  // Get upcoming deadlines sorted by date (earliest first)
  const upcomingDeadlines = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return jobs
      .filter(job => {
        if (!job.deadline) return false;
        const deadlineDate = new Date(job.deadline);
        deadlineDate.setHours(0, 0, 0, 0);
        return deadlineDate >= today; // Only future or today's deadlines
      })
      .map(job => ({
        ...job,
        deadlineDate: new Date(job.deadline)
      }))
      .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime());
  }, [jobs]);

  const formatDeadlineDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(date);
    deadline.setHours(0, 0, 0, 0);

    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays <= 7) {
      return `In ${diffDays} days`;
    } else {
      return deadline.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: deadline.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Calculate date range for the header
  const getDateRange = () => {
    const today = new Date();
    const startDate = new Date(today);
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(today.getDate() + mondayOffset - 7 + (weekOffset * 7));

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 20); // 3 weeks - 1 day

    return {
      start: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  };

  const dateRange = getDateRange();
  const selectedDateDeadlines = selectedDate ? getDeadlinesForDate(selectedDate) : [];
  const selectedDateApplications = selectedDate ? getApplicationsForDate(selectedDate) : [];

  return (
    <div
      className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col w-full"
      data-analytics-widget="application-calendar"
    >
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <motion.button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Previous weeks"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-white/60" />
        </motion.button>

        <div className="text-center">
          <h2 className="text-body font-bold text-gray-900 dark:text-white">Application Calendar</h2>
          <p className="text-[11px] text-gray-500 dark:text-white/50">{dateRange.start} - {dateRange.end}</p>
        </div>

        <motion.button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Next weeks"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-white/60" />
        </motion.button>
      </div>

      {/* Reset to Today button when offset */}
      {weekOffset !== 0 && (
        <motion.button
          onClick={() => setWeekOffset(0)}
          className="mb-2 text-small text-blue-400 hover:text-blue-300 transition-colors flex items-center justify-center gap-1"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Calendar className="w-3 h-3" />
          Back to Today
        </motion.button>
      )}

      {/* Calendar OR Job List View - Mutually Exclusive */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedDate ? (
          <>
            {/* Calendar View */}
            <div className="grid grid-cols-7 gap-1 mb-4">
              {/* Day headers */}
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-center text-small font-medium text-gray-600 dark:text-white/60 py-1">
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {(() => {
                const today = new Date();
                const startDate = new Date(today);
                // Go back to start of previous week (Monday) with offset
                const dayOfWeek = today.getDay();
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
                startDate.setDate(today.getDate() + mondayOffset - 7 + (weekOffset * 7));

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

                  // Determine if this is a deadline day
                  const isDeadlineDay = dayDeadlines > 0;
                  const isClickable = isDeadlineDay || dayApplications > 0;

                  const handleDateClick = () => {
                    if (!isClickable) return;
                    setSelectedDate(new Date(currentDate));
                    // Default to deadlines if both, otherwise the one that exists
                    if (isDeadlineDay) {
                      setSelectedType('deadlines');
                    } else {
                      setSelectedType('applications');
                    }
                  };

                  calendarDays.push(
                    <motion.div
                      key={i}
                      onClick={handleDateClick}
                      className={`
                        aspect-square flex flex-col items-center justify-center text-small rounded transition-all duration-200
                        ${isToday ? 'bg-blue-400/20 dark:bg-blue-400/20 text-blue-400 font-medium ring-2 ring-blue-400/50' :
                          isPast ? 'text-gray-600 dark:text-white/60' :
                            'text-gray-400 dark:text-white/40'}
                        ${dayApplications > 0 ? 'bg-green-400/20 dark:bg-green-400/20 text-green-400 cursor-pointer' : ''}
                        ${isDeadlineDay ? 'bg-red-400/20 dark:bg-red-400/20 text-red-400 cursor-pointer' : ''}
                        ${isClickable ? 'hover:scale-110' : 'hover:bg-gray-100 dark:hover:bg-white/5'}
                      `}
                      whileHover={isClickable ? { scale: 1.1 } : {}}
                      whileTap={isClickable ? { scale: 0.95 } : {}}
                    >
                      <div className="font-medium text-small">{currentDate.getDate()}</div>
                      <div className="flex gap-0.5 mt-0.5">
                        {dayApplications > 0 && (
                          <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                        )}
                        {isDeadlineDay && (
                          <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                        )}
                      </div>
                    </motion.div>
                  );
                }
                return calendarDays;
              })()}
            </div>

            {/* Legend - Compact */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-gray-600 dark:text-white/60 mb-2">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>Apps</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                <span>Deadlines</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                <span>Today</span>
              </div>
            </div>

            {/* Summary */}
            {(upcomingDeadlines.length > 0 || jobs.length > 0) && (
              <div className="text-center text-small text-gray-500 dark:text-white/50">
                {upcomingDeadlines.length > 0 && (
                  <><span className="text-red-400 font-medium">{upcomingDeadlines.length}</span> deadline{upcomingDeadlines.length !== 1 ? 's' : ''}</>
                )}
                {upcomingDeadlines.length > 0 && jobs.length > 0 && ' • '}
                {jobs.length > 0 && (
                  <><span className="text-green-400 font-medium">{jobs.length}</span> app{jobs.length !== 1 ? 's' : ''}</>
                )}
                <span className="text-gray-400"> • Click dates to view</span>
              </div>
            )}
          </>
        ) : (
          /* Job List View - Replaces Calendar */
          <motion.div
            className="flex-1 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between mb-3">
              <motion.button
                onClick={() => { setSelectedDate(null); setSelectedType(null); }}
                className="flex items-center gap-1 text-small text-gray-500 dark:text-white/60 hover:text-gray-700 dark:hover:text-white transition-colors"
                whileHover={{ x: -2 }}
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </motion.button>

              <h3 className={`text-small font-semibold flex items-center gap-1 ${selectedType === 'deadlines' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                {selectedType === 'deadlines' ? <Clock className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </h3>

              {/* Toggle between apps and deadlines if both exist */}
              {selectedDateDeadlines.length > 0 && selectedDateApplications.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSelectedType('applications')}
                    className={`px-2 py-1 rounded text-small transition-colors ${selectedType === 'applications' ? 'bg-green-400 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}
                  >
                    Apps ({selectedDateApplications.length})
                  </button>
                  <button
                    onClick={() => setSelectedType('deadlines')}
                    className={`px-2 py-1 rounded text-small transition-colors ${selectedType === 'deadlines' ? 'bg-red-400 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-white/50'}`}
                  >
                    Due ({selectedDateDeadlines.length})
                  </button>
                </div>
              )}
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {selectedType === 'deadlines' ? (
                selectedDateDeadlines.length > 0 ? (
                  selectedDateDeadlines.map((job) => (
                    <motion.div
                      key={job.id || job._id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-small">{job.jobTitle || job.title}</p>
                        <p className="text-small text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className="text-small text-red-500 dark:text-red-400 font-medium">Deadline</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-white/50 py-8">No deadlines on this date</div>
                )
              ) : (
                selectedDateApplications.length > 0 ? (
                  selectedDateApplications.map((job) => (
                    <motion.div
                      key={job.id || job._id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-500/20 rounded-lg"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate text-small">{job.jobTitle || job.title}</p>
                        <p className="text-small text-gray-500 dark:text-gray-400 truncate">{job.company}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <span className={`text-small px-2 py-0.5 rounded-full ${job.status === 'interview' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                          job.status === 'offer' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                            'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                          }`}>
                          {job.status || 'Applied'}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 dark:text-white/50 py-8">No applications on this date</div>
                )
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// 3. The "Intelligence Dashboard" - Enhanced Market Intelligence + AI Insights
export const IntelligenceDashboard: React.FC<{
  predictions: any;
  marketIntelligence: any;
  jobs: any[];
  cvs: any[];
  userAvatar?: string;
  onUpdateGoal?: (goal: number) => void;
}> = ({ predictions, marketIntelligence, jobs, cvs, userAvatar, onUpdateGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('buildairesume_monthly_goal');
      if (saved) return parseInt(saved, 10);
    }
    return predictions?.monthlyGoal || 20;
  });

  // Extract user profile data from Master CV
  const extractUserProfile = () => {
    const masterCV = cvs.find(cv => cv.isMaster === true || cv.metadata?.isMaster === true);
    if (!masterCV?.cvData) return null;

    const profile: {
      experience: number;
      skills: string[];
      industries: string[];
      jobTitles: string[];
      location: string;
      experienceLevel: string;
    } = {
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
      profile.jobTitles = workExperience.map((job: any) => job.position || job.title).filter(Boolean);

      // Calculate total experience
      const startDates = workExperience
        .map((job: any) => new Date(job.startDate))
        .filter((date: any) => !isNaN(date.getTime()))
        .sort((a: any, b: any) => a.getTime() - b.getTime());

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
      profile.skills = masterCV.cvData.skills.flatMap((skill: any) => {
        if (typeof skill === 'string') return [skill];
        if (skill?.skills && Array.isArray(skill.skills)) return skill.skills;
        if (skill?.keywords && Array.isArray(skill.keywords)) return skill.keywords;
        if (skill?.category) return [skill.category];
        if (skill?.name) return [skill.name];
        return [];
      }).filter(Boolean);
    }

    // Extract location
    if (masterCV.cvData.basics?.location) {
      profile.location = masterCV.cvData.basics.location.city || masterCV.cvData.basics.location.address || '';
    }

    // Extract industries from applied jobs
    const jobIndustries = jobs.map((job: any) => job.industry).filter(Boolean);
    profile.industries = Array.from(new Set(jobIndustries));

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

    const responsiveJobs = jobs.filter(job => job.status !== 'draft' && job.status !== 'created' && job.status !== 'applied');
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

    const userBenchmark = benchmarks[userProfile?.experienceLevel as keyof typeof benchmarks] || benchmarks.entry;

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
      marketDemandScore: Math.round((jobs.filter(job => job.status !== 'draft' && job.status !== 'created' && job.status !== 'applied').length / Math.max(jobs.length, 1)) * 100),
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
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('buildairesume_monthly_goal', newGoal.toString());
    }
    setIsEditingGoal(false);
  };

  const last30DaysData = useMemo(() => {
    const data: { date: Date; count: number }[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      data.push({ date: d, count: 0 });
    }
    
    jobs.forEach((job: any) => {
      const jobDate = new Date(job.createdAt || job.updatedAt);
      jobDate.setHours(0, 0, 0, 0);
      const diffTime = now.getTime() - jobDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 30) {
        const index = 29 - diffDays;
        if (data[index]) data[index].count += 1;
      }
    });
    return data;
  }, [jobs]);

  const maxCount = Math.max(2, ...last30DaysData.map(d => d.count));

  return (
    <div className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 h-full flex flex-col w-full" data-analytics-widget="intelligence-dashboard">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-body font-bold text-gray-900 dark:text-white">AI Insights</h2>
            <p className="text-[11px] text-gray-500 dark:text-white/50">Market & Application Goals</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-5 items-center justify-center">
        {/* Monthly Goal Progress */}
        <div className="w-full md:w-1/2 h-full">
          <div className="bg-white/50 dark:bg-black/20 rounded-lg p-4 border border-gray-100 dark:border-white/5 h-full flex flex-col justify-center">
            <div className="flex items-center justify-between mb-3">
              <span className="text-small font-medium text-gray-600 dark:text-gray-300">Monthly Goal</span>
              {isEditingGoal ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={newGoal}
                    onChange={(e) => setNewGoal(Number(e.target.value))}
                    className="w-12 text-small p-1 bg-transparent border border-gray-300 dark:border-gray-600 rounded text-center text-gray-900 dark:text-white"
                  />
                  <button onClick={handleUpdateGoal} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
                  <button onClick={() => setIsEditingGoal(false)} className="text-red-500 hover:text-red-600"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-small font-bold text-gray-900 dark:text-white">
                    {predictions?.projectedApplications || jobs.length} / {newGoal}
                  </span>
                  <button onClick={() => setIsEditingGoal(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            <div className="w-full h-14 flex items-end gap-[2px] mt-2 mb-2">
              {last30DaysData.map((day, idx) => (
                <div key={idx} className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-t-sm relative group h-full flex items-end">
                  <motion.div
                    className={`w-full rounded-t-sm ${day.count > 0 ? 'bg-blue-500' : 'bg-transparent'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.count / maxCount) * 100}%` }}
                    transition={{ duration: 0.5, delay: idx * 0.015 }}
                  />
                  {day.count > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 whitespace-nowrap">
                      {day.count} apps
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
              You're on track to hit your goal!
            </p>
          </div>
        </div>

        {/* Market Data Snippets & CTA */}
        <div className="w-full md:w-1/2 flex flex-col h-full space-y-3">
          <div className="grid grid-cols-2 gap-3 flex-1">
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center h-full relative">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 mb-2">Response Rate</span>
              <div className="relative w-12 h-12 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3" fill="none" className="text-gray-200 dark:text-white/10" />
                  <motion.circle 
                    cx="18" cy="18" r="16" stroke="currentColor" strokeWidth="3" fill="none"
                    strokeDasharray={2 * Math.PI * 16} 
                    strokeDashoffset={2 * Math.PI * 16 * (1 - competitiveData.metrics.responseRate / 100)}
                    className="text-lime-500" strokeLinecap="round" 
                    initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - competitiveData.metrics.responseRate / 100) }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </svg>
                <span className="absolute text-[11px] font-bold text-gray-900 dark:text-white">{competitiveData.metrics.responseRate}%</span>
              </div>
            </div>
            <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 border border-gray-100 dark:border-white/5 flex flex-col items-center justify-center text-center h-full">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 mb-2 w-full text-left">Time to Offer</span>
              <div className="w-full flex flex-col gap-1 mt-auto">
                <div className="flex justify-between items-end">
                  <span className="text-h3 font-bold text-gray-900 dark:text-white leading-none">{competitiveData.metrics.timeToOffer}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">days</span>
                </div>
                <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-orange-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (competitiveData.metrics.timeToOffer / 60) * 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>
          <Link href="/dashboard/jobs?tab=applications" className="w-full flex items-center justify-center gap-2 p-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white transition-colors rounded-lg text-small font-bold mt-auto shadow-sm">
            <Briefcase size={16} /> Track New Application
          </Link>
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
      applied: jobs.filter(job => job.status === 'applied' || (job.status !== 'draft' && job.status !== 'created')).length,
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
    const periodResponses = periodJobs.filter(job => job.status !== 'draft' && job.status !== 'created' && job.status !== 'applied').length;

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
    <div
      className="glass-widget-premium rounded-xl p-6"
      data-analytics-widget="performance-insights"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h3 font-bold text-gray-900 dark:text-white">Performance Insights</h2>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            value={selectedPeriod}
            onChange={(value) => onPeriodChange(value)}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
            theme="lime"
            size="sm"
          />
        </div>
      </div>

      {/* First Row: Application Conversion Funnel and Performance Metrics - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Application Conversion Funnel */}
        <div>
          <h3 className="text-gray-900 dark:text-white font-medium text-small mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-400" />
            Application Conversion Funnel
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-blue-400 mb-1">{metrics.applicationFunnel.applied}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Applied</div>
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-purple-400 mb-1">{metrics.applicationFunnel.interview}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Interview</div>
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-green-400 mb-1">{metrics.applicationFunnel.offer}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Offered</div>
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-red-400 mb-1">{jobs.filter(job => job.status === 'rejected').length}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Rejection</div>
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div>
          <h3 className="text-gray-900 dark:text-white font-medium text-small mb-3 flex items-center gap-2">
            <Target size={14} className="text-green-400" />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-blue-400 mb-1">{metrics.periodApplications}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Applications This {selectedPeriod}</div>
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-green-400 mb-1">{metrics.conversionRates.overallSuccess}%</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Overall Success Rate</div>
              {metrics.productivity.improvement > 0 && (
                <div className="text-small text-green-400 font-medium">+{metrics.productivity.improvement}% vs Industry</div>
              )}
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-purple-400 mb-1">{metrics.periodResponses}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Responses Received</div>
              <div className="text-small text-gray-500 dark:text-white/50">
                {metrics.periodApplications > 0 ? Math.round((metrics.periodResponses / metrics.periodApplications) * 100) : 0}% response rate
              </div>
            </div>

            <div className="glass-card-premium rounded-xl p-4 text-center">
              <div className="text-h2 font-bold text-orange-400 mb-1">{metrics.responseTime}</div>
              <div className="text-gray-600 dark:text-white/60 text-small">Avg Response Time (days)</div>
              <div className={`text-small font-medium ${metrics.responseTime <= 7 ? 'text-green-400' : metrics.responseTime <= 14 ? 'text-yellow-400' : 'text-red-400'}`}>
                {metrics.responseTime <= 7 ? 'Excellent' : metrics.responseTime <= 14 ? 'Good' : 'Slow'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 glass-card-premium rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-medium text-small mb-3 flex items-center gap-2">
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

              const responseRate = jobs.filter(job => job.status !== 'draft' && job.status !== 'created' && job.status !== 'applied').length / Math.max(jobs.length, 1) * 100;
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
              <div key={index} className={`p-3 rounded-lg border-l-4 ${insight.priority === 'high' ? 'bg-red-400/10 border-red-400' :
                insight.priority === 'medium' ? 'bg-yellow-400/10 border-yellow-400' :
                  'bg-blue-400/10 border-blue-400'
                }`}>
                <div className="flex items-start gap-2">
                  <span className="text-h3">{insight.icon}</span>
                  <div className="flex-1">
                    <h4 className="text-gray-900 dark:text-white font-medium text-small mb-1">{insight.title}</h4>
                    <p className="text-gray-600 dark:text-white/70 text-small">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}

            {/* Traditional Performance Analysis */}
            <div className="space-y-2">
              {metrics.conversionRates.applyToScreen < 20 && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                  <div className="w-1 h-1 bg-red-400 rounded-full"></div>
                  <span>Low screening rate - consider improving CV targeting</span>
                </div>
              )}
              {metrics.conversionRates.screenToInterview < 30 && metrics.applicationFunnel.screening > 0 && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                  <div className="w-1 h-1 bg-orange-400 rounded-full"></div>
                  <span>Interview conversion needs improvement - optimize phone screening approach</span>
                </div>
              )}
              {metrics.responseTime > 14 && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                  <div className="w-1 h-1 bg-yellow-400 rounded-full"></div>
                  <span>Follow up more promptly - faster responses improve success rates</span>
                </div>
              )}
              {metrics.productivity.improvement > 0 && (
                <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  <span>Above industry average - maintain current application quality</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 glass-card-premium rounded-lg">
          <h3 className="text-gray-900 dark:text-white font-medium text-small mb-3">Next Actions</h3>
          <div className="space-y-2">
            {metrics.periodApplications < 3 && selectedPeriod === 'week' && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                <span>Increase application volume - aim for 5-7 applications per week</span>
              </div>
            )}
            {metrics.conversionRates.overallSuccess < 15 && (
              <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
                <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
                <span>Focus on quality over quantity - tailor applications more specifically</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
              <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
              <span>Track follow-ups systematically for better response rates</span>
            </div>
            <div className="flex items-center gap-2 text-gray-700 dark:text-white/70 text-small">
              <div className="w-1 h-1 bg-green-400 rounded-full"></div>
              <span>Continue building your professional network</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 5. The "Recent Jobs" Widget - Compact inline display
const RecentJobsWidget: React.FC<{
  jobs: any[];
  onViewJob: (jobId: string) => void;
  onCreateJob?: () => void;
  analyticsData?: any;
}> = ({ jobs, onViewJob, onCreateJob, analyticsData }) => {
  // Sort by most recent and limit to 6
  const sortedJobs = [...jobs].sort((a, b) =>
    new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
  );

  const displayedJobs = sortedJobs.slice(0, 6);
  const hasMoreJobs = sortedJobs.length > 6;

  const getStatusStyle = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'created';
    switch (normalizedStatus) {
      case 'applied':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'interview':
      case 'interviewing':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'offer':
        return 'bg-green-500/20 text-green-400 border border-green-500/30';
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'screening':
        return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
      case 'created':
      default:
        return 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || 'created';
    switch (normalizedStatus) {
      case 'applied':
        return 'Applied';
      case 'interview':
      case 'interviewing':
        return 'Interview';
      case 'offer':
        return 'Offer';
      case 'rejected':
        return 'Rejected';
      case 'screening':
        return 'Screening';
      case 'created':
      default:
        return 'Staging';
    }
  };

  const getDaysSinceAdded = (createdAt: string | Date) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1d ago';
    return `${diffDays}d ago`;
  };

  return (
    <div
      className="glass-widget-premium rounded-xl p-6 h-full flex flex-col w-full"
      data-analytics-widget="recent-jobs"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-h3 font-bold text-gray-900 dark:text-white">Recent Jobs</h2>
        <span className="text-small text-gray-500 dark:text-gray-400">
          {displayedJobs.length}{hasMoreJobs ? `/${sortedJobs.length}` : ''} jobs
        </span>
      </div>

      {/* Content */}
      {displayedJobs.length === 0 ? (
        // Empty State
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <SearchX className="w-16 h-16 text-gray-300 dark:text-gray-500 mb-4" />
          <p className="text-body font-semibold text-gray-900 dark:text-white mb-1">No Recent Jobs</p>
          <p className="text-small text-gray-500 dark:text-gray-400 mb-6">You haven't saved any jobs yet.</p>
          {onCreateJob && (
            <button
              onClick={onCreateJob}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors duration-200"
            >
              Add a Job
            </button>
          )}
        </div>
      ) : (
        // Populated State - scrollable list
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 space-y-2">
            {displayedJobs.map((job, index) => (
              <div
                key={job.id || job._id || index}
                className="flex items-center gap-2 py-2 px-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
                onClick={() => onViewJob(job.id || job._id)}
              >
                {/* Job Title - Company inline */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5">
                  <span className="text-small font-medium text-gray-900 dark:text-white truncate">
                    {job.jobTitle || job.title || 'Untitled'}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">•</span>
                  <span className="text-small text-gray-500 dark:text-gray-400 truncate">
                    {job.companyName || job.company || 'Unknown'}
                  </span>
                </div>

                {/* Days since added */}
                <span className="text-small text-gray-400 dark:text-gray-500 flex-shrink-0 whitespace-nowrap">
                  {getDaysSinceAdded(job.createdAt || job.created_at)}
                </span>

                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded text-small font-medium whitespace-nowrap flex-shrink-0 ${getStatusStyle(job.status)}`}>
                  {getStatusLabel(job.status)}
                </span>
              </div>
            ))}
          </div>

          {/* View All Link - only shown when there are more than 7 jobs */}
          {hasMoreJobs && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10 text-center flex-shrink-0">
              <button
                onClick={() => window.location.href = '/dashboard/jobs?tab=applications'}
                className="text-red-500 hover:text-red-600 text-small font-medium transition-colors"
              >
                View All ({sortedJobs.length}) →
              </button>
            </div>
          )}
        </div>
      )}
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
  const router = useRouter();

  // Use centralized dashboard data context
  const {
    cvs,
    coverLetters,
    jobs,
    analytics: analyticsData,
    loading: dataLoading,
    error: dataError,
    refreshAll
  } = useDashboardData();

  // Performance monitoring
  const { startPageLoad, endPageLoad } = usePerformanceMonitor('Analytics');

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

  // Use standardized user data from hook
  const userProfile = userData;

  // No need for separate fetchers - data comes from context
  const loading = dataLoading;
  const drafts: any[] = []; // Drafts removed from context for now

  const handleUpdateMonthlyGoal = async (newGoal: number) => {
    try {
      const response = await authenticatedFetch('/api/user/update-monthly-goal', {
        method: 'PUT',
        body: JSON.stringify({ monthlyGoal: newGoal }),
      });
      if (response.ok) {
        // Refresh data using the centralized context
        await refreshAll();
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
        // Refresh data using the centralized context
        await refreshAll();
      }
    } catch (error) {
      console.error('Error setting master CV:', error);
    }
  };

  const calculateCompletionPercentage = (cv: any): number => {
    // Use canonical score selector first
    const canonicalScore = getCvScoreForDisplay(cv);
    if (canonicalScore !== undefined && canonicalScore !== null) {
      return canonicalScore;
    }

    // Fallback to report score
    const reportScore = 
      cv.metadata?.surgeonAnalysis?.scoreReport?.overall_score ??
      cv.scoreReport?.overall_score ??
      cv.metadata?.cvScore ??
      cv.cvScore;

    if (reportScore !== undefined && reportScore !== null) {
      return reportScore;
    }

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

  // Removed skeleton loading - dashboard shows content immediately
  // Data will populate as it loads without blocking the UI

  // Check if subscription is past due
  const subscriptionStatus = userProfile?.subscription?.status;
  const isPastDue = subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid';

  // Get expiry information from useUsageLimits
  const { timeAccess, subscription: usageSubscription } = useUsageLimits();

  // Determine if we should show expiry banner
  // Show if: subscription is active, not free, and (expiring within 7 days OR in grace period)
  const shouldShowExpiryBanner = !isPastDue &&
    userProfile?.subscription?.status === 'active' &&
    userProfile?.subscription?.planKey !== 'free' &&
    timeAccess &&
    ((timeAccess.daysRemaining !== undefined && timeAccess.daysRemaining <= 7) ||
      (timeAccess.isInGracePeriod === true));

  return (
    <div className="dashboard-page space-y-4 pb-0">
      {/* Page Header */}
      <PageHeader
        title={`Hello, ${userProfile?.firstName || getUserDisplayName(userProfile)}`}
        description="Welcome back! Here's your career progress overview."
        user={{
          name: getUserDisplayName(userProfile),
          email: getUserEmail(userProfile),
          username: userProfile?.username || '',
          profilePhoto: getUserAvatar(userProfile),
          designation: userProfile?.role || '',
          subscription: userProfile?.subscription
        }}
        showSettings={true}
        onMobileMenuToggle={toggleSidebar}
        isMobileMenuOpen={isMobileMenuOpen}
      />

      {/* Payment Past Due Banner */}
      {isPastDue && (
        <PaymentPastDueBanner
          amount={userProfile?.subscription?.purchasePrice}
          currency={userProfile?.subscription?.purchaseCurrency || 'USD'}
          dueDate={userProfile?.subscription?.endDate}
        />
      )}

      {/* Subscription Expiry Banner */}
      {shouldShowExpiryBanner && timeAccess && usageSubscription && (
        <SubscriptionExpiryBanner
          planKey={usageSubscription.planKey || userProfile?.subscription?.planKey || 'free'}
          expiresAt={timeAccess.expiredAt || usageSubscription.accessExpiresAt || usageSubscription.currentPeriodEnd}
          daysRemaining={timeAccess.daysRemaining}
          hoursRemaining={timeAccess.hoursRemaining}
          isInGracePeriod={timeAccess.isInGracePeriod}
          gracePeriodEndsAt={timeAccess.gracePeriodEndsAt}
        />
      )}

      {/* First Row: CV Management, Recent Jobs, and Application Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex w-full min-h-[320px]">
          <CVManagementSection
            cvHealthScore={cvHealthScore}
            cvs={cvs}
            drafts={drafts}
            onImproveScore={() => router.push('/resume-score')}
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
            onAddJob={() => router.push('/dashboard/jobs?tab=applications&newJob=1')}
            onWriteCoverLetter={() => router.push('/dashboard/jobs?tab=applications')}
            onCreateCoverLetter={() => router.push('/dashboard/jobs?tab=applications')}
            onCreateJob={() => router.push('/dashboard/jobs?tab=applications&newJob=1')}
            onSetMasterCV={handleSetMasterCV}
            predictions={analyticsData?.predictions}
            onUpdateGoal={handleUpdateMonthlyGoal}
            userId={userId ?? undefined}
            jobs={jobs}
          />
        </div>
        <div className="flex w-full min-h-[320px]">
          <RecentJobsWidget
            jobs={jobs}
            onViewJob={(jobId) => router.push(`/dashboard/jobs?tab=applications&jobId=${jobId}`)}
            onCreateJob={() => router.push('/dashboard/jobs?tab=applications&newJob=1')}
            analyticsData={analyticsData}
          />
        </div>
        <div className="flex w-full min-h-[320px]">
          <ApplicationCalendarWidget jobs={jobs} />
        </div>
      </div>

      {/* Second Row: Progress Tracking and Application Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">
        <div className="lg:col-span-7 min-h-[360px] h-full">
          {/* Always render widget; it will use mock data until userId is ready */}
          <ProgressTrackingWidget userId={userId || ''} />
        </div>
        <div className="lg:col-span-3 min-h-[360px] h-full">
          {/* Always render widget; it will show mock/fallback if needed */}
          <ApplicationStatsWidget userId={userId || ''} />
        </div>
      </div>


      {/* Third Row: Performance Insights Container */}
      <div className="flex flex-col gap-4 min-h-[400px]">
        {/* Performance Insights - Full Width */}
        <PerformanceInsights
          analyticsData={analyticsData}
          jobs={jobs}
          cvs={cvs}
          selectedPeriod={selectedPeriod}
          onPeriodChange={setSelectedPeriod}
        />
      </div>

      {/* Enhanced Payment Modal */}
      <UniversalPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        preselectedPlanKey={selectedPlanKey ?? undefined}
        onSuccess={(subscription) => {
          console.log('Payment successful:', subscription);
          setShowPaymentModal(false);
          // Optionally refresh the page or show success message
          // Avoid full reload; navigate to dashboard to refresh data client-side
          router.replace('/dashboard');
        }}
        returnUrl="/dashboard"
        triggerContext="landing-page-plan-selection"
      />

    </div>
  );
};

export default Analytics;
