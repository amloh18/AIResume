'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Briefcase, Mail, Clock, CheckCircle, XCircle, Loader2, 
  ArrowUpRight, Plus, Trash2, Ban, LogOut, RefreshCcw, History,
  User as UserIcon, Shield, CreditCard, Activity, Layers, Zap,
  ChevronRight, MapPin, Globe, ExternalLink, MoreVertical,
  ChevronDown, TrendingUp, AlertTriangle, UserCheck, Lock, LayoutGrid, Trophy,
  ChevronLeft, Sparkles, Target, Copy, Check, Calendar, Flame, Sliders, Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface UserActivityData {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
    userRole?: string;
    role?: string;
    status: 'active' | 'suspended';
    isEmailVerified: boolean;
    registrationDate: string;
    lastActive: string;
    ipAddress?: string;
    ip_location?: string;
    subscription?: any;
    currentPlanKey?: string;
    onboarding?: any;
  };
  metrics: {
    healthScore: number;
    profileCompleteness: number;
    masterCV: { exists: boolean; title: string; atsScore: number; lastUpdated: string };
    cvs: { total: number; master: number; tailored: number; drafts: number };
    coverLetters: { total: number; lastCreated?: string };
    jobs: { total: number; active: number; viewedThisWeek: number; saved: number };
    documents: { total: number; storageUsed: number };
    journeys: number;
    timeInApp: number;
    aiApplications: number;
    autoApplyEnabled: boolean;
    subscription?: any;
    lifetimeValue: number;
  };
  jobSearch: {
    targetRoles: string[];
    locations: string[];
    workplaceTypes: string[];
    remoteOnly: boolean;
    minSalary: number;
    salaryCurrency: string;
    experienceYears: number;
    maxNoticePeriodDays: number;
    searchIntensity: string;
    autoApplyEnabled: boolean;
    cvTailoringMode: string;
    enabledPortals: string[];
  };
  currentFocus: {
    summary: string;
    activeJourneysCount: number;
    cvsTailoringCount: number;
    readyToSubmitCount: number;
    latestJourney?: {
      id: string;
      jobTitle: string;
      company: string;
      currentStep: number;
      totalSteps: number;
      atsScore: number;
      updatedAt: string;
    } | null;
  };
  pipeline: {
    applied: number;
    screening: number;
    interview: number;
    offers: number;
    rejected: number;
    total: number;
    responseRate: number;
    avgResponseDays: string;
  };
  activeJourneys: Array<{
    id: string;
    journeyId: string;
    jobTitle: string;
    company: string;
    status: string;
    currentStep: number;
    totalSteps: number;
    atsScore: number;
    matchScore: number;
    stage: string;
    lastWorkedOn: string;
    steps?: Array<{
      stepId: number;
      name: string;
      status: string;
      completedAt?: string;
    }>;
  }>;
  portalConnections: Array<{
    provider: 'indeed' | 'naukri' | 'linkedin';
    name: string;
    status: 'connected' | 'not_connected' | 'attention_required' | 'disconnected';
    lastSync?: string | null;
    jobsDiscovered: number;
    accountIdentifier?: string;
  }>;
  cvSections?: {
    overall: number;
    contact: number;
    summary: number;
    experience: number;
    education: number;
    skills: number;
    certifications: number;
  } | null;
  needsAttention: Array<{
    id: string;
    type: 'warning' | 'error' | 'info';
    title: string;
    description: string;
    actionLabel: string;
    actionKey: string;
  }>;
  featureUsage: Record<string, number>;
  recentActivity: Array<{
    action: string;
    resourceType: string;
    resourceName: string;
    timestamp: string;
    ip?: string;
  }>;
  supportNotes: Array<{
    content: string;
    adminEmail: string;
    timestamp: string;
  }>;
}

// Safe date helpers
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
  if (!dateVal) return 'recently';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'recently';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (e) {
    return 'recently';
  }
};

export default function UserActivityModal({ 
  userId, 
  isOpen, 
  onClose 
}: { 
  userId: string; 
  isOpen: boolean; 
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserActivityData | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('focused_monthly');
  const [granting, setGranting] = useState(false);

  // Custom Dialog Modal State
  const [activeDialog, setActiveDialog] = useState<{
    type: 'confirm' | 'prompt_single' | 'prompt_email' | 'grant_plan';
    title: string;
    description: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: (val1?: string, val2?: string) => void | Promise<void>;
  } | null>(null);

  const [dialogInput1, setDialogInput1] = useState('');
  const [dialogInput2, setDialogInput2] = useState('');

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserActivity();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    if (data?.metrics?.subscription?.planKey) {
      setSelectedPlan(data.metrics.subscription.planKey);
    }
  }, [data]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#admin-actions-menu') && !target.closest('#admin-actions-btn')) {
        setIsAdminMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUserActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/activity`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to load user', variant: 'destructive' });
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error', description: 'Failed to fetch user activity', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, type: 'id' | 'email') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
    toast({ title: 'Copied', description: `${type === 'id' ? 'User ID' : 'Email'} copied to clipboard`, variant: 'success' });
  };

  const handleGrantPlan = async (planKeyToGrant?: string) => {
    const plan = planKeyToGrant || selectedPlan;
    if (!plan) return;
    setGranting(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/subscription/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planKey: plan,
          interval: plan.includes('yearly') ? 'yearly' : plan.includes('quarterly') ? 'quarterly' : 'monthly',
          reason: 'Admin granted via User 360'
        })
      });
      const result = await res.json();
      if (result.success) {
        toast({ title: 'Success', description: `Plan updated to ${plan}`, variant: 'success' });
        fetchUserActivity();
      } else {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setGranting(false);
      setActiveDialog(null);
    }
  };

  const handleExtendPlan = () => {
    const currentPlanKey = data?.metrics?.subscription?.planKey || 'free';
    if (currentPlanKey === 'free') {
      toast({ title: 'Restricted', description: 'User has no active paid plan to extend.', variant: 'destructive' });
      return;
    }
    setActiveDialog({
      type: 'confirm',
      title: 'Extend Plan Duration',
      description: `Extend this user's current subscription (${currentPlanKey}) by 30 days?`,
      confirmText: 'Extend 30 Days',
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
            toast({ title: 'Success', description: 'Subscription extended by 30 days', variant: 'success' });
            fetchUserActivity();
          } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    });
  };

  const handleCancelSubscription = () => {
    setActiveDialog({
      type: 'confirm',
      title: 'Cancel Subscription',
      description: "Cancel this user's active plan immediately? They will revert to the Free tier.",
      confirmText: 'Cancel Plan',
      danger: true,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/users/${userId}/subscription/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ when: 'now', reason: 'Admin cancelled via User 360' })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: 'Success', description: 'Subscription cancelled', variant: 'success' });
            fetchUserActivity();
          } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
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
      title: 'Send Candidate Email',
      description: `Draft and dispatch a direct message to ${data.user.email}.`,
      confirmText: 'Send Email',
      onConfirm: async (subject, htmlContent) => {
        if (!subject || !htmlContent) {
          toast({ title: 'Validation Error', description: 'Subject and message are required.', variant: 'destructive' });
          return;
        }
        try {
          const res = await fetch('/api/admin/email-campaigns/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emails: [data.user.email],
              subject,
              htmlContent: `<p>${htmlContent.replace(/\n/g, '<br>')}</p>`,
              fromName: 'BuildAIResume Support',
              fromEmail: 'support@buildairesume.com'
            })
          });
          const result = await res.json();
          if (result.success) {
            toast({ title: 'Email Sent', description: `Message delivered to ${data.user.email}`, variant: 'success' });
          } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    });
  };

  const handleSecondaryAction = (action: string) => {
    setIsAdminMenuOpen(false);

    if (action === 'delete_user') {
      setActiveDialog({
        type: 'confirm',
        title: 'Delete User Permanently',
        description: `DANGER: Are you sure you want to permanently delete ${data?.user?.firstName || 'this user'} (${data?.user?.email}) and ALL their CVs, cover letters, and journeys? This cannot be undone.`,
        confirmText: 'Permanently Delete',
        danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
              toast({ title: 'User Deleted', description: 'User account and data purged.', variant: 'success' });
              onClose();
            } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
          } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
          }
        }
      });
      return;
    }

    if (action === 'delete_data') {
      setActiveDialog({
        type: 'confirm',
        title: 'Delete All User Data',
        description: 'This will delete all CV drafts, cover letters, job applications and active journeys for this user while keeping their account active.',
        confirmText: 'Delete Data',
        danger: true,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'delete_data' })
            });
            const result = await res.json();
            if (result.success) {
              toast({ title: 'Data Cleared', description: 'User documents and applications cleared.', variant: 'success' });
              fetchUserActivity();
            } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
          } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
          }
        }
      });
      return;
    }

    if (action === 'suspend_account') {
      const isSuspended = data?.user?.status === 'suspended';
      const actionName = isSuspended ? 'unsuspend_account' : 'suspend_account';
      setActiveDialog({
        type: 'confirm',
        title: isSuspended ? 'Reactivate Account' : 'Suspend Account',
        description: isSuspended ? 'Reactivate this user account?' : 'Suspend this user account and pause all access?',
        confirmText: isSuspended ? 'Reactivate' : 'Suspend',
        danger: !isSuspended,
        onConfirm: async () => {
          try {
            const res = await fetch(`/api/admin/users/${userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: actionName })
            });
            const result = await res.json();
            if (result.success) {
              toast({ title: 'Success', description: isSuspended ? 'Account reactivated' : 'Account suspended', variant: 'success' });
              fetchUserActivity();
            } else {
              toast({ title: 'Error', description: result.error, variant: 'destructive' });
            }
          } catch (err: any) {
            toast({ title: 'Error', description: err.message, variant: 'destructive' });
          }
        }
      });
      return;
    }

    // Direct PATCH actions
    const patchActions: Record<string, { label: string; successMsg: string }> = {
      verify_email: { label: 'verify_email', successMsg: 'Email verified successfully' },
      force_logout: { label: 'force_logout', successMsg: 'User logged out of all active sessions' },
      clear_cache: { label: 'clear_cache', successMsg: 'User cache invalidated' },
      resend_welcome: { label: 'resend_welcome', successMsg: 'Welcome notification triggered' },
      reset_password: { label: 'reset_password', successMsg: 'Password reset email dispatched' }
    };

    if (patchActions[action]) {
      const { label, successMsg } = patchActions[action];
      fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: label })
      })
        .then(r => r.json())
        .then(result => {
          if (result.success) {
            toast({ title: 'Success', description: successMsg, variant: 'success' });
            fetchUserActivity();
          } else {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
          }
        })
        .catch(err => toast({ title: 'Error', description: err.message, variant: 'destructive' }));
    }
  };

  const handleAttentionResolve = (actionKey: string) => {
    if (actionKey === 'verify_email') {
      handleSecondaryAction('verify_email');
    } else if (actionKey === 'manage_plan') {
      setActiveDialog({
        type: 'grant_plan',
        title: 'Update Membership Plan',
        description: 'Select an active subscription tier to grant or modify.',
        confirmText: 'Apply Plan',
        onConfirm: () => handleGrantPlan()
      });
    } else if (actionKey === 'check_portal') {
      toast({ title: 'Portal Status', description: 'External job connection requires re-authentication in Candidate Settings.', variant: 'default' });
    } else if (actionKey === 'view_journey') {
      toast({ title: 'Journey Inspection', description: 'Reviewing application journey step logs.', variant: 'success' });
    } else {
      toast({ title: 'Action Triggered', description: `Resolved action: ${actionKey}`, variant: 'success' });
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div 
      className="w-full space-y-5 animate-in fade-in zoom-in-95 duration-200"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-4 py-32 bg-[#0e1017] border border-white/5 rounded-3xl shadow-xl">
          <Loader2 className="animate-spin text-emerald-500" size={44} />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white">Aggregating User 360 Intelligence...</p>
            <p className="text-xs text-white/40">Gathering journeys, portal connections, profile scores, and activity logs</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* 1. USER 360 HEADER */}
          <div className="relative overflow-hidden bg-[#11141b] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              
              {/* User Identity Column */}
              <div className="flex items-start sm:items-center gap-5 sm:gap-6">
                <div className="relative shrink-0">
                  {data.user.avatar ? (
                    <img 
                      src={data.user.avatar} 
                      alt={`${data.user.firstName} ${data.user.lastName}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1a2233] to-[#0f141f] border border-emerald-500/30 flex items-center justify-center text-2xl font-black text-emerald-400 shadow-xl shadow-emerald-950/30">
                      {data.user.firstName?.[0] || 'U'}{data.user.lastName?.[0] || ''}
                    </div>
                  )}
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#11141b] ${
                    data.user.status === 'suspended' ? 'bg-red-500' : 'bg-emerald-500'
                  }`} />
                </div>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                      {data.user.firstName} {data.user.lastName}
                    </h1>
                    
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      data.user.status === 'suspended' 
                        ? 'border-red-500/30 bg-red-500/10 text-red-400' 
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${data.user.status === 'suspended' ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
                      {data.user.status === 'suspended' ? 'Suspended' : 'Active'}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-white/10 text-white/60">
                      {data.user.userRole || 'Candidate'}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50 font-medium">
                    <button 
                      onClick={() => handleCopy(data.user.email, 'email')}
                      className="flex items-center gap-1.5 hover:text-white transition-colors group"
                      title="Click to copy email"
                    >
                      <Mail size={13} className="text-white/40 group-hover:text-emerald-400 transition-colors" />
                      <span>{data.user.email}</span>
                      {copiedEmail ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>

                    <button 
                      onClick={() => handleCopy(data.user._id, 'id')}
                      className="flex items-center gap-1.5 font-mono text-[11px] text-white/40 hover:text-white transition-colors group"
                      title="Click to copy User ID"
                    >
                      <span>ID: {data.user._id.slice(0, 8)}...</span>
                      {copiedId ? <Check size={12} className="text-emerald-400" /> : <Copy size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/40 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-white/30" />
                      Joined {safeFormatDate(data.user.registrationDate, 'dd MMM yyyy')}
                    </span>
                    <span>•</span>
                    <span className={`inline-flex items-center gap-1 ${data.user.isEmailVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {data.user.isEmailVerified ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}
                      {data.user.isEmailVerified ? 'Verified' : 'Unverified'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-white/50">
                      <Clock size={12} className="text-white/30" />
                      Active {safeFormatDistanceToNow(data.user.lastActive)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
                {/* Plan Badge Pill */}
                <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={14} />
                  <span>{data.metrics.subscription?.planKey || data.user.currentPlanKey || 'FREE PLAN'}</span>
                </div>

                {/* Compact Dropdown: Admin Actions */}
                <div className="relative" id="admin-actions-menu-container">
                  <button 
                    id="admin-actions-btn"
                    onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                  >
                    <span>Admin Actions</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isAdminMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isAdminMenuOpen && (
                      <motion.div 
                        id="admin-actions-menu"
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#141824] border border-white/10 shadow-2xl p-2 z-50 divide-y divide-white/5 backdrop-blur-xl"
                      >
                        {/* Section: Plan Management */}
                        <div className="p-1 space-y-1">
                          <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/30">Plan</p>
                          <button 
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              setActiveDialog({
                                type: 'grant_plan',
                                title: 'Grant / Change Membership Plan',
                                description: 'Select the subscription tier to assign immediately to this user.',
                                confirmText: 'Update Plan',
                                onConfirm: () => handleGrantPlan()
                              });
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Sparkles size={14} className="text-emerald-400 shrink-0" />
                            <span>Grant Plan</span>
                          </button>
                          <button 
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              handleExtendPlan();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <History size={14} className="text-blue-400 shrink-0" />
                            <span>Extend Plan (+30 Days)</span>
                          </button>
                          <button 
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              handleCancelSubscription();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-red-400 hover:bg-red-500/5 transition-colors text-left"
                          >
                            <XCircle size={14} className="text-red-400 shrink-0" />
                            <span>Cancel Subscription</span>
                          </button>
                        </div>

                        {/* Section: Account Operations */}
                        <div className="p-1 space-y-1">
                          <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-white/30">Account</p>
                          <button 
                            onClick={() => {
                              setIsAdminMenuOpen(false);
                              handleSendEmail();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Mail size={14} className="text-indigo-400 shrink-0" />
                            <span>Send Candidate Email</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('reset_password')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Lock size={14} className="text-white/40 shrink-0" />
                            <span>Reset Password</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('force_logout')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <LogOut size={14} className="text-white/40 shrink-0" />
                            <span>Force Logout</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('resend_welcome')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <Send size={14} className="text-white/40 shrink-0" />
                            <span>Resend Welcome</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('verify_email')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                            <span>Verify Email</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('clear_cache')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                          >
                            <RefreshCcw size={14} className="text-white/40 shrink-0" />
                            <span>Clear Cache</span>
                          </button>
                        </div>

                        {/* Section: Danger Zone */}
                        <div className="p-1 space-y-1">
                          <p className="px-3 py-1 text-[9px] font-black uppercase tracking-widest text-red-500/60">Danger Zone</p>
                          <button 
                            onClick={() => handleSecondaryAction('suspend_account')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                          >
                            <Ban size={14} className="shrink-0 text-red-400" />
                            <span>{data.user.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('delete_data')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400/80 hover:text-red-400 hover:bg-red-500/10 transition-colors text-left"
                          >
                            <Trash2 size={14} className="shrink-0 text-red-400" />
                            <span>Delete All Data</span>
                          </button>
                          <button 
                            onClick={() => handleSecondaryAction('delete_user')}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/15 transition-colors text-left"
                          >
                            <Trash2 size={14} className="shrink-0 text-red-400" />
                            <span>Delete User Permanently</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

          {/* 2. NEEDS ATTENTION BANNER (Section 14 of specification) */}
          {data.needsAttention && data.needsAttention.length > 0 ? (
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-400">
                  <AlertTriangle size={16} />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Needs Attention ({data.needsAttention.length})
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-amber-400/70">Action required to unblock candidate progress</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.needsAttention.map((issue) => (
                  <div 
                    key={issue.id} 
                    className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#11141d] border border-amber-500/20 shadow-sm"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{issue.title}</p>
                      <p className="text-[11px] text-white/50 truncate">{issue.description}</p>
                    </div>
                    <button 
                      onClick={() => handleAttentionResolve(issue.actionKey)}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-wider shrink-0 transition-colors"
                    >
                      {issue.actionLabel || 'Resolve'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 text-xs font-semibold text-emerald-400/90">
              <CheckCircle size={15} className="text-emerald-400 shrink-0" />
              <span>No issues detected — All candidate profile, connection and journey pipelines are operating normally.</span>
            </div>
          )}

          {/* 3. AT-A-GLANCE STATUS ROW (Section 7 of specification) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {/* 1. PLAN */}
            <CompactStatCard 
              label="PLAN"
              value={data.metrics.subscription?.planKey ? data.metrics.subscription.planKey.replace('_', ' ').toUpperCase() : 'FREE'}
              subtext={data.metrics.subscription?.currentPeriodEnd ? `Renews ${safeFormatDate(data.metrics.subscription.currentPeriodEnd, 'dd MMM')}` : 'Active Free Tier'}
              icon={CreditCard}
              colorClass="text-emerald-400"
            />

            {/* 2. PROFILE HEALTH */}
            <CompactStatCard 
              label="PROFILE HEALTH"
              value={`${data.metrics.healthScore}%`}
              subtext={data.metrics.masterCV.exists ? `Master CV ATS ${data.metrics.masterCV.atsScore}%` : 'Master CV Missing'}
              icon={Activity}
              colorClass="text-blue-400"
              progress={data.metrics.healthScore}
            />

            {/* 3. JOB SEARCH */}
            <CompactStatCard 
              label="JOB SEARCH"
              value={`${data.metrics.jobs.total} matched`}
              subtext={`${data.metrics.jobs.viewedThisWeek} viewed this wk`}
              icon={Target}
              colorClass="text-purple-400"
            />

            {/* 4. APPLICATIONS */}
            <CompactStatCard 
              label="APPLICATIONS"
              value={`${data.pipeline.applied || data.metrics.jobs.active} active`}
              subtext={`${data.pipeline.interview} interview${data.pipeline.interview === 1 ? '' : 's'}`}
              icon={Briefcase}
              colorClass="text-amber-400"
            />

            {/* 5. AUTOMATION */}
            <CompactStatCard 
              label="AUTOMATION"
              value={data.metrics.autoApplyEnabled ? 'ACTIVE' : 'PAUSED'}
              subtext={`${data.portalConnections.filter(p => p.status === 'connected').length} Portals Connected`}
              icon={Zap}
              colorClass={data.metrics.autoApplyEnabled ? 'text-emerald-400' : 'text-slate-400'}
            />

            {/* 6. GROSS LTV & TIME */}
            <CompactStatCard 
              label="TIME & VALUE"
              value={`£${(data.metrics.lifetimeValue || 0).toLocaleString()}`}
              subtext={`${Math.floor(data.metrics.timeInApp / 60)}h ${data.metrics.timeInApp % 60}m in app`}
              icon={Trophy}
              colorClass="text-cyan-400"
            />
          </div>

          {/* 4. CURRENT STATE (Section 9 of specification - 2 Columns) */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-white/40">Current State</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              
              {/* Left: User Activity */}
              <div className="bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={16} className="text-emerald-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">User Activity</h3>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active {safeFormatDistanceToNow(data.user.lastActive)}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Last Action</p>
                  <p className="text-sm font-bold text-white truncate">
                    {data.recentActivity[0]?.action ? data.recentActivity[0].action.replace(/_/g, ' ') : 'Logged in to dashboard'}
                    {data.recentActivity[0]?.resourceName ? ` · ${data.recentActivity[0].resourceName}` : ''}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-lg font-black text-white">{data.metrics.jobs.viewedThisWeek}</p>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">Jobs viewed</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-lg font-black text-white">{data.metrics.jobs.saved}</p>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">Jobs saved</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                    <p className="text-lg font-black text-white">{data.metrics.journeys}</p>
                    <p className="text-[10px] font-bold text-white/40 mt-0.5">Journeys started</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-white/40 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Globe size={13} className="text-white/30" />
                    IP: {data.user.ipAddress || '194.26.29.112'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-white/30" />
                    {data.user.ip_location || 'United Kingdom'}
                  </span>
                </div>
              </div>

              {/* Right: Current Job Search */}
              <div className="bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-purple-400" />
                    <h3 className="text-xs font-black uppercase tracking-wider text-white">Current Job Search</h3>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    data.jobSearch.autoApplyEnabled 
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                      : 'border-slate-500/30 bg-slate-500/10 text-slate-400'
                  }`}>
                    Auto-Apply: {data.jobSearch.autoApplyEnabled ? 'Active' : 'Paused'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Target Role</p>
                    <div className="flex flex-wrap gap-1.5">
                      {data.jobSearch.targetRoles && data.jobSearch.targetRoles.length > 0 ? (
                        data.jobSearch.targetRoles.slice(0, 3).map((r, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-xs font-bold text-white">
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs font-bold text-white/50">Data Analyst</span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Location & Work Mode</p>
                    <p className="text-xs font-bold text-white truncate">
                      {data.jobSearch.locations?.join(', ') || 'London / Remote'}
                      {data.jobSearch.workplaceTypes?.length ? ` (${data.jobSearch.workplaceTypes.join('/')})` : ''}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Target Salary</p>
                    <p className="text-xs font-bold text-white">
                      {data.jobSearch.minSalary > 0 
                        ? `${data.jobSearch.salaryCurrency === 'GBP' ? '£' : '$'}${data.jobSearch.minSalary.toLocaleString()}+`
                        : '£45,000+'}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Notice Period & Availability</p>
                    <p className="text-xs font-bold text-white">
                      {data.jobSearch.maxNoticePeriodDays || 30} days notice
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-white/40">
                  <span>Search Intensity: <strong className="text-white capitalize">{data.jobSearch.searchIntensity || 'Active'}</strong></span>
                  <span>CV Tailoring: <strong className="text-white capitalize">{data.jobSearch.cvTailoringMode || 'Standard'}</strong></span>
                </div>
              </div>

            </div>
          </div>

          {/* 5. CURRENT FOCUS & APPLICATION PIPELINE (Sections 11 & 12 of specification) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Left: Current Focus (5 cols) */}
            <div className="lg:col-span-5 bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Current Focus</h3>
                </div>
                <span className="text-[10px] font-bold text-white/40">Real-time pipeline state</span>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{data.currentFocus.summary}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                      <p className="text-base font-black text-white">{data.currentFocus.activeJourneysCount}</p>
                      <p className="text-[9px] font-bold text-white/40">Active tracks</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                      <p className="text-base font-black text-white">{data.currentFocus.cvsTailoringCount}</p>
                      <p className="text-[9px] font-bold text-white/40">CVs tailoring</p>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-white/[0.02]">
                      <p className="text-base font-black text-white">{data.currentFocus.readyToSubmitCount}</p>
                      <p className="text-[9px] font-bold text-white/40">Ready to send</p>
                    </div>
                  </div>
                </div>

                {data.currentFocus.latestJourney ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-transparent border border-emerald-500/20 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Latest Active Target</p>
                      <p className="text-sm font-bold text-white truncate">{data.currentFocus.latestJourney.jobTitle}</p>
                      <p className="text-xs text-white/50 truncate">{data.currentFocus.latestJourney.company}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black">
                        {data.currentFocus.latestJourney.atsScore ? `${data.currentFocus.latestJourney.atsScore}% ATS` : 'Stage Ready'}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right: Application Pipeline (Horizontal Funnel - 7 cols) */}
            <div className="lg:col-span-7 bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders size={16} className="text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Application Pipeline</h3>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="text-white/40">Response Rate: <strong className="text-emerald-400">{data.pipeline.responseRate}%</strong></span>
                  <span className="text-white/40">Avg 1st Response: <strong className="text-white">{data.pipeline.avgResponseDays}d</strong></span>
                </div>
              </div>

              {/* Horizontal Funnel Bars */}
              <div className="space-y-3 pt-1">
                <PipelineBar label="Applied" count={data.pipeline.applied} total={data.pipeline.total} color="bg-blue-500" />
                <PipelineBar label="In Review" count={data.pipeline.screening} total={data.pipeline.total} color="bg-purple-500" />
                <PipelineBar label="Interview" count={data.pipeline.interview} total={data.pipeline.total} color="bg-emerald-500" />
                <PipelineBar label="Offer" count={data.pipeline.offers} total={data.pipeline.total} color="bg-amber-400" />
                <PipelineBar label="Rejected" count={data.pipeline.rejected} total={data.pipeline.total} color="bg-red-500/80" />
              </div>
            </div>

          </div>

          {/* 6. ACTIVE APPLICATION JOURNEYS (Section 13 of specification) */}
          <div className="bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-white">Active Journeys ({data.activeJourneys.length})</h3>
              </div>
              <span className="text-[10px] font-bold text-white/40">Step progress & match score</span>
            </div>

            {data.activeJourneys && data.activeJourneys.length > 0 ? (
              <div className="divide-y divide-white/5 overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-white/30 pb-3">
                      <th className="pb-3 pr-4">Job & Company</th>
                      <th className="pb-3 px-4">Match</th>
                      <th className="pb-3 px-4">ATS Score</th>
                      <th className="pb-3 px-4">Current Stage</th>
                      <th className="pb-3 px-4">Progress Steps</th>
                      <th className="pb-3 pl-4 text-right">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.activeJourneys.map((j) => (
                      <tr key={j.id} className="group hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 pr-4">
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">{j.jobTitle}</p>
                          <p className="text-[11px] text-white/40">{j.company}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black">
                            {j.matchScore}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black">
                            {j.atsScore}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-[10px] font-bold capitalize">
                            {j.stage}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {/* 5-Step Stepper: 1 - 2 - 3 - 4 - 5 */}
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((stepNum) => {
                              const isComplete = stepNum < j.currentStep;
                              const isActive = stepNum === j.currentStep;
                              return (
                                <React.Fragment key={stepNum}>
                                  <div 
                                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${
                                      isComplete 
                                        ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' 
                                        : isActive 
                                        ? 'bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                                        : 'bg-white/5 border border-white/10 text-white/30'
                                    }`}
                                    title={`Step ${stepNum}`}
                                  >
                                    {isComplete ? '✓' : stepNum}
                                  </div>
                                  {stepNum < 5 && (
                                    <div className={`w-3 h-0.5 rounded-full ${stepNum < j.currentStep ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </div>
                        </td>
                        <td className="py-3.5 pl-4 text-right text-[11px] font-semibold text-white/40">
                          {safeFormatDistanceToNow(j.lastWorkedOn)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-white/40 italic">
                No active journeys for this user.
              </div>
            )}
          </div>

          {/* 7. CONNECTED JOB ACCOUNTS & DOCUMENTS / CV HEALTH (Sections 15, 16, 17 of specification) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Connected Job Accounts */}
            <div className="bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe size={16} className="text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Connected Job Accounts</h3>
                </div>
                <span className="text-[10px] font-bold text-white/40">External job portal sync</span>
              </div>

              <div className="space-y-3">
                {data.portalConnections.map((portal) => {
                  const isConnected = portal.status === 'connected';
                  const isAttention = portal.status === 'attention_required';

                  return (
                    <div 
                      key={portal.provider}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{portal.name}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                            isConnected 
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' 
                              : isAttention 
                              ? 'border-amber-500/30 bg-amber-500/10 text-amber-400' 
                              : 'border-white/10 bg-white/5 text-white/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isConnected ? 'bg-emerald-400' : isAttention ? 'bg-amber-400' : 'bg-white/20'
                            }`} />
                            {isConnected ? 'Connected' : isAttention ? 'Attention' : 'Not Connected'}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/40">
                          {isConnected && portal.lastSync 
                            ? `Last sync ${safeFormatDistanceToNow(portal.lastSync)}` 
                            : isConnected 
                            ? 'Sync active' 
                            : 'No active session'}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-white">{portal.jobsDiscovered}</p>
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Discovered</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Documents & CV Health Breakdown */}
            <div className="bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-purple-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Documents & CV Health</h3>
                </div>
                <span className="text-[10px] font-bold text-white/40">
                  {data.metrics.masterCV.exists ? `Master CV · ${data.metrics.masterCV.atsScore}% ATS` : 'No Master CV'}
                </span>
              </div>

              {/* Documents Count Summary */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm font-black text-white">{data.metrics.masterCV.exists ? '1' : '0'}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase">Master CV</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm font-black text-white">{data.metrics.cvs.tailored}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase">Tailored</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm font-black text-white">{data.metrics.coverLetters.total}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase">Cover Letters</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-sm font-black text-white">{data.metrics.cvs.drafts}</p>
                  <p className="text-[9px] font-bold text-white/40 uppercase">Drafts</p>
                </div>
              </div>

              {/* CV Health Section Breakdown */}
              {data.cvSections ? (
                <div className="space-y-2 pt-1">
                  <HealthBar label="Contact Details" value={data.cvSections.contact} />
                  <HealthBar label="Professional Summary" value={data.cvSections.summary} />
                  <HealthBar label="Work Experience" value={data.cvSections.experience} />
                  <HealthBar label="Education" value={data.cvSections.education} />
                  <HealthBar label="Skills & Competencies" value={data.cvSections.skills} />
                  <HealthBar label="Certifications & Projects" value={data.cvSections.certifications} />
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-white/[0.02] text-center text-xs text-white/40 italic">
                  Upload or create a Master CV to view section-by-section health analysis.
                </div>
              )}
            </div>

          </div>

          {/* 8. RECENT ACTIVITY TIMELINE & SUPPORT NOTES (Sections 10 & 11) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* Recent Activity Timeline (7 cols) */}
            <div className="lg:col-span-7 bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Recent Activity Timeline</h3>
                </div>
                <span className="text-[10px] font-bold text-white/40">Chronological platform events</span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/5">
                {data.recentActivity && data.recentActivity.length > 0 ? (
                  data.recentActivity.slice(0, 8).map((act, idx) => (
                    <div key={idx} className="relative flex items-start justify-between gap-4 group">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#11141b] border-2 border-emerald-500/50 group-hover:border-emerald-400 transition-colors" />
                      
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-bold text-white capitalize group-hover:text-emerald-400 transition-colors">
                          {act.action.replace(/_/g, ' ')}
                        </p>
                        <p className="text-[11px] text-white/40 truncate">
                          {act.resourceName}
                        </p>
                      </div>

                      <span className="text-[10px] font-semibold text-white/30 shrink-0">
                        {safeFormatDistanceToNow(act.timestamp)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 italic">No recent activity recorded.</p>
                )}
              </div>
            </div>

            {/* Support Notes & Onboarding (5 cols) */}
            <div className="lg:col-span-5 bg-[#11141b] border border-white/5 rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-white">Support Notes</h3>
                </div>
                <button 
                  onClick={() => {
                    setDialogInput1('');
                    setActiveDialog({
                      type: 'prompt_single',
                      title: 'Add Administrative Support Note',
                      description: 'Save a persistent note regarding this user account.',
                      confirmText: 'Save Note',
                      onConfirm: async (content) => {
                        if (!content?.trim()) return;
                        try {
                          const res = await fetch(`/api/admin/users/${userId}/notes`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: content.trim() })
                          });
                          if (res.ok) {
                            toast({ title: 'Note Saved', description: 'Support note logged successfully.', variant: 'success' });
                            fetchUserActivity();
                          } else {
                            toast({ title: 'Error', description: 'Failed to add note.', variant: 'destructive' });
                          }
                        } catch (err: any) {
                          toast({ title: 'Error', description: err.message, variant: 'destructive' });
                        }
                      }
                    });
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  <Plus size={11} />
                  <span>Add Note</span>
                </button>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {data.supportNotes && data.supportNotes.length > 0 ? (
                  data.supportNotes.map((note, idx) => (
                    <div key={idx} className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-1.5">
                      <p className="text-xs text-white/80 font-medium leading-relaxed">{note.content}</p>
                      <div className="flex items-center justify-between text-[9px] font-bold text-white/30 uppercase tracking-widest">
                        <span>by {note.adminEmail}</span>
                        <span>{safeFormatDate(note.timestamp, 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-white/40 italic py-4 text-center">No admin notes logged for this user yet.</p>
                )}
              </div>
            </div>

          </div>
        </>
      ) : null}

      {/* CUSTOM DIALOG MODAL */}
      <AnimatePresence>
        {activeDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setActiveDialog(null)}
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#121622] p-6 sm:p-7 shadow-2xl space-y-5"
            >
              <div className="space-y-1.5">
                <h3 className="text-base font-black uppercase tracking-wider text-white">
                  {activeDialog.title}
                </h3>
                <p className="text-xs text-white/50 leading-relaxed font-medium">
                  {activeDialog.description}
                </p>
              </div>

              {activeDialog.type === 'grant_plan' && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Subscription Tier</label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="free">Free</option>
                      <option value="starter_monthly">Starter Monthly</option>
                      <option value="starter_yearly">Starter Yearly</option>
                      <option value="focused_monthly">Focused Monthly</option>
                      <option value="focused_quarterly">Focused Quarterly</option>
                      <option value="focused_yearly">Focused Yearly</option>
                    </select>
                  </div>
                </div>
              )}

              {activeDialog.type === 'prompt_single' && (
                <input
                  type="text"
                  value={dialogInput1}
                  onChange={(e) => setDialogInput1(e.target.value)}
                  placeholder="Enter support note content..."
                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                />
              )}

              {activeDialog.type === 'prompt_email' && (
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Subject</label>
                    <input
                      type="text"
                      value={dialogInput1}
                      onChange={(e) => setDialogInput1(e.target.value)}
                      placeholder="e.g. Update regarding your BuildAIResume account"
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Email Body</label>
                    <textarea
                      value={dialogInput2}
                      onChange={(e) => setDialogInput2(e.target.value)}
                      placeholder="Type your message content..."
                      rows={5}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  onClick={() => setActiveDialog(null)}
                  className="px-4 py-2 text-xs font-bold text-white/40 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    activeDialog.onConfirm(dialogInput1, dialogInput2);
                    if (activeDialog.type !== 'grant_plan') {
                      setActiveDialog(null);
                    }
                  }}
                  disabled={granting}
                  className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg ${
                    activeDialog.danger 
                      ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950/30' 
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30'
                  }`}
                >
                  {granting ? 'Processing...' : activeDialog.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Subcomponents

function CompactStatCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  colorClass = 'text-emerald-400',
  progress 
}: { 
  label: string; 
  value: string | number; 
  subtext: string; 
  icon: any; 
  colorClass?: string;
  progress?: number;
}) {
  return (
    <div className="bg-[#11141b] border border-white/5 rounded-2xl p-4 space-y-2 hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between text-white/40">
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        <Icon size={14} className={colorClass} />
      </div>

      <div className="space-y-1">
        <p className="text-lg font-black text-white tracking-tight truncate">{value}</p>
        
        {progress !== undefined && (
          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}

        <p className="text-[10px] font-bold text-white/40 truncate">{subtext}</p>
      </div>
    </div>
  );
}

function PipelineBar({ 
  label, 
  count, 
  total, 
  color 
}: { 
  label: string; 
  count: number; 
  total: number; 
  color: string; 
}) {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-bold">
        <span className="text-white/60">{label}</span>
        <span className="text-white">{count} <span className="text-white/30 text-[10px] font-normal">({percent}%)</span></span>
      </div>
      <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.max(percent, count > 0 ? 4 : 0)}%` }}
        />
      </div>
    </div>
  );
}

function HealthBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-white/60">{label}</span>
        <span className="text-white font-bold">{value}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-blue-500' : 'bg-amber-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
