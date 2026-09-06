'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Target,
  MapPin,
  Clock,
  X,
  Save,
  CheckCircle2,
  Globe,
  Briefcase,
  DollarSign,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  Sparkles,
  Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import PortalConnectModal, { PortalType } from '@/components/dashboard/settings/PortalConnectModal';
import ContextualLimitModal from './ContextualLimitModal';
import type { UserEntitlements } from '@/lib/services/entitlement-service';

interface AutoApplyPreferences {
  enabled: boolean;
  targetRoles: string[];
  locations: string[];
  remoteOnly: boolean;
  minSalary: number;
  salaryCurrency: string;
  experienceYears: number;
  maxNoticePeriodDays: number;
  maxPerDay: number;
  useTailoredCV: boolean;
  useCoverLetter: boolean;
  autoAnswerQuestions: boolean;
  enabledPortals: ('naukri' | 'indeed' | 'linkedin' | 'greenhouse' | 'adzuna' | 'lever' | 'ashby' | 'workable')[];
  searchIntensity: 'browsing' | 'exploring' | 'active' | 'aggressive';
  expectedApplicationsPerMonth: number;
  applicationMode: 'find_only' | 'manual_review' | 'automatic';
  defaultJobsTab: 'discover' | 'applications';
}

interface AutoApplyPanelProps {
  userId?: string;
  region?: 'UK' | 'India';
  onProfileSaved?: () => void;
}

const CURRENCY_CONFIG: Record<
  string,
  { label: string; symbol: string; unit: string; presets: number[]; defaultVal: number }
> = {
  INR_LPA: {
    label: 'Indian Rupee (INR)',
    symbol: '₹',
    unit: 'LPA',
    presets: [8, 12, 18, 25, 35, 50],
    defaultVal: 15,
  },
  GBP: {
    label: 'British Pound (GBP)',
    symbol: '£',
    unit: '/year',
    presets: [45000, 65000, 85000, 110000, 140000],
    defaultVal: 65000,
  },
  USD: {
    label: 'US Dollar (USD)',
    symbol: '$',
    unit: '/year',
    presets: [60000, 90000, 120000, 150000, 200000],
    defaultVal: 90000,
  },
  EUR: {
    label: 'Euro (EUR)',
    symbol: '€',
    unit: '/year',
    presets: [50000, 70000, 90000, 120000],
    defaultVal: 70000,
  },
};

const EXPERIENCE_TIERS = [
  { label: 'Entry Level', range: '0–2 years', minYears: 1 },
  { label: 'Mid-level', range: '3–5 years', minYears: 3 },
  { label: 'Senior', range: '5–8 years', minYears: 5 },
  { label: 'Lead / Principal', range: '8+ years', minYears: 8 },
];

export function AutoApplyPanel({ userId, region, onProfileSaved }: AutoApplyPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [portalConnections, setPortalConnections] = useState<any[]>([]);
  const [syncingPortalId, setSyncingPortalId] = useState<string | null>(null);
  const [disconnectingPortalId, setDisconnectingPortalId] = useState<string | null>(null);
  const [selectedConnectPortal, setSelectedConnectPortal] = useState<PortalType | null>(null);
  const [entitlements, setEntitlements] = useState<UserEntitlements | null>(null);
  const [limitModalOpen, setLimitModalOpen] = useState(false);
  
  const [whatHappensOpen, setWhatHappensOpen] = useState(false);

const [preferences, setPreferences] = useState<AutoApplyPreferences>({
    enabled: false,
    targetRoles: ['Software Engineer', 'Full Stack Developer', 'Frontend Developer'],
    locations: ['Remote', 'London', 'Bangalore'],
    remoteOnly: false,
    minSalary: 12,
    salaryCurrency: 'INR_LPA',
    experienceYears: 3,
    maxNoticePeriodDays: 30,
    maxPerDay: 25,
    useTailoredCV: true,
    useCoverLetter: true,
    autoAnswerQuestions: true,
    enabledPortals: ['naukri', 'indeed', 'greenhouse', 'adzuna'],
    searchIntensity: 'exploring',
    expectedApplicationsPerMonth: 50,
    applicationMode: 'manual_review',
    defaultJobsTab: 'discover',
  });

  const [savedPreferences, setSavedPreferences] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchPreferences(), fetchPortalConnections(), fetchEntitlements()]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEntitlements = async () => {
    try {
      const res = await fetch('/api/entitlements');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.entitlements) {
          setEntitlements(data.entitlements);
        }
      }
    } catch (e) {
      console.error('Failed to load entitlements:', e);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/job-search-profile');
      if (res.ok) {
        const json = await res.json();
        if (json.profile) {
          const { _id, userId, __v, profileVersion, createdAt, updatedAt, id, ...profileFields } = json.profile;
          const loadedPrefs = {
            ...preferences,
            ...profileFields,
            salaryCurrency: json.profile.salaryCurrency || 'INR_LPA',
          };
          setPreferences(loadedPrefs);
          setSavedPreferences(JSON.stringify(loadedPrefs));
        }
      }
    } catch (error) {
      console.error('Failed to load auto-apply preferences:', error);
    }
  };

  const fetchPortalConnections = async () => {
    try {
      const res = await fetch('/api/portal-connections');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.connections)) {
          setPortalConnections(data.connections);
        }
      }
    } catch (e) {
      console.error('Failed to load portal connections:', e);
    }
  };

  const handleSyncPortal = async (portalId: string, name: string) => {
    try {
      setSyncingPortalId(portalId);
      const res = await fetch(`/api/portal-connections/${portalId}/sync`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Found ${data.jobsCreated || 0} new jobs from ${name}`);
        await fetchPortalConnections();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (error: any) {
      toast.error(error.message || `Failed to sync ${name}. Your connection may need attention.`);
    } finally {
      setSyncingPortalId(null);
    }
  };

  const handleDisconnectPortal = async (portalId: string, name: string) => {
    if (!confirm(`Are you sure you want to disconnect your ${name} account?`)) return;
    try {
      setDisconnectingPortalId(portalId);
      const res = await fetch(`/api/portal-connections?id=${portalId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to disconnect');
      toast.success(`${name} disconnected`);
      await fetchPortalConnections();
    } catch (error: any) {
      toast.error('We couldn\'t complete the disconnection right now. Please try again.');
    } finally {
      setDisconnectingPortalId(null);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/job-search-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: preferences }),
      });

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        console.error('[AutoApplyPanel] Save failed:', res.status, errorBody);
        throw new Error(errorBody.error || errorBody.details?.join(', ') || 'Failed to save preferences');
      }
      toast.success('Preferences saved');
      setSavedPreferences(JSON.stringify(preferences));
      await fetchEntitlements();
      onProfileSaved?.();
    } catch (error: any) {
      console.error('[AutoApplyPanel] Save error:', error);
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRole = (roleToAdd?: string) => {
    const r = (roleToAdd || newRole).trim();
    if (!r) return;
    if (preferences.targetRoles.includes(r)) {
      setNewRole('');
      return;
    }
    setPreferences((prev) => ({
      ...prev,
      targetRoles: [...prev.targetRoles, r],
    }));
    setNewRole('');
  };

  const handleRemoveRole = (role: string) => {
    setPreferences((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.filter((r) => r !== role),
    }));
  };

  const handleAddLocation = (locToAdd?: string) => {
    const l = (locToAdd || newLocation).trim();
    if (!l) return;
    if (preferences.locations.includes(l)) {
      setNewLocation('');
      return;
    }
    setPreferences((prev) => ({
      ...prev,
      locations: [...prev.locations, l],
    }));
    setNewLocation('');
  };

  const handleRemoveLocation = (loc: string) => {
    setPreferences((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l !== loc),
    }));
  };

  const toggleWorkplace = (type: string) => {
    setPreferences((prev) => {
      const has = prev.locations.includes(type);
      return {
        ...prev,
        locations: has ? prev.locations.filter((l) => l !== type) : [...prev.locations, type]
      };
    });
  };

  // UI-first loading state: render the real settings layout (headings + card
  // shells) immediately, with pulsing placeholders inside — data fills in after.
  if (loading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12" aria-busy="true">
        {/* ROW 1: Application Automation + Your Auto-Apply Profile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              <Zap className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Application Automation</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400">
                Auto-Apply …
              </span>
            </div>
            <div className="space-y-2.5 animate-pulse">
              <div className="h-3.5 w-3/4 bg-gray-100 dark:bg-gray-900 rounded" />
              <div className="h-3.5 w-2/3 bg-gray-100 dark:bg-gray-900 rounded" />
              <div className="h-9 w-28 bg-gray-100 dark:bg-gray-900 rounded-xl mt-2" />
            </div>
          </div>
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col space-y-5">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Auto-Apply Profile</h3>
            </div>
            <div className="space-y-3 animate-pulse">
              <div className="h-3.5 w-4/5 bg-gray-100 dark:bg-gray-900 rounded" />
              <div className="h-3.5 w-2/3 bg-gray-100 dark:bg-gray-900 rounded" />
              <div className="h-9 w-32 bg-gray-100 dark:bg-gray-900 rounded-xl mt-2" />
            </div>
          </div>
        </div>

        {/* ROW 2: Connected Job Accounts */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <span>Connected Job Accounts</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Connect your job-search accounts to personalize discovery and enable supported application features.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>

        {/* ROW 3: Roles + Locations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Roles You&apos;re Targeting</h3>
            <div className="flex flex-wrap gap-2 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 w-24 bg-gray-100 dark:bg-gray-900 rounded-full" />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Where Do You Want to Work?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">We&apos;ll prioritize jobs you can realistically work from.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 animate-pulse">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-8 w-20 bg-gray-100 dark:bg-gray-900 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* ROW 4: Salary + Experience & Availability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Target Salary</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">We&apos;ll filter out roles below your target.</p>
              </div>
            </div>
            <div className="h-10 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
          </div>
          <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Experience &amp; Availability</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>

        {/* ROW 5: Default Tab */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-lime-600 dark:text-[#013f2e]" />
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">Default Tab</h4>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Choose which tab opens by default when you navigate to the Jobs page.
          </p>
          <div className="flex gap-3">
            {[0, 1].map((i) => (
              <div key={i} className="flex-1 h-20 bg-gray-100 dark:bg-gray-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const PORTALS_LIST: {
    id: PortalType;
    name: string;
    icon: any;
    color: string;
    bg: string;
    capabilities: { jobDiscovery: boolean; applicationAutomation: boolean };
  }[] = [
    { 
      id: 'naukri', 
      name: 'Naukri', 
      icon: Globe, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      capabilities: { jobDiscovery: true, applicationAutomation: true }
    },
    { 
      id: 'indeed', 
      name: 'Indeed', 
      icon: Briefcase, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-50 dark:bg-indigo-950/30',
      capabilities: { jobDiscovery: true, applicationAutomation: true }
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      icon: Globe, 
      color: 'text-sky-500', 
      bg: 'bg-sky-50 dark:bg-sky-950/30',
      capabilities: { jobDiscovery: true, applicationAutomation: false }
    },
  ];

  const currentCurrency = CURRENCY_CONFIG[preferences.salaryCurrency] || CURRENCY_CONFIG.INR_LPA;
  
  const isStarter = entitlements?.plan === 'starter';
  const usedCount = isStarter
    ? entitlements?.application.used || 0
    : entitlements?.autoApply.used || 0;
  const limitCount = isStarter
    ? entitlements?.application.limit || 10
    : entitlements?.autoApply.limit || 50;
  const remainingCount = isStarter
    ? entitlements?.application.remaining ?? 0
    : entitlements?.autoApply.remaining ?? 0;

  const percentUsed = Math.min(100, Math.round((usedCount / (limitCount || 1)) * 100));

  const resetDateDisplay = isStarter
    ? entitlements?.application.resetAt
      ? new Date(entitlements.application.resetAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })
      : 'end of month'
    : 'tomorrow at midnight';

  const hasChanges = JSON.stringify(preferences) !== savedPreferences && savedPreferences !== '';
  
  const cityLocations = preferences.locations.filter(l => !['Remote', 'Hybrid', 'On-site'].includes(l));
  const workplacePrefs = preferences.locations.filter(l => ['Remote', 'Hybrid', 'On-site'].includes(l));

  const getExperienceLabel = (years: number) => {
    const tier = EXPERIENCE_TIERS.slice().reverse().find(t => years >= t.minYears);
    return tier ? tier.label : 'Entry Level (0–2 years)';
  };

  const getAvailabilityLabel = (days: number) => {
    if (days === 0) return 'Available immediately';
    return `Available within ${days} days`;
  };

  const allDisconnected = PORTALS_LIST.every(p => {
    const conn = portalConnections.find(c => c.id === p.id);
    return !(conn?.status === 'connected' && Boolean(conn?.account?.email));
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* ROW 1: Two Column Layout: Application Automation & Auto-Apply Profile    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Column 1: Application Automation */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            {/* Header & Toggle */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Zap className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                    Application Automation
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
                    preferences.enabled
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                      : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      preferences.enabled ? 'bg-emerald-500' : 'bg-gray-400'
                    }`} />
                    Auto-Apply {preferences.enabled ? 'Active' : 'Paused'}
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed pt-1">
                  {preferences.enabled 
                    ? 'Auto-Apply is active. BuildAIResume will automatically apply to matching jobs within your plan limit.'
                    : 'Auto-Apply is paused. Job discovery and preparation continue, but applications won\'t be submitted automatically.'
                  }
                </p>
              </div>

              {/* Custom Pill Toggle Switch */}
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, enabled: !p.enabled }))}
                aria-label="Toggle Auto-Apply"
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors shrink-0 ${
                  preferences.enabled
                    ? 'bg-lime-500 dark:bg-[#013f2e]'
                    : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-6 h-6 bg-white dark:bg-black rounded-full shadow-md transition-transform absolute top-1 ${
                    preferences.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Resume action if paused */}
            {!preferences.enabled && (
              <button
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, enabled: true }))}
                className="text-xs font-bold text-lime-600 dark:text-[#013f2e] hover:underline block"
              >
                Resume Auto-Apply →
              </button>
            )}

            {/* Collapsible Info Accordion */}
            <div className="pt-1">
              <button 
                type="button"
                onClick={() => setWhatHappensOpen(!whatHappensOpen)}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <span>What happens when Auto-Apply is active?</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${whatHappensOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {whatHappensOpen && (
                <ul className="mt-2.5 space-y-1.5 text-xs text-gray-600 dark:text-gray-400 border-l-2 border-lime-500/30 pl-3">
                  <li>• Find matching jobs from connected accounts</li>
                  <li>• Prepare a tailored CV for each role</li>
                  <li>• Prepare a tailored cover letter</li>
                  <li>• Complete supported application forms</li>
                  <li>• Submit within your application limit</li>
                  <li>• Track progress in your Application Tracker</li>
                </ul>
              )}
            </div>
          </div>

          {/* Live Usage Progress Block */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 space-y-2 mt-auto">
            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="font-bold text-gray-900 dark:text-white">
                {isStarter ? 'Applications this month' : 'Auto-Apply today'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                {entitlements?.planName || 'Starter'} · {entitlements?.billingInterval === 'yearly' ? 'Yearly' : 'Monthly'}
              </span>
            </div>

            <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  percentUsed >= 100
                    ? 'bg-red-500'
                    : percentUsed >= 80
                    ? 'bg-amber-500'
                    : 'bg-[#013f2e]'
                }`}
                style={{ width: `${percentUsed}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {usedCount} of {limitCount} used · {remainingCount} remaining
              </span>
              <span>Resets {resetDateDisplay}</span>
            </div>
            
            <div className="pt-1 flex justify-end">
              <Link
                href="/dashboard/billing"
                className="text-[11px] font-bold text-lime-600 dark:text-[#013f2e] hover:underline transition-colors"
              >
                Manage subscription →
              </Link>
            </div>
          </div>
        </div>

        {/* Column 2: Your Auto-Apply Profile */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Your Auto-Apply Profile
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              This is the live criteria BuildAIResume uses to discover and submit matching roles.
            </p>
            
            <div className="space-y-2.5 pt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium">
              {preferences.targetRoles.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-600 dark:text-[#013f2e] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold block">Target Roles</span>
                    <span className="font-bold text-gray-900 dark:text-white">{preferences.targetRoles.join(', ')}</span>
                  </div>
                </div>
              )}
              
              {preferences.locations.length > 0 && (
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-lime-600 dark:text-[#013f2e] mt-0.5 shrink-0" />
                  <div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold block">Locations & Workplace</span>
                    <span>
                      {[
                        cityLocations.join(', '), 
                        workplacePrefs.join(' / ')
                      ].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-600 dark:text-[#013f2e] mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold block">Target Minimum Salary</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {currentCurrency.symbol}{preferences.minSalary?.toLocaleString()} {currentCurrency.unit}+
                  </span>
                </div>
              </div>
              
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-lime-600 dark:text-[#013f2e] mt-0.5 shrink-0" />
                <div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold block">Seniority & Availability</span>
                  <span>
                    {getExperienceLabel(preferences.experienceYears)} · {getAvailabilityLabel(preferences.maxNoticePeriodDays)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-lime-50/50 dark:bg-lime-950/20 border border-lime-500/20 text-xs text-gray-700 dark:text-gray-300 flex items-center justify-between gap-2 mt-auto">
            <span className="text-lime-900 dark:text-lime-200 font-medium">
              Profile updates sync automatically across all matching algorithms.
            </span>
            <span className="text-[10px] font-bold text-lime-700 dark:text-[#013f2e] bg-lime-500/20 px-2 py-0.5 rounded-full shrink-0">
              Live
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: Connected Job Accounts (Inline Grid)                              */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <span>Connected Job Accounts</span>
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Connect your job-search accounts to personalize discovery and enable supported application features.
            </p>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">
            BuildAIResume also searches across employers automatically
          </span>
        </div>

        {/* Inline Grid for All Portals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PORTALS_LIST.map((p) => {
            const connection = portalConnections.find((c) => c.id === p.id);
            const isConnected = connection?.status === 'connected' && Boolean(connection?.account?.email);
            const email = connection?.account?.email;
            const isSyncing = syncingPortalId === p.id || syncingPortalId === connection?.connectionId;
            const isDisconnecting = disconnectingPortalId === p.id || disconnectingPortalId === connection?.connectionId;
            const IconComp = p.icon;

            if (!isConnected) {
              return (
                <div
                  key={p.id}
                  className="p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.01] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl ${p.bg} ${p.color} shrink-0`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1.5">
                            <span>{p.name}</span>
                            {p.id === 'linkedin' && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 uppercase tracking-wider font-bold">
                                Soon
                              </span>
                            )}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Not connected</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-[11px] text-gray-500 dark:text-gray-400 pt-1">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 shrink-0" />
                        <span>Personalized discovery feed</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {p.capabilities.applicationAutomation ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 shrink-0" />
                            <span>Automated application support</span>
                          </>
                        ) : (
                          <>
                            <span className="w-3.5 h-3.5 inline-flex items-center justify-center text-gray-400 text-xs shrink-0">•</span>
                            <span>Direct application sync</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedConnectPortal(p.id)}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-lime-500 dark:hover:border-lime-400 hover:text-lime-700 dark:hover:text-lime-300 transition-colors shadow-2xs text-center"
                  >
                    Connect {p.name}
                  </button>
                </div>
              );
            }

            return (
              <div
                key={p.id}
                className="p-4 sm:p-5 rounded-2xl border border-lime-500/25 bg-lime-50/30 dark:bg-lime-900/10 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${p.bg} ${p.color} shrink-0`}>
                        <IconComp className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">
                          {p.name}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Connected</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-gray-600 dark:text-gray-400 pt-1">
                    <div className="truncate font-medium text-gray-800 dark:text-gray-200">
                      {email}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400 shrink-0" />
                      <span>{p.capabilities.applicationAutomation ? 'Discovery & Auto-Apply active' : 'Discovery active'}</span>
                    </div>
                    {connection?.updatedAt && (
                      <div className="text-[10px] text-gray-400 pt-0.5">
                        Synced {new Date(connection.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSyncPortal(connection?.connectionId || p.id, p.name)}
                    disabled={isSyncing}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 transition-colors flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    {isSyncing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-lime-600" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 text-lime-600" />
                    )}
                    <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnectPortal(connection?.connectionId || p.id, p.name)}
                    disabled={isDisconnecting}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors shrink-0"
                    title="Disconnect Account"
                  >
                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: Two Column Layout: Roles & Locations/Workplace                    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Column 1: Roles You're Targeting */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Roles You&apos;re Targeting</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">These help us prioritize the right jobs.</p>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                placeholder="Add a role (e.g. Data Analyst)..."
                className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none focus:border-lime-500 shadow-2xs"
              />
              <button
                type="button"
                onClick={() => handleAddRole()}
                className="px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-[#013f2e] dark:hover:brightness-95 text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs shrink-0"
              >
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {preferences.targetRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lime-50 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-800/50 rounded-xl text-xs sm:text-sm font-medium text-lime-900 dark:text-lime-200"
                >
                  <span>{role}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    aria-label={`Remove ${role}`}
                    className="hover:text-red-500 ml-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Column 2: Where Do You Want to Work? */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Where Do You Want to Work?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">We&apos;ll prioritize jobs you can realistically work from.</p>
              </div>
            </div>

            {/* Workplace Setup Pills */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Workplace Setup</span>
              <div className="flex flex-wrap gap-2">
                {['Remote', 'Hybrid', 'On-site'].map((type) => {
                  const isActive = preferences.locations.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleWorkplace(type)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                        isActive 
                          ? 'bg-lime-50 dark:bg-lime-900/20 border-lime-500 text-lime-700 dark:text-lime-400 shadow-2xs' 
                          : 'bg-white dark:bg-[#1a230f] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* City Locations */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Target Cities / Regions</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLocation())}
                  placeholder="e.g. Bangalore, London"
                  className="flex-1 px-4 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none focus:border-lime-500 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddLocation()}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-white/10 dark:hover:bg-white/20 text-gray-800 dark:text-white rounded-xl text-xs sm:text-sm font-bold transition-colors shadow-2xs shrink-0"
                >
                  Add
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {cityLocations.map((loc) => (
                  <span
                    key={loc}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    <span>{loc}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveLocation(loc)}
                      aria-label={`Remove ${loc}`}
                      className="hover:text-red-500 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: Two Column Layout: Salary Targeting & Experience/Availability     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Column 1: What Salary Are You Targeting? */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-lime-600 dark:text-[#013f2e]" />
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Target Salary</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">We&apos;ll filter out roles below your target.</p>
                </div>
              </div>

              {/* Currency Switcher */}
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-xl shrink-0 self-start sm:self-auto">
                {Object.entries(CURRENCY_CONFIG).map(([key, item]) => {
                  const active = preferences.salaryCurrency === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() =>
                        setPreferences((p) => ({
                          ...p,
                          salaryCurrency: key,
                          minSalary: item.defaultVal,
                        }))
                      }
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                        active
                          ? 'bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white shadow-2xs'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-800'
                      }`}
                    >
                      {item.symbol} {key.split('_')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Value Display */}
            <div className="pt-2 space-y-3">
              <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white flex items-baseline gap-1.5">
                <span>{currentCurrency.symbol}{preferences.minSalary?.toLocaleString()}</span>
                <span className="text-xs sm:text-sm font-bold text-gray-400">{currentCurrency.unit}+</span>
              </div>

              {/* Preset Quick Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {currentCurrency.presets.map((val) => {
                  const isSelected = preferences.minSalary === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPreferences((p) => ({ ...p, minSalary: val }))}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-lime-500 dark:bg-[#013f2e] text-white shadow-2xs'
                          : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {currentCurrency.symbol}{val.toLocaleString()} {currentCurrency.unit}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Experience Level & Availability */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Experience Tiers */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-lime-600 dark:text-[#013f2e]" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Experience Level</h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EXPERIENCE_TIERS.map((tier) => {
                  const isSelected = preferences.experienceYears === tier.minYears;
                  return (
                    <button
                      key={tier.label}
                      type="button"
                      onClick={() =>
                        setPreferences((p) => ({ ...p, experienceYears: tier.minYears }))
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-lime-500 bg-lime-50/40 dark:bg-lime-900/20 text-gray-900 dark:text-white shadow-2xs'
                          : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {tier.label}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {tier.range}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability / Notice Period */}
            <div className="space-y-2 pt-1 border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-4 h-4 text-lime-600 dark:text-[#013f2e]" />
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Availability</h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {[0, 30, 60, 90].map((days) => {
                  const isSelected = preferences.maxNoticePeriodDays === days;
                  return (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPreferences((p) => ({ ...p, maxNoticePeriodDays: days }))}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        isSelected
                          ? 'bg-lime-500 dark:bg-[#013f2e] text-white border-transparent shadow-2xs'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {days === 0 ? 'Immediately' : `${days} days`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Default Tab Preference                                                    */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200/90 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-lime-600 dark:text-[#013f2e]" />
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">Default Tab</h4>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Choose which tab opens by default when you navigate to the Jobs page.
        </p>
        <div className="flex gap-3">
          {[
            { value: 'discover' as const, label: 'Discover', desc: 'Browse new job matches' },
            { value: 'applications' as const, label: 'Applications', desc: 'View your tracker' },
          ].map((opt) => {
            const isSelected = preferences.defaultJobsTab === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPreferences((p) => ({ ...p, defaultJobsTab: opt.value }))}
                className={`flex-1 p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-lime-500 bg-lime-50/40 dark:bg-lime-900/20 shadow-2xs'
                    : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] hover:border-gray-300'
                }`}
              >
                <div className={`text-sm font-bold ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {opt.label}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {opt.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Save Action Bar                                                           */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-end gap-4 pt-2">
        {hasChanges && (
          <span className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400">
            Unsaved changes
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`px-8 py-3.5 font-black rounded-2xl text-sm flex items-center gap-2 shadow-md transition-all ${
            hasChanges 
              ? 'bg-lime-500 hover:bg-lime-600 dark:bg-[#013f2e] dark:hover:brightness-95 text-white cursor-pointer' 
              : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-80'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Portal Connect Modal */}
      {selectedConnectPortal && (
        <PortalConnectModal
          portal={selectedConnectPortal}
          isOpen={Boolean(selectedConnectPortal)}
          onClose={() => setSelectedConnectPortal(null)}
          onSuccess={() => {
            fetchPortalConnections();
          }}
        />
      )}

      {/* Contextual Limit Interception Modal */}
      {limitModalOpen && (
        <ContextualLimitModal
          isOpen={limitModalOpen}
          onClose={() => setLimitModalOpen(false)}
          entitlements={entitlements}
        />
      )}
    </div>
  );
}
