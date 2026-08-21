'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Sliders,
  Target,
  MapPin,
  Clock,
  FileText,
  Plus,
  X,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
  Briefcase,
  Building2,
  Search,
  DollarSign,
  Shield,
  Loader2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { COMMON_ROLES, COMMON_LOCATIONS } from '@/lib/config/job-constants';

export interface GlobalAutoApplyPreferences {
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
  enabledPortals: ('naukri' | 'indeed' | 'greenhouse' | 'adzuna' | 'lever' | 'ashby' | 'workable')[];
}

interface AutoApplyPanelProps {
  userId?: string;
  region?: 'UK' | 'India';
}

export function AutoApplyPanel({ userId, region }: AutoApplyPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [portalStatus, setPortalStatus] = useState<Record<string, boolean>>({});

  const [preferences, setPreferences] = useState<GlobalAutoApplyPreferences>({
    enabled: false,
    targetRoles: ['Full Stack Developer', 'Software Engineer'],
    locations: ['Remote', 'Bangalore', 'London'],
    remoteOnly: false,
    minSalary: 15,
    salaryCurrency: 'INR_LPA',
    experienceYears: 3,
    maxNoticePeriodDays: 30,
    maxPerDay: 25,
    useTailoredCV: true,
    useCoverLetter: true,
    autoAnswerQuestions: true,
    enabledPortals: ['naukri', 'indeed', 'greenhouse', 'adzuna', 'lever', 'ashby', 'workable'],
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/jobs/preferences');
      if (res.ok) {
        const json = await res.json();
        if (json.preferences) {
          setPreferences(json.preferences);
        }
        if (json.portalStatus) {
          setPortalStatus(json.portalStatus);
        }
      }
    } catch (error) {
      console.error('Failed to load auto-apply preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/jobs/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences }),
      });

      if (!res.ok) throw new Error('Failed to save global auto-apply criteria');
      toast.success('Global auto-apply criteria saved & synced across all portals!');
    } catch (error: any) {
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
      targetRoles: prev.targetRoles.filter((item) => item !== role),
    }));
  };

  const handleToggleLocation = (loc: string) => {
    const exists = preferences.locations.includes(loc);
    setPreferences((prev) => ({
      ...prev,
      locations: exists
        ? prev.locations.filter((l) => l !== loc)
        : [...prev.locations, loc],
    }));
  };

  const handleTogglePortal = (portalKey: 'naukri' | 'indeed' | 'greenhouse' | 'adzuna') => {
    const exists = preferences.enabledPortals.includes(portalKey);
    setPreferences((prev) => ({
      ...prev,
      enabledPortals: exists
        ? prev.enabledPortals.filter((p) => p !== portalKey)
        : [...prev.enabledPortals, portalKey],
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse p-4">
        <div className="h-28 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
          <div className="h-48 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* Master Enable/Disable Hero Card */}
      <div className="bg-gradient-to-r from-lime-50/70 via-white to-blue-50/50 dark:from-lime-950/20 dark:via-[#141810] dark:to-blue-950/20 border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md transition-colors ${
                preferences.enabled
                  ? 'bg-lime-500 text-white shadow-lime-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
              }`}
            >
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
                  Global Auto-Apply Automation
                </h3>
                {preferences.enabled ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-lime-500/15 text-lime-700 dark:text-lime-400 border border-lime-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Automation Active
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/15 text-gray-700 dark:text-gray-400 border border-gray-500/30">
                    Paused
                  </span>
                )}
              </div>
              <p className="text-small text-gray-600 dark:text-gray-400 mt-1 max-w-2xl">
                Automatically matches your Master CV against live job streams from connected portals, tailors resumes, answers recruiter questionnaires, and submits applications with safe throttling.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setPreferences((prev) => ({ ...prev, enabled: !prev.enabled }))
            }
            className={`w-14 h-7 rounded-full transition-colors relative self-start sm:self-center shrink-0 ${
              preferences.enabled ? 'bg-lime-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform absolute top-0.5 ${
                preferences.enabled ? 'translate-x-7' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Global Criteria Configuration */}
      <div className="space-y-6">

        {/* Enabled Portals Checklist */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <label className="text-small font-bold text-gray-900 dark:text-white block mb-1">
            Active Job Portals & Sources
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Choose which job boards and ATS streams should participate in global auto-matching.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'naukri' as const, name: 'Naukri.com', icon: Globe, color: 'text-blue-500' },
              { id: 'indeed' as const, name: 'Indeed Global', icon: Briefcase, color: 'text-indigo-500' },
              { id: 'greenhouse' as const, name: 'Greenhouse ATS', icon: Building2, color: 'text-emerald-500' },
              { id: 'adzuna' as const, name: 'Adzuna Free Index', icon: Search, color: 'text-amber-500' },
            ].map((p) => {
              const active = preferences.enabledPortals.includes(p.id);
              const isConnected = portalStatus[p.id] !== false;
              const IconComp = p.icon;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleTogglePortal(p.id)}
                  className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 ${
                    active
                      ? 'border-lime-500 bg-lime-500/5 dark:bg-lime-500/10 shadow-sm'
                      : 'border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${p.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 dark:text-white">{p.name}</div>
                      <div className="text-[11px] text-gray-500 dark:text-gray-400">
                        {isConnected ? 'Connected' : 'Free stream'}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      active ? 'bg-lime-500 border-lime-500 text-white' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {active && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Roles & Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Roles */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-lime-600" />
              <label className="text-small font-bold text-gray-900 dark:text-white">
                Target Job Titles & Roles
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddRole())}
                placeholder="e.g. React Developer, Cloud Architect"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-lime-500"
              />
              <button
                type="button"
                onClick={() => handleAddRole()}
                className="px-3.5 py-2 bg-lime-500 hover:bg-lime-600 text-white rounded-xl transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Roles */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {preferences.targetRoles.map((role) => (
                <span
                  key={role}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-lime-50 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300 border border-lime-500/20"
                >
                  {role}
                  <button
                    type="button"
                    onClick={() => handleRemoveRole(role)}
                    className="text-lime-600 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>

            {/* Suggested Roles */}
            <div>
              <span className="text-[11px] text-gray-400 block mb-1.5 font-medium">Quick suggestions:</span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_ROLES.map((r) => {
                  if (preferences.targetRoles.includes(r)) return null;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handleAddRole(r)}
                      className="px-2.5 py-1 rounded-md text-[11px] bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
                    >
                      + {r}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-lime-600" />
                <label className="text-small font-bold text-gray-900 dark:text-white">
                  Target Work Locations
                </label>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={preferences.remoteOnly}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, remoteOnly: e.target.checked }))
                  }
                  className="rounded text-lime-500 focus:ring-lime-500"
                />
                <span>Remote Only</span>
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_LOCATIONS.map((loc) => {
                const active = preferences.locations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleToggleLocation(loc)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-lime-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 hover:border-lime-500 border border-transparent'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-white/5">
              Positions matching any of your selected locations (or 100% remote roles) will be prioritized.
            </p>
          </div>

          {/* Salary & Experience */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <div className="flex justify-between text-small font-bold text-gray-900 dark:text-white mb-2">
                <span>Minimum Target Compensation</span>
                <span className="text-lime-600 dark:text-lime-400 font-extrabold">
                  {preferences.salaryCurrency === 'INR_LPA'
                    ? `₹ ${preferences.minSalary} LPA`
                    : preferences.salaryCurrency === 'GBP'
                    ? `£ ${preferences.minSalary * 1000}/yr`
                    : `$ ${preferences.minSalary * 1000}/yr`}
                </span>
              </div>
              <div className="flex gap-3 items-center">
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="1"
                  value={preferences.minSalary}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      minSalary: parseInt(e.target.value, 10),
                    }))
                  }
                  className="flex-1 accent-lime-500"
                />
                <select
                  value={preferences.salaryCurrency}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, salaryCurrency: e.target.value }))
                  }
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none"
                >
                  <option value="INR_LPA">₹ Lakhs PA</option>
                  <option value="USD">$ USD (k/yr)</option>
                  <option value="GBP">£ GBP (k/yr)</option>
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
              <div className="flex justify-between text-small font-bold text-gray-900 dark:text-white mb-2">
                <span>Relevant Experience Level</span>
                <span className="text-gray-600 dark:text-gray-300 font-semibold">
                  {preferences.experienceYears} Years
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={preferences.experienceYears}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    experienceYears: parseInt(e.target.value, 10),
                  }))
                }
                className="w-full accent-lime-500"
              />
            </div>
          </div>

          {/* Daily Limits & Documents */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <div className="flex justify-between text-small font-bold text-gray-900 dark:text-white mb-2">
                <span>Daily Application Cap</span>
                <span className="text-lime-600 dark:text-lime-400 font-extrabold">
                  {preferences.maxPerDay} applications / day
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="25"
                step="5"
                value={preferences.maxPerDay}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    maxPerDay: Math.min(parseInt(e.target.value, 10), 25),
                  }))
                }
                className="w-full accent-lime-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Maximum 25 applications per day. Evenly distributed across active portals with anti-spam rate limiting.
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 dark:border-white/5 space-y-2.5">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.useTailoredCV}
                  onChange={(e) =>
                    setPreferences((prev) => ({ ...prev, useTailoredCV: e.target.checked }))
                  }
                  className="rounded text-lime-500 focus:ring-lime-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-gray-900 dark:text-white">AI-Tailored CV</span>
                  <span className="text-gray-500 dark:text-gray-400 block">
                    Optimizes keywords to match each job description
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.autoAnswerQuestions}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      autoAnswerQuestions: e.target.checked,
                    }))
                  }
                  className="rounded text-lime-500 focus:ring-lime-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    Auto-Answer Screening Questions
                  </span>
                  <span className="text-gray-500 dark:text-gray-400 block">
                    Resolves notice period, compensation, and skill questions automatically
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 dark:bg-white/[0.02] border border-gray-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Shield className="w-4 h-4 text-lime-600" />
            <span>Changes take effect immediately across all background discovery jobs.</span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-lime-500 hover:bg-lime-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-lime-500/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving Criteria...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Global Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AutoApplyPanel;
