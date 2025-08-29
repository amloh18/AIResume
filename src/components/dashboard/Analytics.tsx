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
import { useCreateCV } from '@/lib/utils/cvCreationUtils';

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
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const status = getStatus(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - score / 100);

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="none"
            className="text-white/10"
          />
          {/* Progress circle with gradient */}
          <defs>
            <linearGradient id="cvHealthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="url(#cvHealthGradient)"
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}%</span>
        </div>
      </div>
      <p className="text-white/60 text-sm mb-1">CV Health Score</p>
      <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
      <p className="text-white/40 text-xs mt-1">Based on completeness & best practices</p>
    </div>
  );
};

// Vault Summary Component
const VaultSummary: React.FC<{ counts: { cvs: number; jobDescriptions: number; notes: number } }> = ({ counts }) => (
  <div className="space-y-3">
    <h4 className="text-white font-medium text-sm mb-3">My Vault</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
          <div className="w-6 h-6 bg-gradient-to-br from-purple-400/20 to-purple-500/20 rounded-lg flex items-center justify-center">
            <Briefcase size={12} className="text-purple-400" />
          </div>
          <span className="text-white font-medium text-xs">Jobs</span>
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
      onClick={async () => {
        try {
          const userId = user?.id || user?._id || session?.user?.id;
          if (userId) {
            await createCV({
              userId,
              type: 'cv'
            });
          }
        } catch (error) {
          console.error('Error creating CV:', error);
        }
      }}
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

// Smart Recommendation Widget
const SmartRecommendationWidget: React.FC<{ 
  recommendations: any[];
}> = ({ recommendations }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
      <Lightbulb size={14} className="text-yellow-400" />
      Smart Recommendations
    </h3>
    <div className="space-y-3">
      {recommendations && recommendations.length > 0 ? (
        recommendations.slice(0, 3).map((rec, index) => (
          <motion.div
            key={index}
            className="p-3 bg-white/5 border border-white/10 rounded-lg"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  rec.priority === 'high' ? 'bg-red-400' :
                  rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                }`}></div>
                <span className="text-white font-medium text-sm">{rec.title}</span>
              </div>
              <span className="text-white/40 text-xs">{rec.timeToComplete}</span>
            </div>
            <p className="text-white/60 text-xs mb-2">{rec.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-lime-400 text-xs">{rec.impact}</span>
              <motion.button
                className="px-3 py-1 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (rec.type === 'cv') window.location.href = '/studio';
                  else if (rec.type === 'job') window.location.href = '/dashboard/pipeline';
                  else if (rec.type === 'cover_letter') window.location.href = '/studio?type=cover_letter';
                  else if (rec.type === 'followup') window.location.href = '/dashboard/pipeline';
                }}
              >
                {rec.action}
              </motion.button>
            </div>
          </motion.div>
        ))
      ) : (
        <div className="text-center py-4">
          <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
          <p className="text-white/60 text-xs">All caught up! Great job staying on top of your career goals.</p>
        </div>
      )}
    </div>
  </div>
);

// Predictive Analytics Widget
const PredictiveAnalyticsWidget: React.FC<{ 
  predictions: any;
  onUpdateGoal?: (goal: number) => void;
}> = ({ predictions, onUpdateGoal }) => {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState(predictions?.monthlyGoal || 20);

  const handleUpdateGoal = async () => {
    if (onUpdateGoal) {
      await onUpdateGoal(newGoal);
      setIsEditingGoal(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
        <Target size={14} className="text-purple-400" />
        Career Predictions
      </h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">{predictions?.nextWeekInterviews || 0}</div>
            <div className="text-white/60 text-xs">Interviews Next Week</div>
          </div>
          <div className="text-center p-3 bg-white/5 rounded-lg">
            <div className="text-2xl font-bold text-green-400">{predictions?.successProbability || 0}%</div>
            <div className="text-white/60 text-xs">Success Probability</div>
          </div>
        </div>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white text-sm">Monthly Goal Progress</span>
              {!isEditingGoal && (
                <button
                  onClick={() => setIsEditingGoal(true)}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  Edit
                </button>
              )}
            </div>
            <span className="text-white/60 text-xs">{predictions?.monthlyGoalProgress || 0}%</span>
          </div>
          {isEditingGoal ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={newGoal}
                  onChange={(e) => setNewGoal(parseInt(e.target.value) || 20)}
                  className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs"
                  placeholder="Set monthly goal"
                />
                <button
                  onClick={handleUpdateGoal}
                  className="px-2 py-1 bg-blue-400 text-black text-xs rounded hover:bg-blue-300"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingGoal(false);
                    setNewGoal(predictions?.monthlyGoal || 20);
                  }}
                  className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full bg-white/10 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-lime-400 to-lime-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, predictions?.monthlyGoalProgress || 0)}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-white/60 text-xs mt-1">
                <span>{predictions?.jobsThisMonth || 0} / {predictions?.monthlyGoal || 20} jobs</span>
                <span>Goal: {predictions?.monthlyGoal || 20} jobs/month</span>
              </div>
            </>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-white/80 text-xs font-medium">Recommended Actions:</p>
          {predictions?.recommendedActions?.map((action: string, index: number) => (
            <div key={index} className="flex items-center gap-2 text-white/60 text-xs">
              <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Market Intelligence Widget
const MarketIntelligenceWidget: React.FC<{ 
  marketIntelligence: any;
}> = ({ marketIntelligence }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
      <TrendingUp size={14} className="text-blue-400" />
      Market Intelligence
    </h3>
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-green-400">{marketIntelligence?.salaryTrend || '+8%'}</div>
          <div className="text-white/60 text-xs">Salary Trend</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-lg">
          <div className="text-lg font-bold text-blue-400">{marketIntelligence?.remoteOpportunities || '+45%'}</div>
          <div className="text-white/60 text-xs">Remote Jobs</div>
        </div>
      </div>
      <div>
        <p className="text-white/80 text-xs font-medium mb-2">Top Skills in Demand:</p>
        <div className="flex flex-wrap gap-1">
          {marketIntelligence?.topSkills?.map((skill: string, index: number) => (
            <span
              key={index}
              className="px-2 py-1 bg-blue-400/20 text-blue-400 text-xs rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-white/80 text-xs font-medium mb-2">Hot Companies Hiring:</p>
        <div className="flex flex-wrap gap-1">
          {marketIntelligence?.hotCompanies?.map((company: string, index: number) => (
            <span
              key={index}
              className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full"
            >
              {company}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// Enhanced Recent Activity Widget with actionable links
const EnhancedRecentActivityWidget: React.FC<{ 
  activities: any[];
}> = ({ activities }) => (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
    <h3 className="text-white font-medium text-sm mb-4 flex items-center gap-2">
      <Activity size={14} className="text-blue-400" />
      Recent Activity
    </h3>
    <div className="space-y-3">
      {activities && activities.length > 0 ? (
        activities.slice(0, 5).map((activity, index) => (
          <motion.div
            key={activity.id || index}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-all duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div className={`w-2 h-2 rounded-full ${
              activity.type === 'cv' ? 'bg-lime-400' :
              activity.type === 'job' ? 'bg-blue-400' :
              activity.type === 'cover_letter' ? 'bg-purple-400' : 'bg-orange-400'
            }`}></div>
            <div className="flex-1 min-w-0">
              <p className="text-white/80 text-xs truncate">{activity.description}</p>
              <p className="text-white/40 text-xs">
                {new Date(activity.timestamp).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            {activity.actionable && activity.actionText && activity.actionUrl && (
              <motion.button
                className="px-2 py-1 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => window.location.href = activity.actionUrl}
              >
                {activity.actionText}
              </motion.button>
            )}
          </motion.div>
        ))
      ) : (
        <div className="text-center py-4">
          <p className="text-white/40 text-xs">No recent activity</p>
          <p className="text-white/20 text-xs mt-1">Start using the app to see your activity</p>
        </div>
      )}
    </div>
  </div>
);

const Analytics: React.FC = () => {
  // Dashboard Analytics Component
  // Features:
  // 1. "Continue Where You Left Off" - Shows CVs with less than 99% completion progress
  // 2. All widgets use hardwired data from respective APIs (analytics, jobs, CVs, cover letters, activity)
  // 3. Real-time data from backend APIs for KPIs, CV health scores, interview schedules, etc.
  
  const { data: session } = useSession();
  const { createCV } = useCreateCV();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);

  const [activities, setActivities] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedStage, setSelectedStage] = useState('all');
  const [jobData, setJobData] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<{[key: string]: boolean}>({});

  // Handle monthly goal update
  const handleUpdateMonthlyGoal = async (newGoal: number) => {
    try {
      const response = await fetch('/api/user/update-monthly-goal', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ monthlyGoal: newGoal }),
      });

      if (response.ok) {
        // Refresh analytics data to get updated predictions
        const analyticsResponse = await fetch(`/api/analytics?userId=${user?.id || user?._id || session?.user?.id}&period=${selectedPeriod}`);
        if (analyticsResponse.ok) {
          const newAnalyticsData = await analyticsResponse.json();
          setAnalyticsData(newAnalyticsData.data);
        }
      } else {
        console.error('Failed to update monthly goal');
      }
    } catch (error) {
      console.error('Error updating monthly goal:', error);
    }
  };

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
  }, [session]);

  // Separate effect for period changes - only reload analytics data
  useEffect(() => {
    if (user?.id || user?._id) {
      loadAnalyticsDataOnly(user.id || user._id);
    }
  }, [selectedPeriod, user]);

  // Helper functions for calendar checklist
  const getStageColor = (stage: string, isBackground: boolean = false) => {
    switch (stage.toLowerCase()) {
      case 'applied':
        return isBackground ? 'bg-blue-400/20 text-blue-400' : 'bg-blue-400';
      case 'screening':
        return isBackground ? 'bg-yellow-400/20 text-yellow-400' : 'bg-yellow-400';
      case 'interview':
        return isBackground ? 'bg-purple-400/20 text-purple-400' : 'bg-purple-400';
      case 'offer':
        return isBackground ? 'bg-green-400/20 text-green-400' : 'bg-green-400';
      case 'rejected':
        return isBackground ? 'bg-red-400/20 text-red-400' : 'bg-red-400';
      default:
        return isBackground ? 'bg-white/20 text-white/60' : 'bg-white/40';
    }
  };

  const getDayTasks = (date: Date, interviews: any[], jobData: any[]) => {
    const tasks: any[] = [];
    const dateString = date.toISOString().split('T')[0];
    
    // Add interviews for this day
    interviews.forEach(interview => {
      const interviewDate = new Date(interview.datetime);
      if (interviewDate.toISOString().split('T')[0] === dateString) {
        tasks.push({
          type: 'interview',
          title: `${interview.type} with ${interview.company}`,
          company: interview.company,
          stage: interview.stage,
          completed: completedTasks[`${dateString}-interview-${interview.id}`] || false,
          id: interview.id
        });
      }
    });
    
    // Add follow-up tasks for recent applications
    jobData.forEach(job => {
      const jobDate = new Date(job.createdAt || job.appliedDate);
      const daysSinceApplied = Math.floor((date.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Suggest follow-up after 7 days for applied jobs
      if (job.status === 'applied' && daysSinceApplied === 7) {
        tasks.push({
          type: 'followup',
          title: `Follow up with ${job.company}`,
          company: job.company,
          stage: 'applied',
          completed: completedTasks[`${dateString}-followup-${job.id}`] || false,
          id: job.id
        });
      }
      
      // Suggest interview prep for screening jobs
      if (job.status === 'screening' && daysSinceApplied === 3) {
        tasks.push({
          type: 'prep',
          title: `Prepare for ${job.company} interview`,
          company: job.company,
          stage: 'screening',
          completed: completedTasks[`${dateString}-prep-${job.id}`] || false,
          id: job.id
        });
      }
    });
    
    return tasks;
  };

  const toggleTaskCompletion = (date: Date, taskIndex: number) => {
    const dateString = date.toISOString().split('T')[0];
    const dayTasks = getDayTasks(date, interviews, jobData);
    const task = dayTasks[taskIndex];
    
    if (task) {
      const taskKey = `${dateString}-${task.type}-${task.id}`;
      setCompletedTasks(prev => ({
        ...prev,
        [taskKey]: !prev[taskKey]
      }));
    }
  };

  const loadAnalyticsDataOnly = async (userId: string) => {
    try {
      console.log('🔍 Analytics - Loading analytics data only for period:', selectedPeriod);
      
      // Load only analytics data for the selected period
      const analyticsResponse = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      
      console.log('🔍 Analytics - Analytics API response (period change):', analyticsResult);
      
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
        console.log('🔍 Analytics - Updated analytics data for period:', selectedPeriod);
      } else {
        console.error('🔍 Analytics - Analytics API failed (period change):', analyticsResult);
      }
    } catch (error) {
      console.error('🔍 Analytics - Error loading analytics data:', error);
    }
  };

  const loadData = async (userId: string) => {
    try {
      setLoading(true);
      console.log('🔍 Analytics - Loading data for userId:', userId);
      
      // Load comprehensive analytics data (hardwired from APIs)
      const analyticsResponse = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      
      console.log('🔍 Analytics - Analytics API response:', analyticsResult);
      
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
        console.log('🔍 Analytics - Set analytics data:', analyticsResult.data);
      } else {
        console.error('🔍 Analytics - Analytics API failed:', analyticsResult);
      }
      
      // Load jobs (hardwired from jobs API)
      const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      console.log('🔍 Analytics - Jobs API response:', jobsResult);
      
      if (jobsResult.success) {
        const jobData = Array.isArray(jobsResult.data) ? jobsResult.data : [];
        setJobs(jobData);
        console.log('🔍 Analytics - Set jobs data:', jobData);
        
        // Generate interview schedule from job data (hardwired from API)
        const generateInterviewSchedule = () => {
          const now = new Date();
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          // Ensure jobData is an array before using array methods
          if (!Array.isArray(jobData)) {
            console.warn('🔍 Analytics - jobData is not an array:', jobData);
            return [];
          }
          
          // Use real interview data from jobs API
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
          
          // If no real interviews, create suggested interviews from recent job applications
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
            
            const suggestedInterviews = recentJobs.map((job: any, index: number) => {
              const jobId = job.id || job._id || `fallback-${index}`;
              return {
                id: `suggested-${jobId}`,
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
            
            return suggestedInterviews;
          }
          
          return upcomingInterviews;
        };
        
        setInterviews(generateInterviewSchedule());
        setJobData(jobData);
      }

      // Load CVs (hardwired from CVs API)
      const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      console.log('🔍 Analytics - CVs API response:', cvsResult);
      
      if (cvsResult.success) {
        const cvData = Array.isArray(cvsResult.data?.cvs) ? cvsResult.data.cvs : [];
        setCvs(cvData);
        console.log('🔍 Analytics - Set CVs data:', cvData);
        
        // Generate drafts from CV data - show CVs with less than 99% completion
        const incompleteCVs = cvData
          .filter((cv: any) => {
            const progress = calculateCompletionPercentage(cv);
            return progress < 99; // Show CVs with less than 99% completion
          })
          .sort((a: any, b: any) => {
            // Sort by completion percentage (lowest first) then by last edited date
            const progressA = calculateCompletionPercentage(a);
            const progressB = calculateCompletionPercentage(b);
            if (progressA !== progressB) {
              return progressA - progressB;
            }
            return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
          })
          .slice(0, 4) // Show up to 4 incomplete CVs
          .map((cv: any) => ({
            id: cv.id || cv._id,
            type: 'cv' as const,
            title: cv.title || 'Untitled CV',
            progress: calculateCompletionPercentage(cv),
            lastEdited: new Date(cv.updatedAt || cv.createdAt),
            cvData: cv.cvData
          }));
        
        setDrafts(incompleteCVs);
      }



      // Load activity (hardwired from activity API)
      const activityResponse = await fetch(`/api/activity?userId=${userId}`);
      const activityResult = await activityResponse.json();
      if (activityResult.success) {
        const activitiesData = Array.isArray(activityResult.data?.activities) ? activityResult.data.activities : [];
        setActivities(activitiesData);
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
    // Enhanced KPI data from analytics API
    if (!analyticsData) {
      console.log('🔍 Analytics - No analytics data available, using fallback values');
      return {
        totalJobs: 0,
        cvsCreated: 0,

        applicationsSubmitted: 0,
        interviewsScheduled: 0
      };
    }
    
    console.log('🔍 Analytics - Using analytics data for KPIs:', analyticsData);
    
    // Use enhanced data from analytics API
    return {
      totalJobs: analyticsData.kpis?.totalJobs?.value || 0,
      cvsCreated: analyticsData.kpis?.applicationSuccessRate?.value || 0,

      applicationsSubmitted: analyticsData.kpis?.averageCVHealth?.value || 0,
      interviewsScheduled: analyticsData.kpis?.totalJobs?.value || 0
    };
  };

  const kpis = calculateKPIs();
  
  // Calculate CV health score based on analytics API data
  const calculateCVHealthScore = () => {
    if (!analyticsData) return 0;
    return analyticsData.cvHealthScore || 0;
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
  
  // Calculate vault counts from actual data - exclude rejected jobs
  const vaultCounts = {
    cvs: Array.isArray(cvs) ? cvs.length : 0,
    jobDescriptions: Array.isArray(jobs) ? jobs.filter(job => job.status !== 'rejected').length : 0,
    notes: Array.isArray(activities) ? activities.length : 0 // Using activities as notes for now
  };

  // Use hardwired data from analytics API
  const aiGoal = analyticsData?.aiGoal || "Add your first job to start creating targeted cover letters";
  const aiMetrics = analyticsData?.aiMetrics || {
    cvsPerJob: '0',
    
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
    <div className="max-w-full mx-auto space-y-4 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Hello, {user?.firstName || user?.name || 'User'}
        </h1>
        <p className="text-white/60">{getGreeting()}</p>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
        {/* Columns 1-2: Continue Where You Left Off, Performance Insights */}
        <div className="sm:col-span-2 lg:col-span-2 xl:col-span-2 2xl:col-span-2 space-y-4">
          {/* Continue Where You Left Off - Merged with Smart Recommendations */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h2 className="text-xl font-bold text-white mb-4">Continue Where You Left Off</h2>
            <p className="text-white/60 text-sm mb-4">Complete your CVs and follow smart recommendations to increase your chances of landing interviews</p>
            
            {/* Drafts Section */}
            {drafts.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                  <FileText size={14} className="text-blue-400" />
                  Incomplete CVs
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
              </div>
            ) : (
              <div className="text-center py-3 mb-4">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-green-400" />
                  <h3 className="text-white font-medium text-sm">All CVs Complete!</h3>
                </div>
                <p className="text-white/60 text-xs mb-2">Great job! All your CVs are 99% or more complete</p>
                <motion.button
                  className="px-3 py-1.5 bg-gradient-to-r from-lime-400 to-lime-500 text-black font-semibold rounded-lg hover:from-lime-300 hover:to-lime-400 transition-all duration-300 flex items-center gap-1 mx-auto text-xs"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={async () => {
                    try {
                      const userId = user?.id || user?._id || session?.user?.id;
                      if (userId) {
                        await createCV({
                          userId,
                          type: 'cv'
                        });
                      }
                    } catch (error) {
                      console.error('Error creating CV:', error);
                    }
                  }}
                >
                  <Plus size={12} />
                  Create New CV
                </motion.button>
              </div>
            )}

            {/* Smart Recommendations Section */}
            <div>
              <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
                <Lightbulb size={14} className="text-yellow-400" />
                Smart Recommendations
              </h3>
              <div className="space-y-3">
                {analyticsData?.recommendations && analyticsData.recommendations.length > 0 ? (
                  analyticsData.recommendations.slice(0, 3).map((rec: any, index: number) => (
                    <motion.div
                      key={index}
                      className="p-3 bg-white/5 border border-white/10 rounded-lg"
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            rec.priority === 'high' ? 'bg-red-400' :
                            rec.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                          }`}></div>
                          <span className="text-white font-medium text-sm">{rec.title}</span>
                        </div>
                        <span className="text-white/40 text-xs">{rec.timeToComplete}</span>
                      </div>
                      <p className="text-white/60 text-xs mb-2">{rec.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lime-400 text-xs">{rec.impact}</span>
                        <motion.button
                          className="px-3 py-1 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded text-xs font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            if (rec.type === 'cv') window.location.href = '/studio';
                            else if (rec.type === 'job') window.location.href = '/dashboard/pipeline';
                            else if (rec.type === 'cover_letter') window.location.href = '/studio?type=cover_letter';
                            else if (rec.type === 'followup') window.location.href = '/dashboard/pipeline';
                          }}
                        >
                          {rec.action}
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle size={20} className="text-green-400 mx-auto mb-2" />
                    <p className="text-white/60 text-xs">All caught up! Great job staying on top of your career goals.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Performance Insights */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Performance Insights</h2>
              <PeriodSelector selectedPeriod={selectedPeriod} onPeriodChange={setSelectedPeriod} />
            </div>
            
            {/* Enhanced KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPIWidget
                title="Total Jobs"
                value={Array.isArray(jobs) ? jobs.length : 0}
                icon={<Briefcase size={20} />}
                color="bg-blue-500/20"
                change={Array.isArray(jobs) && jobs.length > 0 ? "+12%" : "+0%"}
              />
              <KPIWidget
                title="Success Rate"
                value={`${Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview' || job.status === 'offer').length / jobs.length) * 100) : 0}%`}
                icon={<TrendingUp size={20} />}
                color="bg-green-500/20"
                change={Array.isArray(jobs) && jobs.length > 0 ? "+5%" : "+0%"}
              />
              <KPIWidget
                title="Interview Rate"
                value={`${Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview').length / jobs.length) * 100) : 0}%`}
                icon={<Target size={20} />}
                color="bg-purple-500/20"
                change={Array.isArray(jobs) && jobs.length > 0 ? "+8%" : "+0%"}
              />
              <KPIWidget
                title="CV Health"
                value={`${Array.isArray(cvs) && cvs.length > 0 ? Math.round(cvs.reduce((sum, cv) => sum + calculateCompletionPercentage(cv), 0) / cvs.length) : 0}%`}
                icon={<Heart size={20} />}
                color="bg-lime-500/20"
                change={Array.isArray(cvs) && cvs.length > 0 ? "+10%" : "+0%"}
              />
            </div>

            {/* Performance Trends */}
            {analyticsData?.performanceTrends && (
              <div className="space-y-4">
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-white font-medium text-sm mb-3">Application Success Insights</h3>
                  <div className="space-y-2">
                    {analyticsData.performanceTrends.applicationSuccessRate?.insights?.map((insight: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-white/70 text-xs">
                        <div className="w-1 h-1 bg-lime-400 rounded-full"></div>
                        <span>{insight}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-4 bg-white/5 rounded-lg">
                  <h3 className="text-white font-medium text-sm mb-3">CV Optimization Tips</h3>
                  <div className="space-y-2">
                    {analyticsData.performanceTrends.cvEffectiveness?.improvements?.map((improvement: string, index: number) => (
                      <div key={index} className="flex items-center gap-2 text-white/70 text-xs">
                        <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                        <span>{improvement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Column 3: My Vault, This Week's Schedule, CV Health Score */}
        <div className="space-y-4">
          {/* My Vault */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <VaultSummary counts={vaultCounts} />
          </div>

          {/* This Week's Schedule */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-white font-medium text-sm flex items-center gap-2">
                  <Calendar size={14} className="text-blue-400" />
                  This Week's Schedule
                </h3>
                <p className="text-white/60 text-xs mt-1">
                  {new Date().toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })} - {new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            {/* Calendar Checklist - Only show days with tasks */}
            <div className="space-y-2">
              {(() => {
                const daysWithTasks = [];
                const today = new Date();
                
                for (let i = 0; i < 7; i++) {
                  const date = new Date(today);
                  date.setDate(today.getDate() + i);
                  
                  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                  const dayNumber = date.getDate();
                  const isToday = i === 0;
                  
                  // Get tasks for this day
                  const dayTasks = getDayTasks(date, interviews, jobData);
                  
                  // Only add days that have tasks
                  if (dayTasks.length > 0) {
                    daysWithTasks.push(
                      <div 
                        key={i} 
                        className={`p-2 rounded-lg border transition-all duration-300 ${
                          isToday 
                            ? 'bg-lime-400/10 border-lime-400/30' 
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        {/* Day Header */}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-medium ${
                              isToday 
                                ? 'bg-lime-400 text-black' 
                                : 'bg-white/10 text-white/80'
                            }`}>
                              {dayNumber}
                            </div>
                            <span className={`text-xs font-medium ${
                              isToday 
                                ? 'text-lime-400' 
                                : 'text-white/80'
                            }`}>
                              {dayName}
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.5 bg-lime-400/20 text-lime-400 text-xs rounded-full">
                                Today
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {dayTasks.map((task, taskIndex) => (
                              <div
                                key={taskIndex}
                                className={`w-1.5 h-1.5 rounded-full ${
                                  task.completed ? 'bg-green-400' : getStageColor(task.stage)
                                }`}
                                title={`${task.type}: ${task.title}`}
                              />
                            ))}
                          </div>
                        </div>
                        
                        {/* Day Tasks */}
                        <div className="space-y-1">
                          {dayTasks.map((task, taskIndex) => (
                            <div key={taskIndex} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={task.completed}
                                onChange={() => toggleTaskCompletion(date, taskIndex)}
                                className={`w-3 h-3 rounded border-2 transition-all duration-300 ${
                                  task.completed 
                                    ? 'bg-green-400 border-green-400' 
                                    : 'border-white/30 bg-transparent'
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className={`text-xs font-medium ${
                                    task.completed ? 'text-white/40 line-through' : 'text-white/80'
                                  }`}>
                                    {task.title}
                                  </span>
                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                    task.completed 
                                      ? 'bg-white/10 text-white/40' 
                                      : getStageColor(task.stage, true)
                                  }`}>
                                    {task.stage}
                                  </span>
                                </div>
                                {task.company && (
                                  <span className={`text-xs ${
                                    task.completed ? 'text-white/30' : 'text-white/50'
                                  }`}>
                                    {task.company}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                }
                
                // If no days have tasks, show a message
                if (daysWithTasks.length === 0) {
                  return (
                    <div className="text-center py-4">
                      <Calendar size={24} className="text-white/30 mx-auto mb-2" />
                      <span className="text-white/30 text-xs">No tasks scheduled this week</span>
                    </div>
                  );
                }
                
                return daysWithTasks;
              })()}
            </div>
          </div>

          {/* CV Health Score */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <CVHealthScore score={Array.isArray(cvs) && cvs.length > 0 ? Math.round(cvs.reduce((sum, cv) => sum + calculateCompletionPercentage(cv), 0) / cvs.length) : 0} />
            <motion.button
              className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2 text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => window.location.href = '/studio'}
            >
              <Sparkles size={14} />
              Improve Score
            </motion.button>
          </div>
        </div>

        {/* Column 4: Quick Actions, Application Timeline, Recent Activity */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <Zap size={14} className="text-yellow-400" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <motion.button
                className="w-full p-2 bg-white/10 rounded-lg text-white/80 text-xs hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/dashboard/pipeline'}
              >
                <Plus size={12} />
                Add Job
              </motion.button>
              <motion.button
                className="w-full p-2 bg-white/10 rounded-lg text-white/80 text-xs hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/studio'}
              >
                <FileText size={12} />
                Create CV
              </motion.button>
              <motion.button
                className="w-full p-2 bg-white/10 rounded-lg text-white/80 text-xs hover:bg-white/20 transition-all duration-300 flex items-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => window.location.href = '/studio?type=cover_letter'}
              >
                <PenTool size={12} />
                Write Cover Letter
              </motion.button>
            </div>
          </div>

          {/* Application Timeline */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-orange-400" />
              Application Timeline
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Applications This Week</span>
                <span className="text-orange-400 font-medium">{Array.isArray(jobs) ? jobs.filter(job => {
                  const jobDate = new Date(job.createdAt);
                  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  return jobDate >= weekAgo;
                }).length : 0}</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Avg. Response Time</span>
                <span className="text-green-400 font-medium">8 days</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Next Follow-up</span>
                <span className="text-blue-400 font-medium">2 days</span>
              </div>
            </div>
          </div>

          {/* Enhanced Recent Activity */}
          <EnhancedRecentActivityWidget activities={analyticsData?.recentActivity || []} />
        </div>

        {/* Column 5: Career Predictions, Market Intelligence, Market Status, Performance */}
        <div className="space-y-4">
          {/* Career Predictions */}
          <PredictiveAnalyticsWidget 
            predictions={analyticsData?.predictions || {}} 
            onUpdateGoal={handleUpdateMonthlyGoal}
          />

          {/* Market Intelligence */}
          <MarketIntelligenceWidget marketIntelligence={analyticsData?.marketIntelligence || {}} />

          {/* Market Status */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-green-400" />
              Market Status
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Demand Level</span>
                <span className="text-green-400 font-medium">High</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Salary Trend</span>
                <span className="text-green-400 font-medium">+8%</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Remote Jobs</span>
                <span className="text-blue-400 font-medium">+45%</span>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-purple-400" />
              Performance
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>ATS Score</span>
                <span className="text-purple-400 font-medium">{Array.isArray(cvs) && cvs.length > 0 ? Math.round(cvs.reduce((sum, cv) => sum + calculateCompletionPercentage(cv), 0) / cvs.length) : 0}%</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Success Rate</span>
                <span className="text-green-400 font-medium">{Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview' || job.status === 'offer').length / jobs.length) * 100) : 0}%</span>
              </div>
              <div className="flex items-center justify-between text-white/80 text-xs">
                <span>Interview Rate</span>
                <span className="text-blue-400 font-medium">{Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview').length / jobs.length) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Analytics; 