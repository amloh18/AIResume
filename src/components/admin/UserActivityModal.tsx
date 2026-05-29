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

export default function UserActivityModal({ userId, isOpen, onClose }: { userId: string; isOpen: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<UserActivityData | null>(null);

  useEffect(() => {
    if (isOpen && userId) fetchUserActivity();
  }, [isOpen, userId]);

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

  if (!isOpen) return null;

  return (
    <motion.div 
      className={`w-full h-full min-h-[850px] ${ADMIN_THEME.background.secondary} border ${ADMIN_THEME.border.primary} rounded-3xl shadow-3xl overflow-hidden flex flex-col animate-in fade-in zoom-in duration-300 relative z-10`}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
    >
      {/* Top Header */}
      <div className={`flex items-center justify-between px-8 py-5 border-b ${ADMIN_THEME.border.primary} bg-emerald-50/50`}>
        <div className="flex items-center gap-4">
          <div className={`text-xs font-black ${ADMIN_THEME.text.tertiary} flex items-center gap-2 uppercase tracking-widest`}>
            Admin <ChevronRight size={12} /> Users <ChevronRight size={12} /> <span className="text-emerald-600">{data?.user?.firstName} {data?.user?.lastName}</span>
          </div>
        </div>
        <button 
          onClick={onClose} 
          className={`px-5 py-2.5 ${ADMIN_THEME.button.primary} text-white rounded-full text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20`}
        >
          <ChevronLeft size={16} /> Back to Directory
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <Loader2 className={`animate-spin text-emerald-600`} size={40} />
            <p className={`${ADMIN_THEME.text.secondary} font-bold text-center`}>Retrieving deep user insights...</p>
          </div>
        ) : data ? (
          <>
            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
              
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
                      <span className="truncate">Joined: {format(new Date(data.user.registrationDate), 'dd MMM yyyy')}</span>
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
                          {data.metrics.subscription?.currentPeriodEnd 
                            ? format(new Date(data.metrics.subscription.currentPeriodEnd), 'dd MMM yy') 
                            : 'N/A'}
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
                        <span className={`ml-auto text-[10px] font-black ${ADMIN_THEME.text.muted} shrink-0`}>{formatDistanceToNow(new Date(act.timestamp))} ago</span>
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
                        onClick={async () => {
                          const content = prompt('Enter support note:');
                          if (content) {
                            try {
                              const res = await fetch(`/api/admin/users/${userId}/notes`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ content })
                              });
                              if (res.ok) fetchUserActivity();
                            } catch (err) { console.error(err); }
                          }
                        }}
                        className={`text-[10px] font-black text-emerald-700 uppercase tracking-widest flex items-center gap-1 hover:text-emerald-800 transition-colors`}
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
                            <span>{format(new Date(note.timestamp), 'dd MMM yyyy')}</span>
                          </div>
                        </div>
                      )) : <p className={`text-xs ${ADMIN_THEME.text.muted} font-bold italic`}>No support notes for this user.</p>}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Right Admin Sidebar */}
            <div className={`w-full lg:w-[320px] ${ADMIN_THEME.background.tertiary} border-t lg:border-t-0 lg:border-l ${ADMIN_THEME.border.primary} p-6 md:p-8 flex flex-col gap-8`}>
              <div className="space-y-6">
                <h3 className={`text-sm font-black uppercase tracking-widest ${ADMIN_THEME.text.primary}`}>Admin Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                  <AdminActionButton label="Grant Smart Plan" icon={Zap} color="text-emerald-600" />
                  <AdminActionButton label="Grant Focused Plan" icon={Zap} color="text-purple-600" />
                  <AdminActionButton label="Downgrade to Starter" icon={TrendingUp} color="text-orange-600" className="rotate-180" />
                  <AdminActionButton label="Extend Plan (30 Days)" icon={History} color="text-blue-600" />
                  <AdminActionButton label="Cancel Subscription" icon={XCircle} color="text-red-600" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
                <AdminSecondaryButton label="Reset Password" icon={Lock} />
                <AdminSecondaryButton label="Force Logout" icon={LogOut} />
                <AdminSecondaryButton label="Resend Welcome" icon={Mail} />
                <AdminSecondaryButton label="Verify Email" icon={CheckCircle} />
                <AdminSecondaryButton label="Clear Cache" icon={RefreshCcw} />
              </div>

              <div className="mt-auto pt-8 border-t border-slate-200 space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Danger Zone</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                  <button className="flex items-center gap-3 text-red-500 hover:text-red-700 transition-colors group">
                    <Ban size={18} className="shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold">Suspend Account</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 text-red-500 hover:text-red-700 transition-colors group">
                    <Trash2 size={18} className="shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold">Delete All Data</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 text-red-700 hover:text-red-900 transition-colors group">
                    <Trash2 size={18} className="shrink-0" />
                    <div className="text-left">
                      <p className="text-xs font-bold">Delete User</p>
                      <p className={`text-[9px] font-black uppercase tracking-tight ${ADMIN_THEME.text.muted}`}>Permanent</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4 pt-8 border-t border-slate-200">
                <FooterItem icon={Clock} label="Last Active" value={data.user.lastActive ? format(new Date(data.user.lastActive), 'dd MMM yy, HH:mm') : 'N/A'} />
                <FooterItem icon={Globe} label="IP Address" value={data.user.ipAddress || 'Unknown'} />
                <FooterItem icon={MapPin} label="Location" value={data.user.ip_location || 'Unknown'} />
              </div>
            </div>
          </>
        ) : null}
      </div>
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

function AdminActionButton({ label, icon: Icon, color, className }: any) {
  return (
    <button className={`w-full p-3 bg-white hover:bg-slate-50 border border-slate-100 rounded-xl flex items-center gap-3 transition-all group shadow-sm ${className}`}>
      <Icon size={16} className={color} />
      <span className={`text-xs font-bold ${ADMIN_THEME.text.secondary} group-hover:${ADMIN_THEME.text.primary}`}>{label}</span>
    </button>
  );
}

function AdminSecondaryButton({ label, icon: Icon }: any) {
  return (
    <button className={`w-full flex items-center gap-3 ${ADMIN_THEME.text.tertiary} hover:${ADMIN_THEME.text.secondary} transition-colors py-1 group`}>
      <Icon size={16} className={`group-hover:${ADMIN_THEME.text.primary} transition-colors`} />
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
