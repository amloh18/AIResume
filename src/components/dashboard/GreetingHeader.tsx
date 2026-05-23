'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserData } from '@/lib/hooks/useUserData';
import { DashboardDataContext } from '@/contexts/DashboardDataContext';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { useMobileSidebar } from '@/contexts/MobileSidebarContext';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';
import NotificationCenter from '@/components/notifications/NotificationCenter';
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
  const dashboardContext = React.useContext(DashboardDataContext);
  const cvs = dashboardContext?.cvs || [];
  const jobs = dashboardContext?.jobs || [];
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
      const hasLinkedIn = userData?.settings?.linkedinConnected || false;
      totalScore += hasLinkedIn ? 25 : 0;
      maxScore += 25;

      // 3. Skills (20% weight)
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

  const renderProfileRing = (sizeClass: string) => (
    <div className={cn("relative shrink-0", sizeClass)}>
      {/* Glow effect */}
      <div className={cn(
        "absolute -inset-1 rounded-full blur-lg opacity-20",
        ringColors.glow
      )} />
      
      {/* SVG Ring */}
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" className={isDark ? 'text-white/10' : 'text-gray-200'} />
        <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={cn(ringColors.stroke, "transition-all duration-1000 ease-out")} strokeLinecap="round" />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-black leading-tight", sizeClass.includes('h-12') ? 'text-xs' : 'text-lg')}>
          {profileStrength}%
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full pt-4 sm:pt-10 pb-3 md:pb-4 flex flex-col gap-5 sm:gap-8">
      {/* 1. TOP BAR (Mobile): Menu Button (Left) | Search & Notif (Right) */}
      <div className="lg:hidden flex items-center justify-between px-1">
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 rounded-xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 shadow-sm"
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-0 shrink-0">
           <div className="w-36 xxs:w-44 xs:w-52">
              <GlobalSearchBar />
           </div>
           <NotificationCenter />
        </div>
      </div>

      {/* 2. GREETING ROW: Text (Left) | Score Ring (Right - Inline) */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 md:gap-6">
        {/* Left Section: Branding & Profile Strength (Inline on Mobile) */}
        <div className="flex items-center lg:items-start justify-between lg:justify-start lg:gap-8 flex-1 min-w-0">
          <div className="flex-1 flex flex-col justify-center min-w-0">
            <h1 className="font-black text-gray-900 dark:text-white leading-tight tracking-tight text-xl xs:text-2xl sm:text-3xl lg:text-4xl mb-0.5 md:mb-2 italic uppercase">
              {getGreeting()}, {getUserDisplayName()}!
            </h1>
            <div className="h-5 md:h-6 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentSubtitleIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="text-gray-500 dark:text-gray-400 font-medium text-[11px] xs:text-xs sm:text-sm md:text-base lg:text-lg mt-0.5 md:mt-1 leading-snug"
                >
                  {CONTEXT_SUBTITLES[currentSubtitleIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Profile Ring - Mobile Only Inline */}
          <div className="lg:hidden flex shrink-0 ml-4 items-center gap-3">
             <div className="hidden xxs:flex flex-col items-end text-right">
                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Strength</p>
                <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse mt-0.5", ringColors.stroke.replace('stroke', 'bg'))} />
             </div>
             {renderProfileRing('w-12 h-12 xs:w-14 xs:h-14')}
          </div>
        </div>

        {/* Right Section: Controls & Ring (Desktop Only) */}
        <div className="hidden lg:flex flex-row items-center gap-8 shrink-0">
          {/* Desktop Search & Notif */}
          <div className="flex items-center gap-0">
            <div className="w-64">
              <GlobalSearchBar />
            </div>
            <NotificationCenter />
          </div>

          {/* Desktop Profile Strength */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="flex flex-col items-end text-right">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                Profile Strength
              </p>
              <p className={cn(
                "text-sm font-black mt-0.5",
                ringColors.bg
              )}>
                {profileStrength >= 80 ? 'Excellent' : profileStrength >= 60 ? 'Good' : 'Needs Work'}
              </p>
            </div>
            {renderProfileRing('w-[72px] h-[72px]')}
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate CV health score
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
