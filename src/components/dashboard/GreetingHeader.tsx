'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserData } from '@/lib/hooks/useUserData';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import { cn } from '@/lib/utils';

// Subtitles that rotate based on user context
const CONTEXT_SUBTITLES = [
  "You're 3 applications away from your weekly goal",
  "2 interviews scheduled this week",
  "Your CV match rate improved 12%",
  "New job recommendations available",
  "Add 1 more skill to boost your profile by 5%",
  "Your profile is 85% complete",
  "3 jobs match your profile perfectly",
];

export default function GreetingHeader() {
  const { userData } = useUserData();
  const { cvs, jobs } = useDashboardData();
  const { isDark } = useTheme();
  const { toggleSidebar } = useMobileSidebar();
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState(0);
  const [profileStrength, setProfileStrength] = useState(0);

  // Profile strength calculation
  useEffect(() => {
    const calculateProfileStrength = () => {
      let totalScore = 0;
      let maxScore = 0;

      // 1. CV Completeness (40% weight)
      if (cvs && cvs.length > 0) {
        const masterCV = cvs.find((cv: any) => 
          cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.isMaster === 'true'
        );
        if (masterCV) {
          const cvScore = calculateCVHealthScore(masterCV);
          totalScore += cvScore * 0.4;
        }
        maxScore += 0.4;
      } else {
        maxScore += 0.4;
      }

      // 2. LinkedIn Sync (25% weight)
      // Check if user has connected LinkedIn
      const hasLinkedIn = userData?.settings?.linkedinConnected || false;
      totalScore += hasLinkedIn ? 25 : 0;
      maxScore += 25;

      // 3. Skills (20% weight)
      // Count unique skills across CVs
      if (cvs && cvs.length > 0) {
        const allSkills = new Set<string>();
        cvs.forEach((cv: any) => {
          const skills = cv.cvData?.skills || [];
          skills.forEach((skill: any) => {
            if (typeof skill === 'string') {
              allSkills.add(skill);
            } else if (skill.name) {
              allSkills.add(skill.name);
            }
          });
        });
        const skillCount = allSkills.size;
        // 10+ skills = full score, linear scaling
        const skillScore = Math.min(100, (skillCount / 10) * 100);
        totalScore += skillScore * 0.2;
      }
      maxScore += 0.2;

      // 4. Projects (10% weight)
      if (cvs && cvs.length > 0) {
        const masterCV = cvs.find((cv: any) => 
          cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.isMaster === 'true'
        );
        if (masterCV?.cvData?.projects?.length > 0) {
          totalScore += 10;
        }
        maxScore += 10;
      } else {
        maxScore += 10;
      }

      // 5. ATS Optimization (5% weight)
      // Check if user has run ATS scan
      const hasATSReport = userData?.settings?.lastAtsScanDate || false;
      totalScore += hasATSReport ? 5 : 0;
      maxScore += 5;

      const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
      setProfileStrength(finalScore);
    };

    calculateProfileStrength();
  }, [cvs, userData]);

  // Rotate subtitles every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSubtitleIndex((prev) => (prev + 1) % CONTEXT_SUBTITLES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getUserDisplayName = () => {
    if (!userData) return 'there';
    const { firstName, lastName } = userData;
    if (firstName && lastName) return `${firstName} ${lastName}`;
    if (firstName) return firstName;
    return userData.username || 'there';
  };

  const getProfileRingColor = (score: number) => {
    if (score >= 80) return { stroke: 'stroke-emerald-500', bg: 'text-emerald-500', glow: 'shadow-emerald-500/50' };
    if (score >= 60) return { stroke: 'stroke-amber-500', bg: 'text-amber-500', glow: 'shadow-amber-500/50' };
    return { stroke: 'stroke-rose-500', bg: 'text-rose-500', glow: 'shadow-rose-500/50' };
  };

  const ringColors = getProfileRingColor(profileStrength);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - profileStrength / 100);

  return (
    <div className="w-full py-3 md:py-4 flex flex-col">
      {/* Mobile menu button - visible only on mobile */}
      <div className="lg:hidden flex items-center justify-between mb-3 px-1">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 md:gap-6">
        {/* Left: Greeting */}
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h1 className="font-black text-gray-900 dark:text-white leading-tight tracking-tight text-2xl sm:text-3xl lg:text-4xl mb-1 md:mb-2">
            {getGreeting()}, {getUserDisplayName()}!
          </h1>
          <div className="h-5 md:h-6">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentSubtitleIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-gray-500 dark:text-gray-400 font-medium text-xs sm:text-sm md:text-base lg:text-lg mt-0.5 md:mt-1"
              >
                {CONTEXT_SUBTITLES[currentSubtitleIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Search & Profile Ring */}
        <div className="flex flex-row sm:flex-row items-center gap-2 sm:gap-3 md:gap-4 shrink-0">
          {/* Search & Notifications */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-36 sm:w-44 md:w-52 lg:w-64">
              <GlobalSearchBar />
            </div>
            {/* Notification placeholder */}
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
              <Sparkles size={16} className="text-gray-500 dark:text-gray-400 sm:w-5 sm:h-5" />
            </div>
          </div>

          {/* Profile Strength Section - Compact on mobile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:flex flex-col items-end text-right">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Profile Strength
              </p>
              <p className={cn(
                "text-xs sm:text-sm font-black mt-0.5",
                ringColors.bg
              )}>
                {profileStrength >= 80 ? 'Excellent' : profileStrength >= 60 ? 'Good' : 'Needs Work'}
              </p>
            </div>

            <div className="relative w-12 h-12 sm:w-[70px] sm:h-[70px]">
              {/* Glow effect */}
              <div className={cn(
                "absolute -inset-1.5 sm:-inset-2 rounded-full blur-md sm:blur-xl opacity-30",
                ringColors.glow,
                isDark ? 'opacity-20' : 'opacity-30'
              )} />
              
              {/* SVG Ring */}
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className={cn(
                    isDark ? 'text-white/10' : 'text-gray-200'
                  )}
                />
                {/* Progress ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(
                    ringColors.stroke,
                    "transition-all duration-1000 ease-out"
                  )}
                  strokeLinecap="round"
                />
              </svg>
              
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn(
                  "font-black text-xs sm:text-lg leading-tight",
                  ringColors.bg
                )}>
                  {profileStrength}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate CV health score (same as existing logic)
function calculateCVHealthScore(cv: any): number {
  if (!cv) return 0;
  if (cv.status === 'published') return 100;
  if (cv.status === 'archived') return 0;

  let totalScore = 0;
  let maxScore = 0;

  const sectionWeights = { personalInfo: 25, experience: 30, education: 20, skills: 15, projects: 10 };

  const calculatePersonalInfoScore = (basics: any): number => {
    let score = 0;
    let max = 5;
    if (basics?.name?.trim()) score++;
    if (basics?.email?.trim()) score++;
    if (basics?.phone?.trim()) score++;
    if (basics?.location?.city || basics?.location?.address) score++;
    if (basics?.summary?.trim()) score++;
    return (score / max) * 100;
  };
  
  const calculateExperienceScore = (work: any[]): number => {
    if (!Array.isArray(work) || work.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 3;
    work.slice(0, maxEntries).forEach((entry: any) => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.name?.trim() || entry.company?.trim()) entryScore += 1;
      if (entry.position?.trim() || entry.title?.trim()) entryScore += 1;
      if (entry.startDate?.trim()) entryScore += 1;
      if (entry.summary?.trim() || entry.highlights?.length > 0) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(work.length, maxEntries));
  };
  
  const calculateEducationScore = (education: any[]): number => {
    if (!Array.isArray(education) || education.length === 0) return 0;
    let totalScore = 0;
    const maxEntries = 2;
    education.slice(0, maxEntries).forEach((entry: any) => {
      let entryScore = 0;
      let maxEntryScore = 4;
      if (entry.institution?.trim()) entryScore += 1;
      if (entry.area?.trim()) entryScore += 1;
      if (entry.studyType?.trim()) entryScore += 1;
      if (entry.startDate?.trim()) entryScore += 1;
      totalScore += (entryScore / maxEntryScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(education.length, maxEntries));
  };
  
  const calculateSkillsScore = (skills: any[]): number => {
    if (!Array.isArray(skills) || skills.length === 0) return 0;
    let totalScore = 0;
    const maxSkills = 5;
    skills.slice(0, maxSkills).forEach((skill: any) => {
      let skillScore = 0;
      let maxSkillScore = 2;
      if (skill.name?.trim() || typeof skill === 'string') skillScore += 1;
      if (skill.keywords?.length > 0 || skill.skills?.length > 0) skillScore += 1;
      totalScore += (skillScore / maxSkillScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(skills.length, maxSkills));
  };
  
  const calculateProjectsScore = (projects: any[]): number => {
    if (!Array.isArray(projects) || projects.length === 0) return 0;
    let totalScore = 0;
    const maxProjects = 2;
    projects.slice(0, maxProjects).forEach((project: any) => {
      let projectScore = 0;
      let maxProjectScore = 3;
      if (project.name?.trim()) projectScore += 1;
      if (project.description?.trim()) projectScore += 1;
      if (project.url?.trim()) projectScore += 1;
      totalScore += (projectScore / maxProjectScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
  };

  const cvData = cv.cvData;
  if (cvData?.basics) {
    totalScore += (calculatePersonalInfoScore(cvData.basics) * sectionWeights.personalInfo) / 100;
    maxScore += sectionWeights.personalInfo;
  }

  if (cvData?.work) {
    totalScore += (calculateExperienceScore(cvData.work) * sectionWeights.experience) / 100;
    maxScore += sectionWeights.experience;
  }

  if (cvData?.education) {
    totalScore += (calculateEducationScore(cvData.education) * sectionWeights.education) / 100;
    maxScore += sectionWeights.education;
  }

  if (cvData?.skills) {
    totalScore += (calculateSkillsScore(cvData.skills) * sectionWeights.skills) / 100;
    maxScore += sectionWeights.skills;
  }

  if (cvData?.projects) {
    totalScore += (calculateProjectsScore(cvData.projects) * sectionWeights.projects) / 100;
    maxScore += sectionWeights.projects;
  }

  const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return Math.max(0, Math.min(100, completionPercentage));
}
