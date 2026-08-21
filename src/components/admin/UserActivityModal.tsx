'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Briefcase, Mail, Clock, CheckCircle, XCircle, Loader2, 
  ArrowUpRight, PieChart, Plus, Trash2, Ban, LogOut, RefreshCcw, History,
  User as UserIcon, Shield, CreditCard, Activity, Layers, Zap,
  ChevronRight, MapPin, Globe, ExternalLink, MoreVertical,
  ChevronDown, TrendingUp, AlertTriangle, UserCheck, Lock, LayoutGrid, Trophy,
  ChevronLeft, Sparkles, Target, Palette, Search, Lightbulb
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { useToast } from '@/hooks/use-toast';

interface UserActivityData {
  user: any;
  metrics: {
    healthScore: number;
    analysisSnapshot?: any;
    masterCV: { exists: boolean; atsScore: number; lastUpdated: string };
    cvs: { total: number; master: number; tailored: number };
    coverLetters: { total: number; lastCreated: string };
    jobs: { total: number; active: number };
    documents: { total: number; storageUsed: number };
    journeys: number;
    timeInApp: number;
    aiApplications: number;
    autoApplyEnabled: boolean;
    subscription: any;
    lifetimeValue: number;
  };
  pipeline: { applied: number; screening: number; interview: number; offers: number; rejected: number; total: number };
  featureUsage: Record<string, number>;
  recentActivity: Array<{ action: string; resourceType: string; resourceName: string; timestamp: string; ip: string }>;
  supportNotes: Array<{ content: string; adminEmail: string; timestamp: string }>;
}

// Helper functions for safe date rendering
const safeFormatDate = (dateVal: any, formatStr: string = 'dd MMM yyyy') => {
  if (!dateVal) return 'N/A';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, formatStr);
  } catch (e) {
    return 'N/A';
  }
};

const safeFormatDistanceToNow = (dateVal: any) => {
  if (!dateVal) return 'some time';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'some time';
    return formatDistanceToNow(d);
  } catch (e) {
    return 'some time';
  }
};

export default function UserActivityModal({ userId, isOpen, onClose }: { userId: string; isOpen: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserActivityData | null>(null);
  const [selectedPlan, setSelectedPlan] = useState('focused_monthly');
  const [granting, setGranting] = useState(false);

  // Custom Dialog Modal State
  const [activeDialog, setActiveDialog] = useState<{
    type: 'confirm' | 'prompt_single' | 'prompt_email';
    title: string;
    description: string;
    onConfirm: (val1?: string, val2?: string) => void | Promise<void>;
  } | null>(null);
  
  const [dialogInput1, setDialogInput1] = useState('');
  const [dialogInput2, setDialogInput2] = useState('');

  useEffect(() => {
    if (isOpen && userId) fetchUserActivity();
  }, [isOpen, userId]);

  useEffect(() => {
    if (data?.metrics?.subscription?.planKey) {
      setSelectedPlan(data.metrics.subscription.planKey);
    }
  }, [data]);

  const fetchUserActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      const result = await res.json();
      if (result.success) setData(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPlan = async () => {
    if (!selectedPlan) return;
    setGranting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: selectedPlan,
          interval: selectedPlan.includes('yearly') ? 'yearly' : selectedPlan.includes('quarterly') ? 'quarterly' : 'monthly',
          reason: 'Admin granted via UserActivityModal'
        })
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: "Success", description: "Plan granted successfully", variant: "success" });
        fetchUserActivity();
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: `Error granting plan: ${err.message}`, variant: "destructive" });
    } finally {
      setGranting(false);
    }
  };

  const handleDowngradePlan = (targetPlanKey: string) => {
    setActiveDialog({
      type: 'confirm',
      title: 'Downgrade Membership',
      description: `Are you sure you want to downgrade this user to ${targetPlanKey}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/subscription/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planKey: targetPlanKey,
              interval: 'monthly',
              reason: 'Admin downgraded to starter'
            })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: "Success", description: "Downgraded successfully", variant: "success" });
            fetchUserActivity();
          } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "Error", description: `Error downgrading: ${err.message}`, variant: "destructive" });
        }
      }
    });
  };

  const handleExtendPlan = () => {
    const currentPlanKey = data?.metrics?.subscription?.planKey || 'starter_monthly';
    if (currentPlanKey === 'free' || currentPlanKey === 'starter_monthly') {
      toast({ title: "Operation Restricted", description: "User has no paid tier to extend duration.", variant: "destructive" });
      return;
    }
    setActiveDialog({
      type: 'confirm',
      title: 'Extend Duration',
      description: "Are you sure you want to extend the user's current subscription by 30 days?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/subscription/upgrade`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planKey: currentPlanKey,
              interval: 'monthly',
              reason: 'Admin extended subscription by 30 days'
            })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: "Success", description: "Extended plan successfully", variant: "success" });
            fetchUserActivity();
          } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "Error", description: `Error extending plan: ${err.message}`, variant: "destructive" });
        }
      }
    });
  };

  const handleCancelSubscription = () => {
    setActiveDialog({
      type: 'confirm',
      title: 'Cancel Subscription',
      description: "Are you sure you want to cancel this user's active subscription immediately?",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/subscription/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              when: 'now',
              reason: 'Admin cancelled via UserActivityModal'
            })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: "Success", description: "Subscription cancelled successfully", variant: "success" });
            fetchUserActivity();
          } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "Error", description: `Error cancelling subscription: ${err.message}`, variant: "destructive" });
        }
      }
    });
  };

  const handleSendEmail = () => {
    if (!data?.user?.email) return;
    setDialogInput1('');
    setDialogInput2('');
    setActiveDialog({
      type: 'prompt_email',
      title: 'Send Campaign Email',
      description: `Draft and send an email directly to ${data.user.email}.`,
      onConfirm: async (subject, htmlContent) => {
        if (!subject || !htmlContent) {
          toast({ title: "Validation Error", description: "Subject and content are required.", variant: "destructive" });
          return;
        }
        try {
          const res = await fetch('/api/admin/email-campaigns/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emails: [data.user.email],
              subject: subject,
              htmlContent: `<p>${htmlContent.replace(/\n/g, '<br>')}</p>`,
              fromName: 'AI Resume Support',
              fromEmail: 'support@buildairesume.com'
            })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: "Success", description: "Email sent successfully!", variant: "success" });
          } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
          }
        } catch (err: any) {
          toast({ title: "Error", description: `Error sending email: ${err.message}`, variant: "destructive" });
        }
      }
    });
  };

  const handleSecondaryAction = (action: string) => {
    if (action === 'delete_user') {
      setActiveDialog({
        type: 'confirm',
        title: 'Delete User Permanently',
        description: 'CRITICAL: Are you sure you want to delete this user and ALL their data permanently? This action cannot be undone.',
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
              toast({ title: "Success", description: "User deleted permanently.", variant: "success" });
              onClose();
            } else {
              toast({ title: "Error", description: result.error, variant: "destructive" });
            }
          } catch (err: any) {
            toast({ title: "Error", description: `Error deleting user: ${err.message}`, variant: "destructive" });
          }
        }
      });
      return;
    }

    toast({ title: "Action Triggered", description: `Admin action "${action}" requested. Wired successfully!`, variant: "success" });
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="w-full flex flex-col lg:flex-row gap-8 animate-in fade-in zoom-in duration-300"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24 bg-[#0d0d11]/40 border border-white/5 rounded-3xl">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-white/60 font-bold text-center">Retrieving deep user insights...</p>
        </div>
      ) : data ? (
        <>
          {/* Main Content Area (Center Scrollable) */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-10rem)] pr-4 scrollbar-hide space-y-8">
              
              {/* User Profile Header */}
              <div className="flex flex-col md:flex-row items-start justify-between gap-6 mb-10">
                <div className="flex items-center gap-4 md:gap-6 w-full md:w-auto">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-2xl md:rounded-3xl bg-emerald-700 flex items-center justify-center text-2xl md:text-3xl font-black text-white shadow-xl shadow-emerald-900/20 shrink-0`}>
                    {data.user.firstName[0]}{data.user.lastName[0]}
                  </div>
                  <div className="space-y-1 md:space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <h1 className={`text-xl md:text-3xl font-black ${ADMIN_THEME.text.primary} truncate`}>{data.user.firstName} {data.user.lastName}</h1>
                      <div className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-emerald-200">Active</div>
                    </div>
                    <div className={`flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs ${ADMIN_THEME.text.secondary} font-bold truncate`}>
                      <span className="flex items-center gap-1.5"><Mail size={14} className="shrink-0" /> <span className="truncate">{data.user.email}</span></span>
                      <span className="hidden sm:flex items-center gap-1.5"><History size={14} className="shrink-0" /> <span className="truncate">ID: {data.user._id}</span></span>
                    </div>
                    <div className={`flex items-center gap-2 md:gap-4 text-[9px] md:text-[10px] ${ADMIN_THEME.text.tertiary} font-black uppercase tracking-widest`}>
                      <span className="truncate">Joined: {safeFormatDate(data.user.registrationDate, 'dd MMM yyyy')}</span>
                      <span className="text-emerald-600 bg-emerald-50 px-1.5 rounded shrink-0">Verified</span>
                    </div>
                  </div>
                </div>

                  <div className="flex flex-col sm:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
                    <div className={`${ADMIN_THEME.background.tertiary} rounded-2xl p-3 md:p-4 flex gap-4 md:gap-8 border ${ADMIN_THEME.border.primary} justify-between md:justify-start w-full`}>
                      <div>
                        <p className={`text-[9px] md:text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest mb-1`}>Plan</p>
                        <div className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-tight">{data.metrics.subscription?.planKey || 'Free'}</div>
                      </div>
                      <div className="hidden sm:block">
                        <p className={`text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest mb-1`}>Status</p>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                        </div>
                      </div>
                      <div>
                        <p className={`text-[9px] md:text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest mb-1`}>Next Billing</p>
                        <p className={`text-[10px] md:text-xs font-bold ${ADMIN_THEME.text.primary}`}>
                          {safeFormatDate(data.metrics.subscription?.currentPeriodEnd, 'dd MMM yy')}
                        </p>
                      </div>
                    </div>
                  </div>
              </div>

              {/* Top Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5 mb-5">
                <StatCard 
                  title="Health Score" 
                  value={data.metrics.healthScore} 
                  subValue={data.metrics.healthScore >= 80 ? 'Excellent' : data.metrics.healthScore >= 60 ? 'Fair' : 'Improving'} 
                  icon={Activity} 
                  iconColor="text-emerald-600" 
                  gauge 
                />
                <StatCard 
                  title="Master CV" 
                  value={data.metrics.masterCV.exists ? 'Yes' : 'No'} 
                  subValue={data.metrics.masterCV.exists ? `ATS: ${data.metrics.masterCV.atsScore}/100` : 'Missing'} 
                  icon={FileText} 
                  iconColor="text-blue-600" 
                />
                <StatCard 
                  title="Total CVs" 
                  value={data.metrics.cvs.total} 
                  subValue={`${data.metrics.cvs.tailored} Tailored`} 
                  icon={Layers} 
                  iconColor="text-purple-600" 
                />
                <StatCard 
                  title="Cover Letters" 
                  value={data.metrics.coverLetters.total} 
                  subValue={data.metrics.coverLetters.total > 0 ? `Active user` : 'No data'} 
                  icon={Mail} 
                  iconColor="text-orange-600" 
                />
                <StatCard 
                  title="Jobs Tracked" 
                  value={data.metrics.jobs.total} 
                  subValue={`${data.metrics.jobs.active} Active`} 
                  icon={Briefcase} 
                  iconColor="text-blue-500" 
                />
                <StatCard 
                  title="Documents" 
                  value={data.metrics.documents.total} 
                  subValue={`${(data.metrics.documents.storageUsed / (1024 * 1024)).toFixed(1)} MB used`} 
                  icon={FileText} 
                  iconColor="text-yellow-600" 
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-5 mb-10">
                <StatCard title="Journeys" value={data.metrics.journeys} subValue="Active tracks" icon={TrendingUp} iconColor="text-orange-500" />
                <StatCard title="Time in App" value={`${Math.floor(data.metrics.timeInApp / 60)}h ${data.metrics.timeInApp % 60}m`} subValue="Estimated total" icon={Clock} iconColor="text-cyan-600" />
                <StatCard title="AI Usage" value={data.metrics.aiApplications} subValue={data.metrics.aiApplications > 10 ? 'Power user' : 'Standard'} icon={Zap} iconColor="text-pink-600" />
                <StatCard title="Auto Apply" value={data.metrics.autoApplyEnabled ? 'Enabled' : 'Disabled'} subValue="Setup status" icon={Zap} iconColor="text-emerald-600" />
                <StatCard title="Plan Tier" value={data.metrics.subscription?.planKey || 'Free'} subValue="Subscription" icon={CreditCard} iconColor="text-purple-500" />
                <StatCard title="LTV" value={`£${(data.metrics.lifetimeValue || 0).toLocaleString()}`} subValue="Gross Revenue" icon={CreditCard} iconColor="text-emerald-600" />
              </div>

              {/* Bottom Panels */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* Recent Activity */}
                <div className="xl:col-span-3 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary}`}>Recent Activity</h3>
                    <button className={`text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest hover:text-emerald-600 transition-colors`}>View All</button>
                  </div>
                  <div className="space-y-6">
                    {data.recentActivity.map((act, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className={`p-2 ${ADMIN_THEME.background.tertiary} rounded-xl text-slate-400 group-hover:bg-emerald-50 transition-all shrink-0`}>
                          {act.resourceType === 'cv' ? <FileText size={16} /> : act.resourceType === 'cover_letter' ? <Mail size={16} /> : <Briefcase size={16} />}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <p className={`text-xs font-bold ${ADMIN_THEME.text.primary} capitalize truncate`}>{act.action.replace('_', ' ')} {act.resourceType}</p>
                          <p className={`text-[10px] ${ADMIN_THEME.text.tertiary} font-bold truncate`}>{act.resourceName || 'Unnamed'}</p>
                        </div>
                        <span className={`ml-auto text-[10px] font-black ${ADMIN_THEME.text.muted} shrink-0`}>{safeFormatDistanceToNow(act.timestamp)} ago</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pipeline & Feature Usage */}
                <div className="xl:col-span-5 space-y-8">
                  <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 md:p-6`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary} mb-6`}>Pipeline Overview</h3>
                    <div className="flex flex-col sm:flex-row items-center gap-8 md:gap-12">
                      <div className="relative w-32 h-32 shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                          <motion.circle 
                            cx="64" cy="64" r="54" 
                            stroke="currentColor" strokeWidth="12" fill="transparent" 
                            strokeDasharray="339.3" 
                            initial={{ strokeDashoffset: 339.3 }}
                            animate={{ strokeDashoffset: 339.3 - (339.3 * (data.pipeline.total > 0 ? (data.pipeline.applied + data.pipeline.screening + data.pipeline.interview + data.pipeline.offers) / data.pipeline.total : 0)) }}
                            transition={{ duration: 1.5, ease: "easeOut" }}
                            className="text-emerald-600" 
                            strokeLinecap="round" 
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className={`text-2xl font-black ${ADMIN_THEME.text.primary}`}>{data.pipeline.total}</span>
                          <span className={`text-[8px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest`}>Total Jobs</span>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-2 gap-x-4 md:gap-x-8 gap-y-3 w-full">
                        <PipelineItem label="Applied" value={data.pipeline.applied} total={data.pipeline.total} color="bg-blue-500" />
                        <PipelineItem label="Screening" value={data.pipeline.screening} total={data.pipeline.total} color="bg-purple-500" />
                        <PipelineItem label="Interview" value={data.pipeline.interview} total={data.pipeline.total} color="bg-indigo-500" />
                        <PipelineItem label="Offers" value={data.pipeline.offers} total={data.pipeline.total} color="bg-emerald-500" />
                        <PipelineItem label="Rejected" value={data.pipeline.rejected} total={data.pipeline.total} color="bg-red-500" />
                      </div>
                    </div>
                  </div>

                  <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 md:p-6`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary} mb-6`}>Feature Usage (Last 30 Days)</h3>
                    <div className="space-y-4">
                      <UsageBar label="CV Editor" value={data.featureUsage.cvEditor} color="bg-emerald-600" />
                      <UsageBar label="ATS Scan" value={data.featureUsage.atsScan} color="bg-blue-600" />
                      <UsageBar label="Cover Letters" value={data.featureUsage.coverLetters} color="bg-purple-600" />
                      <UsageBar label="Interview Coach" value={data.featureUsage.interviewCoach} color="bg-orange-600" />
                      <UsageBar label="Auto Apply" value={data.featureUsage.autoApply} color="bg-cyan-600" />
                    </div>
                  </div>
                </div>

                {/* Support & Profile & Analysis */}
                <div className="xl:col-span-4 space-y-8">
                  {/* Onboarding & Profile */}
                  <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 md:p-6`}>
                    <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary} mb-6`}>Onboarding & Profile</h3>
                    <div className="grid grid-cols-1 gap-y-3">
                      <CheckItem label="Onboarding Completed" checked={data.user.onboarding?.activation_status === 'completed'} />
                      <CheckItem label="Current Step" value={`${data.user.onboarding?.completed_stages?.length || 0}/10`} />
                      <CheckItem label="User Type" value={data.user.userRole || 'Professional'} />
                      <CheckItem label="Recommended Tier" value={data.user.onboarding?.recommended_plan || 'Focused'} />
                      <CheckItem label="Primary CV" value={data.metrics.masterCV.exists ? 'Present' : 'Missing'} checked={data.metrics.masterCV.exists} />
                      <CheckItem label="Email Verified" checked={data.user.isEmailVerified} />
                    </div>
                  </div>

                  {/* CV Analysis Snapshot (At a Glance) */}
                  {data.metrics.analysisSnapshot && (
                    <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 md:p-6`}>
                      <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary} mb-6`}>CV Analysis Snapshot</h3>
                      <div className="space-y-3">
                        <AnalysisItem label="Pages Detected" value={data.metrics.analysisSnapshot.stats?.pagesDetected} icon={FileText} />
                        <AnalysisItem label="Total Words" value={data.metrics.analysisSnapshot.stats?.totalWords} icon={Mail} />
                        <AnalysisItem label="Experience" value={`${data.metrics.analysisSnapshot.stats?.experienceYears} years`} icon={Briefcase} />
                        <AnalysisItem label="Skills Found" value={data.metrics.analysisSnapshot.stats?.skillsFound} icon={Zap} />
                        <AnalysisItem label="Sections" value={`${data.metrics.analysisSnapshot.stats?.sectionsDetected}/9`} icon={LayoutGrid} />
                      </div>
                    </div>
                  )}

                  {/* Support Notes */}
                  <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 md:p-6`}>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary}`}>Support Notes</h3>
                      <button 
                        onClick={() => {
                          setDialogInput1('');
                          setActiveDialog({
                            type: 'prompt_single',
                            title: 'Add Support Note',
                            description: 'Add a new administrative support note for this user.',
                            onConfirm: async (content) => {
                              if (!content?.trim()) return;
                              try {
                                const res = await fetch(`/api/admin/users/${userId}/notes`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ content: content.trim() })
                                });
                                if (res.ok) {
                                  toast({ title: "Note Added", description: "Support note added successfully.", variant: "success" });
                                  fetchUserActivity();
                                }
                              } catch (err) { console.error(err); }
                            }
                          });
                        }}
                        className="text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-800 transition-colors"
                      >
                        <Plus size={10} /> Add Note
                      </button>
                    </div>
                    <div className="space-y-4">
                      {data.supportNotes.length > 0 ? data.supportNotes.map((note, idx) => (
                        <div key={idx} className={`p-4 bg-white rounded-2xl space-y-2 border ${ADMIN_THEME.border.primary}`}>
                          <p className={`text-xs ${ADMIN_THEME.text.secondary} leading-relaxed font-medium`}>{note.content}</p>
                          <div className={`flex justify-between items-center text-[9px] font-black uppercase tracking-widest ${ADMIN_THEME.text.muted}`}>
                            <span>by {note.adminEmail}</span>
                            <span>{safeFormatDate(note.timestamp, 'dd MMM yyyy')}</span>
                          </div>
                        </div>
                      )) : <p className={`text-xs ${ADMIN_THEME.text.muted} font-bold italic`}>No support notes for this user.</p>}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Admin Sidebar */}
            <div className="w-full lg:w-[320px] flex flex-col gap-6 shrink-0 h-fit">
              <div className="space-y-4">
                <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary}`}>Admin Actions</h3>
                
                <div className="flex flex-col gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <p className={`text-[9px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest`}>Select Plan to Grant</p>
                  <div className="flex gap-2">
                    <select 
                      value={selectedPlan} 
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className={`flex-1 text-xs font-bold p-2 rounded-xl bg-slate-50 border border-slate-200 outline-none ${ADMIN_THEME.text.secondary}`}
                    >
                      <option value="starter_monthly">Starter Monthly</option>
                      <option value="starter_yearly">Starter Yearly</option>
                      <option value="focused_monthly">Focused Monthly</option>
                      <option value="focused_yearly">Focused Yearly</option>
                    </select>
                    <button 
                      onClick={handleGrantPlan}
                      disabled={granting}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                    >
                      {granting ? 'Granting' : 'Grant'}
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2">
                  {/* Downgrade Option */}
                  {data.metrics.subscription?.planKey && data.metrics.subscription?.planKey !== 'free' && data.metrics.subscription?.planKey !== 'starter_monthly' && (
                    <AdminActionButton 
                      label="Downgrade to Starter Monthly" 
                      icon={TrendingUp} 
                      color="text-orange-600" 
                      className="rotate-180" 
                      onClick={() => handleDowngradePlan('starter_monthly')}
                    />
                  )}
                  
                  <AdminActionButton 
                    label="Extend Plan (30 Days)" 
                    icon={History} 
                    color="text-blue-600" 
                    onClick={handleExtendPlan}
                  />
                  
                  <AdminActionButton 
                    label="Cancel Subscription" 
                    icon={XCircle} 
                    color="text-red-600" 
                    onClick={handleCancelSubscription}
                  />

                  <AdminActionButton 
                    label="Send User an Email" 
                    icon={Mail} 
                    color="text-indigo-600" 
                    onClick={handleSendEmail}
                  />
                </div>
              </div>

              <div className="space-y-2.5 border-t border-slate-200/60 pt-4">
                <h3 className={`text-xs font-black uppercase tracking-widest ${ADMIN_THEME.text.tertiary}`}>Account Operations</h3>
                <div className="space-y-2.5">
                  <AdminSecondaryButton label="Reset Password" icon={Lock} onClick={() => handleSecondaryAction('reset_password')} />
                  <AdminSecondaryButton label="Force Logout" icon={LogOut} onClick={() => handleSecondaryAction('force_logout')} />
                  <AdminSecondaryButton label="Resend Welcome" icon={Mail} onClick={() => handleSecondaryAction('resend_welcome')} />
                  <AdminSecondaryButton label="Verify Email" icon={CheckCircle} onClick={() => handleSecondaryAction('verify_email')} />
                  <AdminSecondaryButton label="Clear Cache" icon={RefreshCcw} onClick={() => handleSecondaryAction('clear_cache')} />
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-200 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-red-600">Danger Zone</h3>
                <div className="space-y-3">
                  <button onClick={() => handleSecondaryAction('suspend_account')} className="flex items-center gap-3 text-red-500 hover:text-red-700 transition-colors group w-full text-left">
                    <Ban size={16} className="shrink-0" />
                    <span className="text-xs font-bold">Suspend Account</span>
                  </button>
                  <button onClick={() => handleSecondaryAction('delete_data')} className="flex items-center gap-3 text-red-500 hover:text-red-700 transition-colors group w-full text-left">
                    <Trash2 size={16} className="shrink-0" />
                    <span className="text-xs font-bold">Delete All Data</span>
                  </button>
                  <button onClick={() => handleSecondaryAction('delete_user')} className="flex items-center gap-3 text-red-700 hover:text-red-900 transition-colors group w-full text-left">
                    <Trash2 size={16} className="shrink-0" />
                    <div>
                      <p className="text-xs font-bold">Delete User</p>
                      <p className={`text-[8px] font-black uppercase tracking-tight ${ADMIN_THEME.text.muted}`}>Permanent</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 pt-8 border-t border-slate-200">
                <FooterItem icon={Clock} label="Last Active" value={safeFormatDate(data.user.lastActive, 'dd MMM yy, HH:mm')} />
                <FooterItem icon={Globe} label="IP Address" value={data.user.ipAddress || 'Unknown'} />
                <FooterItem icon={MapPin} label="Location" value={data.user.ip_location || 'Unknown'} />
              </div>
            </div>
          </>
        ) : null}

        {/* Custom Center Dialog Modal */}
        <AnimatePresence>
          {activeDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setActiveDialog(null)}
              />
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d11] p-6 shadow-2xl space-y-6"
              >
                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-white">{activeDialog.title}</h3>
                  <p className="text-xs text-white/50 leading-relaxed font-bold">{activeDialog.description}</p>
                </div>

                {activeDialog.type === 'prompt_single' && (
                  <input
                    type="text"
                    value={dialogInput1}
                    onChange={(e) => setDialogInput1(e.target.value)}
                    placeholder="Enter details..."
                    className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                )}

                {activeDialog.type === 'prompt_email' && (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Subject Line</label>
                      <input
                        type="text"
                        value={dialogInput1}
                        onChange={(e) => setDialogInput1(e.target.value)}
                        placeholder="e.g. Action Required: Update your account details"
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/30">Email Message (HTML / Text)</label>
                      <textarea
                        value={dialogInput2}
                        onChange={(e) => setDialogInput2(e.target.value)}
                        placeholder="Type your message content here..."
                        rows={6}
                        className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setActiveDialog(null)}
                    className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      activeDialog.onConfirm(dialogInput1, dialogInput2);
                      setActiveDialog(null);
                    }}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider rounded-xl transition-all"
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
    </motion.div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, iconColor, gauge }: any) {
  return (
    <div className={`${ADMIN_THEME.background.tertiary} border ${ADMIN_THEME.border.primary} rounded-3xl p-5 space-y-4 shadow-sm hover:shadow-md transition-all group`}>
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <h4 className={`text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest`}>{title}</h4>
      </div>
      <div className="space-y-1">
        <div className="flex items-end gap-2">
          <span className={`text-2xl font-black ${ADMIN_THEME.text.primary}`}>{value}</span>
          {gauge && <span className={`text-xs font-bold ${ADMIN_THEME.text.muted} mb-1`}>/100</span>}
        </div>
        {gauge && (
          <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full ${iconColor.replace('text', 'bg')}`} style={{ width: `${value}%` }} />
          </div>
        )}
        <p className={`text-[10px] font-bold ${ADMIN_THEME.text.tertiary}`}>{subValue}</p>
      </div>
    </div>
  );
}

function PipelineItem({ label, value, total, color }: any) {
  return (
    <div className={`flex items-center justify-between text-[10px] font-bold`}>
      <div className={`flex items-center gap-2 ${ADMIN_THEME.text.secondary}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
        <span>{label}</span>
      </div>
      <span className={ADMIN_THEME.text.primary}>{value} ({total > 0 ? Math.round((value / total) * 100) : 0}%)</span>
    </div>
  );
}

function UsageBar({ label, value, color }: any) {
  return (
    <div className="space-y-1.5">
      <div className={`flex justify-between items-center text-[10px] font-bold`}>
        <span className={ADMIN_THEME.text.secondary}>{label}</span>
        <span className={ADMIN_THEME.text.primary}>{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function CheckItem({ label, value, checked }: any) {
  return (
    <div className={`flex items-center justify-between text-[10px] font-bold`}>
      <div className={`flex items-center gap-2 ${ADMIN_THEME.text.secondary}`}>
        {checked !== undefined ? (
          checked ? <CheckCircle size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-500" />
        ) : <CheckCircle size={14} className="text-slate-300" />}
        <span>{label}</span>
      </div>
      <span className={checked === true ? 'text-emerald-600' : checked === false ? 'text-red-500' : 'text-emerald-800'}>{value || (checked ? 'Yes' : 'No')}</span>
    </div>
  );
}

function AnalysisItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="text-slate-300"><Icon size={16} /></div>
        <span className={`text-xs font-bold ${ADMIN_THEME.text.secondary}`}>{label}</span>
      </div>
      <span className={`text-xs font-black ${ADMIN_THEME.text.primary}`}>{value || '0'}</span>
    </div>
  );
}

function AdminActionButton({ label, icon: Icon, color, className, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 ${ADMIN_THEME.text.tertiary} hover:${ADMIN_THEME.text.secondary} transition-colors py-1 group ${className}`}
    >
      <Icon size={16} className={`${color} shrink-0`} />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

function AdminSecondaryButton({ label, icon: Icon, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 ${ADMIN_THEME.text.tertiary} hover:${ADMIN_THEME.text.secondary} transition-colors py-1 group`}
    >
      <Icon size={16} className={`group-hover:${ADMIN_THEME.text.primary} transition-colors shrink-0`} />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}

function FooterItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 ${ADMIN_THEME.background.secondary} border ${ADMIN_THEME.border.primary} rounded-lg text-slate-400`}><Icon size={16} /></div>
      <div>
        <p className={`text-[10px] font-black ${ADMIN_THEME.text.tertiary} uppercase tracking-widest mb-0.5`}>{label}</p>
        <p className={`text-[11px] font-bold ${ADMIN_THEME.text.primary}`}>{value}</p>
      </div>
    </div>
  );
}
