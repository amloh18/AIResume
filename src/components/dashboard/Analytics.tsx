'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FileText, Briefcase, PenTool, TrendingUp, Target, Sparkles, Zap, 
  Lightbulb, Plus, Edit, Eye, Trash2, Calendar, CheckCircle, Heart
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useCreateCV } from '@/lib/utils/cvCreationUtils';

// 1. The At-a-Glance "My Status" Section - Fused CV Health Score + Quick Actions
const MyStatusSection: React.FC<{ 
  cvHealthScore: number; 
  onImproveScore: () => void;
  onCreateCV: () => void;
  onAddJob: () => void;
  onWriteCoverLetter: () => void;
}> = ({ cvHealthScore, onImproveScore, onCreateCV, onAddJob, onWriteCoverLetter }) => {
  const getStatus = (score: number) => {
    if (score >= 80) return { label: 'Excellent', color: 'text-green-400' };
    if (score >= 60) return { label: 'Good', color: 'text-yellow-400' };
    return { label: 'Needs Improvement', color: 'text-red-400' };
  };

  const status = getStatus(cvHealthScore);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (1 - cvHealthScore / 100);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">My Status</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CV Health Score */}
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto mb-4">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" fill="none" className="text-white/10" />
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
              <span className="text-xl font-bold text-white">{cvHealthScore}%</span>
        </div>
      </div>
      <p className="text-white/60 text-sm mb-1">CV Health Score</p>
      <p className={`text-sm font-medium ${status.color}`}>{status.label}</p>
    </div>

        {/* Quick Actions */}
  <div className="space-y-3">
          <h3 className="text-white font-medium text-sm flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            Quick Actions
          </h3>
          <div className="space-y-2">
            <motion.button onClick={onImproveScore}
              className="w-full p-3 bg-gradient-to-r from-lime-400/20 to-lime-500/20 border border-lime-400/30 text-lime-400 rounded-lg font-medium hover:from-lime-400/30 hover:to-lime-500/30 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Sparkles size={14} /> Improve CV Score
            </motion.button>
            <motion.button onClick={onCreateCV}
              className="w-full p-3 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <FileText size={14} /> Create New CV
            </motion.button>
            <motion.button onClick={onAddJob}
              className="w-full p-3 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Plus size={14} /> Add Job
            </motion.button>
            <motion.button onClick={onWriteCoverLetter}
              className="w-full p-3 bg-white/10 text-white/80 rounded-lg hover:bg-white/20 transition-all duration-300 flex items-center justify-center gap-2"
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <PenTool size={14} /> Write Cover Letter
            </motion.button>
          </div>
        </div>
    </div>
  </div>
);
};

// 2. The "Application Hub" - Fused Incomplete CVs + Application Timeline
const ApplicationHub: React.FC<{ 
  drafts: any[];
  jobs: any[];
  onResumeDraft: (draftId: string) => void;
  onPreviewDraft: (draftId: string) => void;
  onDiscardDraft: (draftId: string) => void;
}> = ({ drafts, jobs, onResumeDraft, onPreviewDraft, onDiscardDraft }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'cvs'>('timeline');

  const getApplicationStats = () => {
    const thisWeekJobs = jobs.filter(job => {
      const jobDate = new Date(job.createdAt);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return jobDate >= weekAgo;
    });

    return {
      applicationsThisWeek: thisWeekJobs.length,
      successRate: jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview' || job.status === 'offer').length / jobs.length) * 100) : 0
    };
  };

  const stats = getApplicationStats();

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">Application Hub</h2>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <motion.button onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'timeline' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Calendar size={14} className="inline mr-2" /> Timeline
        </motion.button>
        <motion.button onClick={() => setActiveTab('cvs')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            activeTab === 'cvs' ? 'bg-blue-400/20 text-blue-400 border border-blue-400/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
          }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <FileText size={14} className="inline mr-2" /> Incomplete CVs ({drafts.length})
      </motion.button>
    </div>

      {activeTab === 'timeline' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400">{stats.applicationsThisWeek}</div>
              <div className="text-white/60 text-xs">This Week</div>
          </div>
            <div className="p-3 bg-white/5 rounded-lg text-center">
              <div className="text-lg font-bold text-green-400">{stats.successRate}%</div>
              <div className="text-white/60 text-xs">Success Rate</div>
        </div>
    </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-white/80 text-sm">
              <span>Average Response Time</span>
              <span className="text-green-400 font-medium">8 days</span>
  </div>
            <div className="flex items-center justify-between text-white/80 text-sm">
              <span>Next Follow-up Due</span>
              <span className="text-blue-400 font-medium">2 days</span>
        </div>
        </div>
        </div>
      ) : (
        <div className="space-y-4">
          {drafts.length > 0 ? drafts.map((draft) => (
            <div key={draft.id} className="p-4 bg-white/5 border border-white/10 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-lime-400/20">
                    <FileText size={16} className="text-lime-400" />
      </div>
      <div>
                    <h4 className="text-white font-medium text-sm">{draft.title}</h4>
                    <p className="text-white/40 text-xs">Progress: {draft.progress}%</p>
        </div>
      </div>
                <div className="text-white/40 text-xs">{draft.lastEdited.toLocaleDateString()}</div>
        </div>
              <div className="mb-4">
                <div className="flex justify-between text-white/60 text-xs mb-1">
                  <span>Progress</span>
                  <span>{draft.progress}%</span>
      </div>
                <div className="w-full bg-white/10 rounded-full h-2">
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
              <h3 className="text-white font-medium text-sm mb-2">All CVs Complete!</h3>
              <p className="text-white/60 text-xs">Great job! All your CVs are ready for applications.</p>
            </div>
          )}
        </div>
      )}
  </div>
);
};

// 3. The "Intelligence Dashboard" - Fused Career Predictions + Market Intelligence
const IntelligenceDashboard: React.FC<{ 
  predictions: any;
  marketIntelligence: any;
  onUpdateGoal?: (goal: number) => void;
}> = ({ predictions, marketIntelligence, onUpdateGoal }) => {
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
      <h2 className="text-xl font-bold text-white mb-4">Intelligence Dashboard</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Career Predictions */}
        <div>
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
                    <button onClick={() => setIsEditingGoal(true)} className="text-blue-400 hover:text-blue-300 text-xs">Edit</button>
              )}
            </div>
            <span className="text-white/60 text-xs">{predictions?.monthlyGoalProgress || 0}%</span>
          </div>
          {isEditingGoal ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                    <input type="number" min="1" max="100" value={newGoal} onChange={(e) => setNewGoal(parseInt(e.target.value) || 20)}
                      className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs" placeholder="Set monthly goal" />
                    <button onClick={handleUpdateGoal} className="px-2 py-1 bg-blue-400 text-black text-xs rounded hover:bg-blue-300">Save</button>
                    <button onClick={() => { setIsEditingGoal(false); setNewGoal(predictions?.monthlyGoal || 20); }}
                      className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-lime-400 to-lime-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, predictions?.monthlyGoalProgress || 0)}%` }}></div>
              </div>
              <div className="flex justify-between text-white/60 text-xs mt-1">
                <span>{predictions?.jobsThisMonth || 0} / {predictions?.monthlyGoal || 20} jobs</span>
                <span>Goal: {predictions?.monthlyGoal || 20} jobs/month</span>
              </div>
            </>
          )}
        </div>
            </div>
        </div>

        {/* Market Intelligence */}
        <div>
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
                  <span key={index} className="px-2 py-1 bg-blue-400/20 text-blue-400 text-xs rounded-full">{skill}</span>
          ))}
        </div>
      </div>
            
      <div>
        <p className="text-white/80 text-xs font-medium mb-2">Hot Companies Hiring:</p>
        <div className="flex flex-wrap gap-1">
          {marketIntelligence?.hotCompanies?.map((company: string, index: number) => (
                  <span key={index} className="px-2 py-1 bg-green-400/20 text-green-400 text-xs rounded-full">{company}</span>
                ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  </div>
);
};

// 4. The "Performance Insights" Section - Fused Performance Insights + Application Success Insights
const PerformanceInsights: React.FC<{ 
  analyticsData: any;
  jobs: any[];
  cvs: any[];
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
}> = ({ analyticsData, jobs, cvs, selectedPeriod, onPeriodChange }) => {
  const calculateKPIs = () => {
    return {
      totalJobs: Array.isArray(jobs) ? jobs.length : 0,
      successRate: Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview' || job.status === 'offer').length / jobs.length) * 100) : 0,
      interviewRate: Array.isArray(jobs) && jobs.length > 0 ? Math.round((jobs.filter(job => job.status === 'interview').length / jobs.length) * 100) : 0,
      cvHealth: Array.isArray(cvs) && cvs.length > 0 ? Math.round(cvs.reduce((sum, cv) => sum + (cv.progress || 0), 0) / cvs.length) : 0
    };
  };

  const kpis = calculateKPIs();

  return (
  <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Performance Insights</h2>
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">Period:</span>
          {['Day', 'Week', 'Month'].map((period) => (
            <motion.button key={period} onClick={() => onPeriodChange(period.toLowerCase())}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                selectedPeriod === period.toLowerCase() ? 'bg-lime-400/20 text-lime-400 border border-lime-400/30' : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              {period}
              </motion.button>
          ))}
        </div>
    </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Briefcase size={20} className="text-blue-400" />
            </div>
            <span className="text-xs font-medium text-green-400">+12%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{kpis.totalJobs}</div>
          <div className="text-white/60 text-sm">Total Jobs</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp size={20} className="text-green-400" />
            </div>
            <span className="text-xs font-medium text-green-400">+5%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{kpis.successRate}%</div>
          <div className="text-white/60 text-sm">Success Rate</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Target size={20} className="text-purple-400" />
            </div>
            <span className="text-xs font-medium text-green-400">+8%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{kpis.interviewRate}%</div>
          <div className="text-white/60 text-sm">Interview Rate</div>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-lime-500/20">
              <Heart size={20} className="text-lime-400" />
            </div>
            <span className="text-xs font-medium text-green-400">+10%</span>
          </div>
          <div className="text-2xl font-bold text-white mb-1">{kpis.cvHealth}%</div>
          <div className="text-white/60 text-sm">CV Health</div>
        </div>
      </div>

      {/* Performance Trends */}
      {analyticsData?.performanceTrends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
);
};

// Main Analytics Component
const Analytics: React.FC = () => {
  const { data: session } = useSession();
  const { createCV } = useCreateCV();
  const [user, setUser] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [cvs, setCvs] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [drafts, setDrafts] = useState<any[]>([]);

  const handleUpdateMonthlyGoal = async (newGoal: number) => {
    try {
      const response = await fetch('/api/user/update-monthly-goal', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyGoal: newGoal }),
      });
      if (response.ok) {
        const analyticsResponse = await fetch(`/api/analytics?userId=${user?.id || user?._id || session?.user?.id}&period=${selectedPeriod}`);
        if (analyticsResponse.ok) {
          const newAnalyticsData = await analyticsResponse.json();
          setAnalyticsData(newAnalyticsData.data);
        }
      }
    } catch (error) {
      console.error('Error updating monthly goal:', error);
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

  useEffect(() => {
    if (user?.id || user?._id) {
      loadAnalyticsDataOnly(user.id || user._id);
    }
  }, [selectedPeriod, user]);

  const loadAnalyticsDataOnly = async (userId: string) => {
    try {
      const analyticsResponse = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
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
      setLoading(true);
      
      const analyticsResponse = await fetch(`/api/analytics?userId=${userId}&period=${selectedPeriod}`);
      const analyticsResult = await analyticsResponse.json();
      if (analyticsResult.success) {
        setAnalyticsData(analyticsResult.data);
      }
      
      const jobsResponse = await fetch(`/api/jobs?userId=${userId}`);
      const jobsResult = await jobsResponse.json();
      if (jobsResult.success) {
        const jobData = Array.isArray(jobsResult.data) ? jobsResult.data : [];
        setJobs(jobData);
      }

      const cvsResponse = await fetch(`/api/cvs?userId=${userId}`);
      const cvsResult = await cvsResponse.json();
      if (cvsResult.success) {
        const cvData = Array.isArray(cvsResult.data?.cvs) ? cvsResult.data.cvs : [];
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
            cvData: cv.cvData
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
      <div className="max-w-full mx-auto space-y-6 px-4">
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
          {/* Column 1: Status + Application Hub */}
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

          {/* Column 2: Intelligence + Performance */}
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
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
                  <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-4">
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto space-y-6 px-4">
      {/* Header */}


      {/* Main Grid Layout - Redesigned with Fused Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Column 1: My Status + Application Hub */}
        <div className="space-y-6">
          <MyStatusSection
            cvHealthScore={cvHealthScore}
            onImproveScore={() => window.location.href = '/studio'}
            onCreateCV={async () => {
                    try {
                      const userId = user?.id || user?._id || session?.user?.id;
                      if (userId) {
                  await createCV({ userId, type: 'cv' });
                      }
                    } catch (error) {
                      console.error('Error creating CV:', error);
                    }
                  }}
            onAddJob={() => window.location.href = '/dashboard/pipeline'}
            onWriteCoverLetter={() => window.location.href = '/studio?type=cover_letter'}
          />
          
          <ApplicationHub
            drafts={drafts}
            jobs={jobs}
            onResumeDraft={(draftId) => window.location.href = `/studio?draft=${draftId}`}
            onPreviewDraft={(draftId) => window.location.href = `/preview?draft=${draftId}`}
            onDiscardDraft={(draftId) => console.log('Discard draft', draftId)}
          />
                        </div>
                        
        {/* Column 2: Intelligence Dashboard + Performance Insights */}
        <div className="space-y-6">
          <IntelligenceDashboard
            predictions={analyticsData?.predictions || {}} 
            marketIntelligence={analyticsData?.marketIntelligence || {}}
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