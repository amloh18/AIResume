'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, useScroll, useTransform } from 'framer-motion';
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

import { 
  ApplicationCalendarWidget, 
  IntelligenceDashboard 
} from '@/components/dashboard/Analytics';
import GlobalSearchBar from '@/components/layout/GlobalSearchBar';

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
  const { cvs, jobs, coverLetters, analytics } = useDashboardData();
  const userId = getUserIdForAPI(user);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll({ container: scrollRef });

  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setHasScrolled(latest > 10);
    });
  }, [scrollY]);

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
  const circumference = 2 * Math.PI * 44;
  const strokeDashoffset = circumference * (1 - cvHealthScore / 100);

  return (
    <div ref={scrollRef} className="h-full flex flex-col space-y-6 p-4 md:p-6 overflow-y-auto pb-24 overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {/* 1st Section: Full Width Greeting Block */}
      <div 
        className="w-full bg-white dark:bg-[#111317] shadow-sm border border-gray-100 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 relative"
      >
        <div className="flex-1 flex flex-col justify-center min-w-0">
          <h1 className="font-black text-gray-900 dark:text-white leading-tight tracking-tight text-3xl lg:text-4xl mb-2">
            {getGreeting()},<br />{getUserDisplayName(userData)}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-base lg:text-lg mt-2">
            Here is your career overview.
          </p>
        </div>
        
        <div className="flex items-center gap-4 md:gap-8 flex-col md:flex-row items-end md:items-center w-full md:w-auto mt-4 md:mt-0">
          <div className="flex flex-col items-center shrink-0">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 mb-3">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200 dark:text-white/10" />
                <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="8" fill="none"
                  strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
                  className={`${status.stroke} transition-all duration-1000 ease-out`} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-black text-gray-900 dark:text-white text-xl lg:text-2xl">{cvHealthScore}%</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-gray-500 dark:text-gray-400 font-bold text-[10px] lg:text-xs text-center uppercase tracking-widest">Master CV</p>
              <p className={`text-[10px] lg:text-xs font-black text-center mt-0.5 ${status.color}`}>{status.label}</p>
            </div>
          </div>

          <div className="absolute top-6 right-6 md:relative md:top-auto md:right-auto shrink-0">
            <GlobalSearchBar />
          </div>
        </div>
      </div>

      {/* Hub Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative z-10">
          
          {/* CV Editor */}
          <Link href="/editor">
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 transition-all flex flex-col h-full relative group hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">CV Editor</span>
                <div className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                  <FileText size={14} className="mr-1.5" /> <span className="hidden sm:inline">Open</span>
                </div>
              </div>
              
              <div className="mb-5 flex items-end gap-3">
                <h2 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                  {cvs?.length || 0}
                </h2>
                <span className="text-xs font-medium text-lime-600 dark:text-lime-400 mb-1 flex items-center">
                  ↑ Active
                </span>
              </div>
              
              <div className="flex-1 space-y-2 relative z-10 w-full">
                {cvs?.slice(0, 2).map((cv: any) => (
                  <div key={cv.id || cv._id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-transparent group-hover:border-blue-500/10 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{cv.title || 'Untitled CV'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">{cv.metadata?.isMaster ? 'Master CV' : 'Targeted CV'}</p>
                    </div>
                  </div>
                ))}
                {(!cvs || cvs.length === 0) && (
                  <div className="text-xs text-gray-400 italic py-2">No CVs yet. Create one!</div>
                )}
              </div>
            </motion.div>
          </Link>

          {/* Job Tracker */}
          <Link href="/dashboard/tracker">
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-blue-600 text-white rounded-3xl p-6 shadow-xl shadow-blue-600/30 transition-all flex flex-col h-full relative group hover:shadow-2xl hover:shadow-blue-600/40 overflow-hidden"
            >
              <div className="absolute -inset-24 bg-gradient-to-tr from-blue-700 to-transparent opacity-50 pointer-events-none rounded-full blur-3xl"></div>
              
              <div className="flex items-center justify-between mb-4 relative z-10">
                <span className="text-sm font-semibold text-blue-100">Job Tracker</span>
                <div className="flex items-center px-3 py-1.5 bg-blue-500/30 backdrop-blur-md rounded-full text-xs font-medium text-white border border-blue-400/20">
                  <Briefcase size={14} className="mr-1.5" /> <span className="hidden sm:inline">Track</span>
                </div>
              </div>
              
              <div className="mb-5 flex items-end gap-3 relative z-10">
                <h2 className="text-5xl font-black tracking-tighter text-white leading-none">
                  {jobs?.length || 0}
                </h2>
                <span className="text-xs font-medium text-lime-300 mb-1 flex items-center">
                  ↑ Saved
                </span>
              </div>
              
              <div className="flex-1 space-y-2 relative z-10 w-full">
                {jobs?.slice(0, 2).map((job: any) => (
                  <div key={job.id || job._id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)] flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{job.jobTitle || job.title || 'Untitled Role'}</p>
                      <p className="text-[10px] text-blue-200 truncate mt-0.5">{job.company || 'Unknown Company'}</p>
                    </div>
                  </div>
                ))}
                {(!jobs || jobs.length === 0) && (
                  <div className="text-xs text-blue-200/70 italic py-2">No saved jobs. Add one!</div>
                )}
              </div>
            </motion.div>
          </Link>

          {/* Doc Center */}
          <Link href="/dashboard/canvas">
            <motion.div 
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-[#111317] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-white/5 transition-all flex flex-col h-full relative group hover:shadow-md"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">Doc Center</span>
                <div className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300">
                  <LayoutDashboard size={14} className="mr-1.5" /> <span className="hidden sm:inline">Docs</span>
                </div>
              </div>
              
              <div className="mb-5 flex items-end gap-3">
                <h2 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
                  {coverLetters?.length || 0}
                </h2>
                <span className="text-xs font-medium text-lime-600 dark:text-lime-400 mb-1 flex items-center">
                  ↑ Stored
                </span>
              </div>
              
              <div className="flex-1 space-y-2 relative z-10 w-full">
                {coverLetters?.slice(0, 2).map((doc: any) => (
                  <div key={doc.id || doc._id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-transparent group-hover:border-purple-500/10 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-500 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{doc.title || doc.jobTitle || 'Cover Letter'}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">Cover Letter</p>
                    </div>
                  </div>
                ))}
                {(!coverLetters || coverLetters.length === 0) && (
                  <div className="text-xs text-gray-400 italic py-2">No documents yet.</div>
                )}
              </div>
            </motion.div>
          </Link>

        </div>

      <div className="flex flex-col space-y-6 w-full relative z-10">
      {/* Middle Row: Progress & Stats Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-7 min-h-[300px] h-full">
          <ProgressTrackingWidget userId={userId || ''} />
        </div>
        <div className="lg:col-span-3 min-h-[300px] h-full">
          <ApplicationStatsWidget userId={userId || ''} />
        </div>
      </div>

      {/* Legacy Widgets Row: Calendar & Intelligence */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        <div className="lg:col-span-3 min-h-[300px]">
          <ApplicationCalendarWidget jobs={jobs || []} />
        </div>
        <div className="lg:col-span-7 min-h-[300px]">
          <IntelligenceDashboard 
            predictions={analytics?.predictions || { monthlyGoal: 20, projectedApplications: jobs?.length || 0 }} 
            marketIntelligence={analytics?.marketIntelligence || { score: 85, trend: 'up' }} 
            jobs={jobs || []} 
            cvs={cvs || []} 
            userAvatar={userData?.image} 
          />
        </div>
      </div>

      {/* Bottom Row: Secondary Hub */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LinkedIn Enhancer */}
        <Link href="/linkedin-enhancer">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white dark:bg-[#111317] rounded-3xl p-6 cursor-pointer shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-md hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all flex items-center gap-5"
          >
            <div className="w-14 h-14 bg-[#0077b5]/10 rounded-xl flex items-center justify-center flex-shrink-0 text-[#0077b5]">
              <Linkedin size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">LinkedIn Enhancer</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Optimize your profile for recruiters and search algorithms.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-500">
              <ChevronRight size={18} />
            </div>
          </motion.div>
        </Link>

        {/* Interview Coach */}
        <Link href="/dashboard/interview">
          <motion.div 
            whileHover={{ scale: 1.01 }}
            className="bg-white dark:bg-[#111317] rounded-3xl p-6 cursor-pointer shadow-sm border border-gray-100 dark:border-white/5 hover:shadow-md hover:border-orange-500/50 dark:hover:border-orange-500/50 transition-all flex items-center gap-5"
          >
            <div className="w-14 h-14 bg-orange-500/10 rounded-xl flex items-center justify-center flex-shrink-0 text-orange-500">
              <Presentation size={28} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Interview Coach</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Practice with AI and get real-time feedback on your answers.</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-500">
              <ChevronRight size={18} />
            </div>
          </motion.div>
        </Link>

      </div>
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
