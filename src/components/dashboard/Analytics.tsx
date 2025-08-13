'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Briefcase, 
  PenTool, 
  Archive, 
  MessageSquare, 
  BarChart3,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Target,
  Sparkles,
  Zap,
  Lightbulb,
  BookOpen,
  Users,
  Star,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Eye,
  Download,
  Share2,
  Settings,
  Bell,
  Search,
  Filter,
  MoreVertical,
  ExternalLink,
  Heart,
  Award,
  Trophy,
  Crown,
  Brain,
  Bot,
  Wand2,
  Palette,
  Layers,
  Grid3X3,
  Maximize2,
  Minimize2,
  Activity,
  CalendarDays,
  TrendingDown,
  Play,
  Pause,
  RefreshCw,
  Bookmark,
  FolderOpen,
  FilePlus,
  UserCheck,
  Target as TargetIcon,
  Brain as BrainIcon,
  Zap as ZapIcon,
  Trash2,
  MapPin
} from 'lucide-react';
import { useSession } from 'next-auth/react';

// KPI Widget Component
const KPIWidget: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  color: string; 
  change?: string;
  period?: string;
}> = ({ title, value, icon, color, change, period }) => (
  <motion.div
    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
    whileHover={{ y: -2, scale: 1.02 }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className={`p-2 rounded-lg ${color}`}>
        {icon}
      </div>
      {change && (
        <span className={`text-xs font-medium ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
          {change}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-white/60 text-sm">{title}</div>
    {period && (
      <div className="text-white/40 text-xs mt-1">{period}</div>
    )}
  </motion.div>
);

// Period Selector Component
const PeriodSelector: React.FC<{ 
  selectedPeriod: string; 
  onPeriodChange: (period: string) => void 
}> = ({ selectedPeriod, onPeriodChange }) => (
  <div className="flex items-center gap-2 mb-4">
    <span className="text-white/60 text-sm">Period:</span>
    {['Day', 'Week', 'Month'].map((period) => (
      <motion.button
        key={period}
        onClick={() => onPeriodChange(period.toLowerCase())}
        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
          selectedPeriod === period.toLowerCase()
            ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
            : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {period}
      </motion.button>
    ))}
  </div>
);

// Draft Card Component
const DraftCard: React.FC<{
  type: 'cv' | 'cover_letter';
  title: string;
  progress: number;
  lastEdited: Date;
  onResume: () => void;
  onPreview: () => void;
  onDiscard: () => void;
  cvData?: any;
}> = ({ type, title, progress, lastEdited, onResume, onPreview, onDiscard, cvData }) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-400';
    if (progress >= 60) return 'bg-yellow-400';
    if (progress >= 40) return 'bg-orange-400';
    return 'bg-red-400';
  };

  const getProgressText = (progress: number) => {
    if (progress >= 80) return 'Almost complete';
    if (progress >= 60) return 'Good progress';
    if (progress >= 40) return 'Getting there';
    return 'Just started';
  };

  return (
  <motion.div
    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300"
    whileHover={{ y: -2, scale: 1.02 }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${
          type === 'cv' ? 'bg-lime-400/20' : 'bg-blue-400/20'
        }`}>
          {type === 'cv' ? (
            <FileText size={16} className="text-lime-400" />
          ) : (
            <PenTool size={16} className="text-blue-400" />
          )}
        </div>
        <div>
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-1 ${
            type === 'cv' ? 'bg-lime-400/20 text-lime-400' : 'bg-blue-400/20 text-blue-400'
          }`}>
            {type === 'cv' ? 'CV' : 'Cover Letter'}
          </div>
          <h4 className="text-white font-medium text-sm">{title}</h4>
          <p className="text-white/40 text-xs">{getProgressText(progress)}</p>
        </div>
      </div>
      <div className="text-white/40 text-xs">
        {lastEdited.toLocaleDateString()}
      </div>
    </div>
    
    <div className="mb-4">
      <div className="flex justify-between text-white/60 text-xs mb-1">
        <span>Progress</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
    
    <div className="flex items-center gap-2">
      <motion.button
        onClick={onResume}
        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 flex items-center gap-1 ${
          type === 'cv' 
            ? 'bg-lime-400/20 text-lime-400 hover:bg-lime-400/30' 
            : 'bg-blue-400/20 text-blue-400 hover:bg-blue-400/30'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Edit size={12} />
        Resume
      </motion.button>
      <motion.button
        onClick={onPreview}
        className="px-3 py-1.5 bg-white/10 text-white/80 rounded-lg text-xs font-medium hover:bg-white/20 transition-all duration-300 flex items-center gap-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Eye size={12} />
        Preview
      </motion.button>
      <motion.button
        onClick={onDiscard}
        className="px-3 py-1.5 bg-red-400/20 text-red-400 rounded-lg text-xs font-medium hover:bg-red-400/30 transition-all duration-300 flex items-center gap-1"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Trash2 size={12} />
        Discard
      </motion.button>
    </div>
  </motion.div>
  );
};

// CV Health Score Component
const CVHealthScore: React.FC<{ score: number }> = ({ score }) => {
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Good', color: 'text-green-400' };
    if (score >= 60) return { label: 'Average', color: 'text-yellow-400' };
    return { label: 'Poor', color: 'text-red-400' };
  };

  const status = getStatus(score);
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-3">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-white/10"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="text-lime-400 transition-all duration-1000"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{score}%</span>
        </div>
      </div>
      <p className="text-white/60 text-sm mb-1">CV Health Score</p>
      <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
      <p className="text-white/40 text-xs mt-1">Based on best practices and completeness</p>
    </div>
  );
};

// Vault Summary Component
const VaultSummary: React.FC<{ counts: { cvs: number; coverLetters: number; jobDescriptions: number; notes: number } }> = ({ counts }) => (
  <div className="space-y-3">
    <h4 className="text-white font-medium text-sm mb-3">My Vault</h4>
    <div className="grid grid-cols-2 gap-3">
      <motion.div
        className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-lg flex items-center justify-center">
            <FileText size={12} className="text-lime-400" />
          </div>
          <span className="text-white font-medium text-xs">CVs</span>
        </div>
        <p className="text-white/60 text-xs">{counts.cvs} documents</p>
      </motion.div>

      <motion.div
        className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-gradient-to-br from-blue-400/20 to-blue-500/20 rounded-lg flex items-center justify-center">
            <PenTool size={12} className="text-blue-400" />
          </div>
          <span className="text-white font-medium text-xs">Cover Letters</span>
        </div>
        <p className="text-white/60 text-xs">{counts.coverLetters} documents</p>
      </motion.div>

      <motion.div
        className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
            <Briefcase size={12} className="text-purple-400" />
          </div>
          <span className="text-white font-medium text-xs">Job Descriptions</span>
        </div>
        <p className="text-white/60 text-xs">{counts.jobDescriptions} saved</p>
      </motion.div>

      <motion.div
        className="p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-all duration-300"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-gradient-to-br from-orange-400/20 to-orange-500/20 rounded-lg flex items-center justify-center">
            <Bookmark size={12} className="text-orange-400" />
          </div>
          <span className="text-white font-medium text-xs">Notes</span>
        </div>
        <p className="text-white/60 text-xs">{counts.notes} items</p>
      </motion.div>
    </div>
  </div>
);

// Interview Calendar Item Component
const InterviewItem: React.FC<{
  company: string;
  role: string;
  stage: string;
  datetime: Date;
  type: string;
  location?: string;
  jobId?: string;
  isMock?: boolean;
}> = ({ company, role, stage, datetime, type, location, jobId, isMock }) => {
  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'interview': return 'bg-orange-400/20 text-orange-400';
      case 'screening': return 'bg-yellow-400/20 text-yellow-400';
      case 'applied': return 'bg-blue-400/20 text-blue-400';
      case 'offer': return 'bg-green-400/20 text-green-400';
      case 'rejected': return 'bg-red-400/20 text-red-400';
      default: return 'bg-blue-400/20 text-blue-400';
    }
  };

  const getTimeUntilInterview = () => {
    const now = new Date();
    const diff = datetime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} away`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} away`;
    return 'Today';
  };

  return (
    <motion.div
      className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-all duration-300"
      whileHover={{ y: -1, scale: 1.02 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h4 className="text-white font-medium text-sm mb-1">{company}</h4>
          <p className="text-white/60 text-xs mb-1">{role}</p>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStageColor(stage)}`}>
              {stage.charAt(0).toUpperCase() + stage.slice(1)}
            </span>
            <span className="text-white/40 text-xs">{type}</span>
            {isMock && (
              <span className="text-white/30 text-xs">• Suggested</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-white/60 text-xs">
            {datetime.toLocaleDateString()}
          </div>
          <div className="text-white/40 text-xs">
            {datetime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {location && (
          <div className="flex items-center gap-1 text-white/40 text-xs">
            <MapPin size={10} />
            {location}
          </div>
        )}
        <div className="text-white/60 text-xs">
          {getTimeUntilInterview()}
        </div>
      </div>
    </motion.div>
  );
};

// AI Job Whisperer Components
const JobTips: React.FC<{ tips: any[] }> = ({ tips }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h4 className="text-white font-medium text-sm flex items-center gap-2">
        <Lightbulb size={14} className="text-yellow-400" />
        Job Tips
      </h4>
      <motion.button
        className="p-1 text-white/60 hover:text-white transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <RefreshCw size={12} />
      </motion.button>
    </div>
    <div className="space-y-2">
      {tips && tips.length > 0 ? (
        tips.map((tip, index) => (
          <div key={index} className="p-2 bg-white/5 rounded-lg border border-white/10">
            <p className="text-white/80 text-xs mb-1">{tip.tip}</p>
            <p className="text-white/40 text-xs">Source: {tip.source}</p>
          </div>
        ))
      ) : (
        <div className="p-2 bg-white/5 rounded-lg border border-white/10">
          <p className="text-white/80 text-xs mb-1">Start by creating your first CV</p>
          <p className="text-white/40 text-xs">Source: CV Circle</p>
        </div>
      )}
    </div>
  </div>
);

const AIGoal: React.FC<{ goal: string; metrics: any }> = ({ goal, metrics }) => (
  <div className="space-y-3">
    <h4 className="text-white font-medium text-sm flex items-center gap-2">
      <TargetIcon size={14} className="text-blue-400" />
      Goal
    </h4>
    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
      <p className="text-white/80 text-xs mb-2">{goal}</p>
      <div className="space-y-1">
        <div className="flex justify-between text-white/60 text-xs">
          <span>CVs per job</span>
          <span>{metrics.cvsPerJob}</span>
        </div>
        <div className="flex justify-between text-white/60 text-xs">
          <span>Cover letter coverage</span>
          <span>{metrics.coverLetterCoverage}%</span>
        </div>
        <div className="flex justify-between text-white/60 text-xs">
          <span>Jobs this week</span>
          <span>{metrics.jobsThisWeek}</span>
        </div>
      </div>
    </div>
    <motion.button
      className="w-full px-3 py-2 bg-gradient-to-r from-blue-400/20 to-blue-500/20 border border-blue-400/30 text-blue-400 rounded-lg font-medium hover:from-blue-400/30 hover:to-blue-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Play size={12} />
      Start now
    </motion.button>
  </div>
);

const KeywordsAnalysis: React.FC<{ strengths: string[]; gaps: string[] }> = ({ strengths, gaps }) => (
  <div className="space-y-3">
    <h4 className="text-white font-medium text-sm flex items-center gap-2">
      <BrainIcon size={14} className="text-purple-400" />
      Keywords
    </h4>
    <div className="space-y-3">
      <div>
        <p className="text-white/60 text-xs mb-2">Strengths</p>
        <div className="flex flex-wrap gap-1">
          {strengths.map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-white/60 text-xs mb-2">Gaps to address</p>
        <div className="flex flex-wrap gap-1">
          {gaps.map((skill, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-red-400/20 text-red-400 text-xs rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
    </div>
    <motion.button
      className="w-full px-3 py-2 bg-gradient-to-r from-purple-400/20 to-purple-500/20 border border-purple-400/30 text-purple-400 rounded-lg font-medium hover:from-purple-400/30 hover:to-purple-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Plus size={12} />
      Add to CV
    </motion.button>
            </div>
  );

const Analytics: React.FC = () => {
  const { data: session } = useSession();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStage, setSelectedStage] = useState('all');

  // CV Completion Calculation Functions
  const calculateCompletionPercentage = (cv: any): number => {
    // If CV is published, it's considered complete
    if (cv.status === 'published') return 100;
    
    // If CV is archived, return 0
    if (cv.status === 'archived') return 0;
    
    // Calculate completion based on CV sections
    let totalScore = 0;
    let maxScore = 0;
    
    // Section weights (total = 100)
    const sectionWeights = {
      personalInfo: 25,    // Name, email, phone, location, summary
      experience: 30,      // Work experience entries
      education: 20,       // Education entries
      skills: 15,          // Skills and competencies
      projects: 10         // Projects and achievements
    };
    
    // Check personal info section
    if (cv.cvData?.basics) {
      const basics = cv.cvData.basics;
      const personalInfoScore = calculatePersonalInfoScore(basics);
      totalScore += (personalInfoScore * sectionWeights.personalInfo) / 100;
    }
    maxScore += sectionWeights.personalInfo;
    
    // Check experience section
    if (cv.cvData?.work) {
      const experienceScore = calculateExperienceScore(cv.cvData.work);
      totalScore += (experienceScore * sectionWeights.experience) / 100;
    }
    maxScore += sectionWeights.experience;
    
    // Check education section
    if (cv.cvData?.education) {
      const educationScore = calculateEducationScore(cv.cvData.education);
      totalScore += (educationScore * sectionWeights.education) / 100;
    }
    maxScore += sectionWeights.education;
    
    // Check skills section
    if (cv.cvData?.skills) {
      const skillsScore = calculateSkillsScore(cv.cvData.skills);
      totalScore += (skillsScore * sectionWeights.skills) / 100;
    }
    maxScore += sectionWeights.skills;
    
    // Check projects section
    if (cv.cvData?.projects) {
      const projectsScore = calculateProjectsScore(cv.cvData.projects);
      totalScore += (projectsScore * sectionWeights.projects) / 100;
    }
    maxScore += sectionWeights.projects;
    
    // Calculate final percentage
    const completionPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // Ensure percentage is between 0 and 100
    return Math.max(0, Math.min(100, completionPercentage));
  };
  
  // Helper functions to calculate section scores
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
    const maxEntries = 3; // Consider up to 3 most recent experiences
    
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
    const maxEntries = 2; // Consider up to 2 most recent education entries
    
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
    const maxSkills = 5; // Consider up to 5 skill categories
    
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
    const maxProjects = 2; // Consider up to 2 most recent projects
    
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

  // Generate drafts from actual CV data
  const [drafts, setDrafts] = useState<any[]>([]);

  // Real interview data from jobs
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      loadData(parsedUser.id || parsedUser._id);
    } else if (session?.user) {
      setUser(session.user);
      loadData(session.user.id);
    }
  }, [session, selectedPeriod]);

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load comprehensive analytics data
      const analyticsResponse = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
      }
      
      // Load jobs
      const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        const jobData = jobsResult.data || [];
        setJobs(jobData);
        
        // Generate interview schedule from job data
        const generateInterviewSchedule = () => {
          const now = new Date();
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          const upcomingInterviews = jobData
            .filter((job: any) => {
              // Filter jobs that have interviews scheduled or are in interview stages
              return (job.status === 'interview' || job.status === 'screening') && 
                     job.interviews && job.interviews.length > 0;
            })
            .flatMap((job: any) => {
              return job.interviews
                .filter((interview: any) => {
                  const interviewDate = new Date(interview.date);
                  return interviewDate >= now && interviewDate <= weekFromNow;
                })
                .map((interview: any) => ({
                  id: `${job.id}-${interview.date}`,
                  company: job.company,
                  role: job.jobTitle,
                  stage: job.status,
                  datetime: new Date(interview.date),
                  type: interview.type || 'Interview',
                  location: interview.location || job.location || 'Remote',
                  jobId: job.id,
                  interviewId: interview.date
                }));
            })
            .sort((a: any, b: any) => a.datetime.getTime() - b.datetime.getTime())
            .slice(0, 6); // Show up to 6 upcoming interviews
          
          // If no real interviews, create some from recent job applications
          if (upcomingInterviews.length === 0) {
            const recentJobs = jobData
              .filter((job: any) => {
                // Ensure job has a valid ID
                if (!job.id && !job._id) return false;
                
                const jobDate = new Date(job.createdAt);
                const daysSinceCreated = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
                return daysSinceCreated <= 14; // Jobs created in last 14 days
              })
              .slice(0, 3);
            
            const mockInterviews = recentJobs.map((job: any, index: number) => {
              const jobId = job.id || job._id || `fallback-${index}`;
              return {
                id: `mock-${jobId}`,
                company: job.company,
                role: job.jobTitle,
                stage: job.status === 'applied' ? 'screening' : job.status,
                datetime: new Date(now.getTime() + (index + 1) * 24 * 60 * 60 * 1000), // Next few days
                type: index % 2 === 0 ? 'Phone Call' : 'Video Call',
                location: job.location || 'Remote',
                jobId: jobId,
                isMock: true
              };
            });
            
            return mockInterviews;
          }
          
          return upcomingInterviews;
        };
        
        setInterviews(generateInterviewSchedule());
      }

      // Load CVs
      const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      if (cvsResult.success) {
        const cvData = cvsResult.data.data || [];
        setCvs(cvData);
        
        // Generate drafts from CV data
        const draftCVs = cvData
          .filter((cv: any) => cv.status === 'draft')
          .slice(0, 2) // Show up to 2 draft CVs
          .map((cv: any) => ({
            id: cv.id || cv._id,
            type: 'cv' as const,
            title: cv.title || 'Untitled CV',
            progress: calculateCompletionPercentage(cv),
            lastEdited: new Date(cv.updatedAt || cv.createdAt),
            cvData: cv.cvData
          }));
        
        setDrafts(draftCVs);
      }

      // Load cover letters
      const coverLettersResponse = await fetch(`/api/cover-letters?userId=${userId}`);
      const coverLettersResult = await coverLettersResponse.json();
      if (coverLettersResult.success) {
        setCoverLetters(coverLettersResult.data || []);
      }

      // Load activity
      const activityResponse = await fetch(`/api/activity?userId=${userId}`);
      const activityResult = await activityResponse.json();
      if (activityResult.success) {
        setActivities(activityResult.data.activities || []);
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

  const calculateKPIs = () => {
    if (!analyticsData) {
      return {
        totalJobs: 0,
        cvsCreated: 0,
        coverLettersCreated: 0,
        applicationsSubmitted: 0,
        interviewsScheduled: 0
      };
    }
    return analyticsData.kpis;
  };

  const kpis = calculateKPIs();
  
  // Calculate CV health score based on actual CV completion
  const calculateCVHealthScore = () => {
    if (!analyticsData) return 0;
    return analyticsData.cvHealthScore;
  };
  
  const cvHealthScore = calculateCVHealthScore();
  
  // Get completion feedback for analytics
  const getCompletionFeedback = (cv: any): string[] => {
    const feedback: string[] = [];
    
    // Check personal info
    if (!cv.cvData?.basics?.name?.trim()) feedback.push('Add your full name');
    if (!cv.cvData?.basics?.email?.trim()) feedback.push('Add your email address');
    if (!cv.cvData?.basics?.phone?.trim()) feedback.push('Add your phone number');
    if (!cv.cvData?.basics?.summary?.trim()) feedback.push('Add a professional summary');
    
    // Check experience
    if (!cv.cvData?.work || cv.cvData.work.length === 0) {
      feedback.push('Add work experience');
    } else {
      const work = cv.cvData.work[0];
      if (!work.position?.trim()) feedback.push('Add job titles to experience');
      if (!work.summary?.trim()) feedback.push('Add descriptions to work experience');
    }
    
    // Check education
    if (!cv.cvData?.education || cv.cvData.education.length === 0) {
      feedback.push('Add education history');
    }
    
    // Check skills
    if (!cv.cvData?.skills || cv.cvData.skills.length === 0) {
      feedback.push('Add skills and competencies');
    }
    
    // Check projects
    if (!cv.cvData?.projects || cv.cvData.projects.length === 0) {
      feedback.push('Add projects or achievements');
    }
    
    return feedback.slice(0, 3); // Return top 3 suggestions
  };
  
  const vaultCounts = analyticsData?.vaultCounts || {
    cvs: 0,
    coverLetters: 0,
    jobDescriptions: 0,
    notes: 0
  };

  const aiGoal = analyticsData?.aiGoal || "Add your first job to start creating targeted cover letters";
  const aiMetrics = analyticsData?.aiMetrics || {
    cvsPerJob: '0',
    coverLetterCoverage: 0,
    jobsThisWeek: 0
  };

  const strengths = analyticsData?.strengths || [];
  const gaps = analyticsData?.gaps || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Hello, {user?.firstName || user?.name || 'User'}
        </h1>
        <p className="text-white/60">{getGreeting()}</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Continue Where You Left Off */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Continue Where You Left Off</h2>
            {drafts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    type={draft.type}
                    title={draft.title}
                    progress={draft.progress}
                    lastEdited={draft.lastEdited}
                    onResume={() => window.location.href = `/studio?draft=${draft.id}`}
                    onPreview={() => window.location.href = `/preview?draft=${draft.id}`}
                    onDiscard={() => console.log('Discard draft', draft.id)}
                    cvData={draft.cvData}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gradient-to-br from-lime-400/20 to-lime-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FilePlus size={24} className="text-lime-400" />
                </div>
                <h3 className="text-white font-medium mb-2">No drafts yet</h3>
                <p className="text-white/60 text-sm mb-4">Create your first CV or Cover Letter to get started</p>
                <motion.button
                  className="px-6 py-3 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-xl hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus size={20} />
                  Create CV
                </motion.button>
              </div>
            )}
          </div>

          {/* Analytics Chart */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Activity Trends</h2>
              <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
            </div>
            
            {/* Chart Container */}
            <div className="h-64 relative">
              {/* Chart Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-b border-white/10 h-0"></div>
                ))}
              </div>
              
              {/* Chart Lines */}
              <div className="absolute inset-0 flex items-end justify-between px-4 pb-4">
                {(() => {
                  const maxValue = Math.max(kpis.totalJobs, kpis.cvsCreated, kpis.coverLettersCreated, kpis.applicationsSubmitted, kpis.interviewsScheduled);
                  const maxHeight = 32;
                  
                  return (
                    <>
                      {/* Jobs Added Line */}
                      <div className="flex-1 flex items-end justify-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-500/20 to-blue-500/5 rounded-t-lg relative transition-all duration-500"
                          style={{ height: `${Math.max(8, (kpis.totalJobs / maxValue) * maxHeight)}px` }}
                        >
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-blue-400 rounded-full border-2 border-white"></div>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-blue-400 font-medium">{kpis.totalJobs}</div>
                        </div>
                      </div>
                      
                      {/* CVs Created Line */}
                      <div className="flex-1 flex items-end justify-center">
                        <div 
                          className="w-full bg-gradient-to-t from-lime-500/20 to-lime-500/5 rounded-t-lg relative transition-all duration-500"
                          style={{ height: `${Math.max(8, (kpis.cvsCreated / maxValue) * maxHeight)}px` }}
                        >
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-lime-400 rounded-full border-2 border-white"></div>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-lime-400 font-medium">{kpis.cvsCreated}</div>
                        </div>
                      </div>
                      
                      {/* Cover Letters Line */}
                      <div className="flex-1 flex items-end justify-center">
                        <div 
                          className="w-full bg-gradient-to-t from-purple-500/20 to-purple-500/5 rounded-t-lg relative transition-all duration-500"
                          style={{ height: `${Math.max(8, (kpis.coverLettersCreated / maxValue) * maxHeight)}px` }}
                        >
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-purple-400 rounded-full border-2 border-white"></div>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-purple-400 font-medium">{kpis.coverLettersCreated}</div>
                        </div>
                      </div>
                      
                      {/* Applications Line */}
                      <div className="flex-1 flex items-end justify-center">
                        <div 
                          className="w-full bg-gradient-to-t from-green-500/20 to-green-500/5 rounded-t-lg relative transition-all duration-500"
                          style={{ height: `${Math.max(8, (kpis.applicationsSubmitted / maxValue) * maxHeight)}px` }}
                        >
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-green-400 font-medium">{kpis.applicationsSubmitted}</div>
                        </div>
                      </div>
                      
                      {/* Interviews Line */}
                      <div className="flex-1 flex items-end justify-center">
                        <div 
                          className="w-full bg-gradient-to-t from-orange-500/20 to-orange-500/5 rounded-t-lg relative transition-all duration-500"
                          style={{ height: `${Math.max(8, (kpis.interviewsScheduled / maxValue) * maxHeight)}px` }}
                        >
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-orange-400 rounded-full border-2 border-white"></div>
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-xs text-orange-400 font-medium">{kpis.interviewsScheduled}</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* X-axis Labels */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-white/60">
                <span>Jobs</span>
                <span>CVs</span>
                <span>Letters</span>
                <span>Apps</span>
                <span>Interviews</span>
              </div>
            </div>
            
            {/* Legend */}
            <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-white/80 text-sm">Jobs Added</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-lime-400 rounded-full"></div>
                <span className="text-white/80 text-sm">CVs Created</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                <span className="text-white/80 text-sm">Cover Letters</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                <span className="text-white/80 text-sm">Applications</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                <span className="text-white/80 text-sm">Interviews</span>
              </div>
            </div>
          </div>

          {/* Weekly Schedule */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">This Week's Schedule</h2>
                <p className="text-white/60 text-sm">
                  {new Date().toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric' 
                  })} - {new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                {['All', 'Applied', 'Screening', 'Interview', 'Offer', 'Rejected'].map((stage) => (
                  <motion.button
                    key={stage}
                    onClick={() => setSelectedStage(stage.toLowerCase())}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 ${
                      selectedStage === stage.toLowerCase()
                        ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30'
                        : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {stage}
                  </motion.button>
                ))}
              </div>
            </div>
            {(() => {
              const filteredInterviews = selectedStage === 'all' 
                ? interviews 
                : interviews.filter(interview => interview.stage === selectedStage);
              
              return filteredInterviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredInterviews.map((interview) => (
                    <InterviewItem
                      key={interview.id}
                      company={interview.company}
                      role={interview.role}
                      stage={interview.stage}
                      datetime={interview.datetime}
                      type={interview.type}
                      location={interview.location}
                      jobId={interview.jobId}
                      isMock={interview.isMock}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar size={48} className="text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">
                    {selectedStage === 'all' 
                      ? 'No upcoming interviews this week' 
                      : `No ${selectedStage} interviews this week`
                    }
                  </p>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              Quick Actions
            </h3>
            <div className="space-y-3">
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus size={16} />
                Add New Job
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FileText size={16} />
                Create CV
              </motion.button>
              <motion.button
                className="w-full p-3 bg-white/10 rounded-lg text-white/80 text-sm hover:bg-white/20 transition-all duration-300 flex items-center gap-3"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <PenTool size={16} />
                Write Cover Letter
              </motion.button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Activity size={14} className="text-blue-400" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {activities && activities.length > 0 ? (
                activities.slice(0, 5).map((activity, index) => (
                  <div key={activity.id} className="flex items-center gap-3 text-white/60 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'cv' ? 'bg-lime-400' :
                      activity.type === 'job' ? 'bg-blue-400' :
                      activity.type === 'cover_letter' ? 'bg-purple-400' : 'bg-orange-400'
                    }`}></div>
                    <span>{activity.description}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4">
                  <p className="text-white/40 text-xs">No recent activity</p>
                  <p className="text-white/20 text-xs mt-1">Start using the app to see your activity</p>
                </div>
              )}
            </div>
          </div>

          {/* CV Health Score */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <CVHealthScore score={cvHealthScore} />
            <motion.button
              className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={14} />
              Improve Score
            </motion.button>
          </div>

          {/* AI Job Whisperer */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
              <Bot size={14} className="text-purple-400" />
              AI Job Whisperer
            </h3>
            <div className="space-y-4">
              <JobTips tips={analyticsData?.jobTips || []} />
              <AIGoal goal={aiGoal} metrics={aiMetrics} />
              <KeywordsAnalysis strengths={strengths} gaps={gaps} />
            </div>
          </div>

          {/* Vault Summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-6">
            <VaultSummary counts={vaultCounts} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics; 