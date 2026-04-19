'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  LayoutDashboard, 
  Linkedin, 
  Presentation, 
  ChevronRight 
} from 'lucide-react';
import { useUnifiedAuth, getUserIdForAPI } from '@/lib/hooks/useUnifiedAuth';
import { useUserData, getUserDisplayName } from '@/lib/hooks/useUserData';
import { useDashboardData } from '@/contexts/DashboardDataContext';

const ProgressTrackingWidget = dynamic(() => import('@/components/dashboard/ProgressTrackingWidget'), { ssr: false });
const ApplicationStatsWidget = dynamic(() => import('@/components/dashboard/ApplicationStatsWidget'), { ssr: false });

// Helper for CV Health Score
const calculateCompletionPercentage = (cv: any): number => {
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
    work.slice(0, maxEntries).forEach(entry => {
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
    education.slice(0, maxEntries).forEach(entry => {
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
    skills.slice(0, maxSkills).forEach(skill => {
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
    projects.slice(0, maxProjects).forEach(project => {
      let projectScore = 0;
      let maxProjectScore = 3;
      if (project.name?.trim()) projectScore += 1;
      if (project.description?.trim()) projectScore += 1;
      if (project.url?.trim()) projectScore += 1;
      totalScore += (projectScore / maxProjectScore) * 100;
    });
    return Math.min(100, totalScore / Math.min(projects.length, maxProjects));
  };

  if (cv.cvData?.basics) {
    totalScore += (calculatePersonalInfoScore(cv.cvData.basics) * sectionWeights.personalInfo) / 100;
  }
  maxScore += sectionWeights.personalInfo;

  if (cv.cvData?.work) {
    totalScore += (calculateExperienceScore(cv.cvData.work) * sectionWeights.experience) / 100;
  }
  maxScore += sectionWeights.experience;

  if (cv.cvData?.education) {
    totalScore += (calculateEducationScore(cv.cvData.education) * sectionWeights.education) / 100;
  }
  maxScore += sectionWeights.education;

  if (cv.cvData?.skills) {
    totalScore += (calculateSkillsScore(cv.cvData.skills) * sectionWeights.skills) / 100;
  }
  maxScore += sectionWeights.skills;

  if (cv.cvData?.projects) {
    totalScore += (calculateProjectsScore(cv.cvData.projects) * sectionWeights.projects) / 100;
  }
  maxScore += sectionWeights.projects;

  const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  return Math.max(0, Math.min(100, completionPercentage));
};

function DashboardContent() {
  const router = useRouter();
  const { user } = useUnifiedAuth();
  const { userData } = useUserData();
  const { cvs } = useDashboardData();
  const userId = getUserIdForAPI(user);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const calculateCVHealthScore = () => {
    const masterCV = cvs?.find((cv: any) => {
      return cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.isMaster === 'true';
    });
    if (!masterCV) return 0;
    return calculateCompletionPercentage(masterCV);
  };

  const cvHealthScore = calculateCVHealthScore();

  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400', stroke: 'stroke-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400', stroke: 'stroke-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400', stroke: 'stroke-red-400' };
  };

  const status = getStatus(cvHealthScore);
  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference * (1 - cvHealthScore / 100);

  return (
    <div className="h-full flex flex-col space-y-6 p-4 md:p-6 overflow-y-auto pb-24">
      {/* Top Row: Z-Pattern Start - Greeting & Primary Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Top-Left: Greeting & Resume Health Score */}
        <div className="lg:col-span-4 glass-widget-premium rounded-xl p-6 flex flex-col items-center text-center justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-lime-400 to-lime-600"></div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            {getGreeting()}, {getUserDisplayName(userData)}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">Here is your career overview.</p>
          
          <div className="relative w-28 h-28 mb-3">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-white/10" />
              <circle cx="50" cy="50" r="36" stroke="currentColor" strokeWidth="8" fill="none"
                strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                className={`${status.stroke} transition-all duration-1000 ease-out`} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{cvHealthScore}%</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-gray-600 dark:text-white/60 font-medium text-sm">Master CV Health</p>
          </div>
          <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
        </div>

        {/* Top-Right: Primary Hub (3 Cards) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* CV Editor */}
          <Link href="/editor" passHref legacyBehavior>
            <motion.a 
              whileHover={{ y: -4 }}
              className="glass-card-premium rounded-xl p-5 cursor-pointer border border-transparent hover:border-lime-500/30 transition-all flex flex-col h-full relative overflow-hidden group bg-white/5 dark:bg-white/5"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                <FileText size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">CV Editor</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm flex-1">Create and tailor your professional resumes.</p>
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                Open Editor <ChevronRight size={16} className="ml-1" />
              </div>
            </motion.a>
          </Link>

          {/* Job Tracker */}
          <Link href="/dashboard/tracker" passHref legacyBehavior>
            <motion.a 
              whileHover={{ y: -4 }}
              className="glass-card-premium rounded-xl p-5 cursor-pointer border border-transparent hover:border-lime-500/30 transition-all flex flex-col h-full relative overflow-hidden group bg-white/5 dark:bg-white/5"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-lime-500/10 rounded-full blur-2xl group-hover:bg-lime-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-lime-100 dark:bg-lime-900/30 rounded-lg flex items-center justify-center mb-4 text-lime-600 dark:text-lime-400">
                <Briefcase size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Job Tracker</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm flex-1">Manage applications and monitor your pipeline.</p>
              <div className="mt-4 flex items-center text-lime-600 dark:text-lime-400 text-sm font-medium">
                View Tracker <ChevronRight size={16} className="ml-1" />
              </div>
            </motion.a>
          </Link>

          {/* Doc Center */}
          <Link href="/dashboard/canvas" passHref legacyBehavior>
            <motion.a 
              whileHover={{ y: -4 }}
              className="glass-card-premium rounded-xl p-5 cursor-pointer border border-transparent hover:border-lime-500/30 transition-all flex flex-col h-full relative overflow-hidden group bg-white/5 dark:bg-white/5"
            >
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Doc Center</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm flex-1">Organize cover letters and career documents.</p>
              <div className="mt-4 flex items-center text-purple-600 dark:text-purple-400 text-sm font-medium">
                Go to Docs <ChevronRight size={16} className="ml-1" />
              </div>
            </motion.a>
          </Link>

        </div>
      </div>

      {/* Middle Row: Progress & Stats Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7 min-h-[360px] h-full">
          <ProgressTrackingWidget userId={userId || ''} />
        </div>
        <div className="lg:col-span-3 min-h-[360px] h-full">
          <ApplicationStatsWidget userId={userId || ''} />
        </div>
      </div>

      {/* Bottom Row: Secondary Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LinkedIn Enhancer */}
        <Link href="/dashboard/linkedin" passHref legacyBehavior>
          <motion.a 
            whileHover={{ scale: 1.01 }}
            className="glass-card-premium rounded-xl p-6 cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-blue-500/50 transition-all flex items-center gap-5 bg-white/5 dark:bg-white/5"
          >
            <div className="w-14 h-14 bg-[#0077b5]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#0077b5]">
              <Linkedin size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">LinkedIn Enhancer</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Optimize your profile for recruiters and search algorithms.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <ChevronRight size={18} />
            </div>
          </motion.a>
        </Link>

        {/* Interview Coach */}
        <Link href="/dashboard/interview" passHref legacyBehavior>
          <motion.a 
            whileHover={{ scale: 1.01 }}
            className="glass-card-premium rounded-xl p-6 cursor-pointer border border-gray-200 dark:border-gray-800 hover:border-orange-500/50 transition-all flex items-center gap-5 bg-white/5 dark:bg-white/5"
          >
            <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0 text-orange-500">
              <Presentation size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Interview Coach</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Practice with AI and get real-time feedback on your answers.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
              <ChevronRight size={18} />
            </div>
          </motion.a>
        </Link>

      </div>
    </div>
  );
}

const DashboardPage: React.FC = () => {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-500"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
};

export default DashboardPage;