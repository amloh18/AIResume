'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Sliders,
  Shield,
  Zap,
  ExternalLink,
  ChevronRight,
  Plus,
  X,
  Briefcase,
  Lock,
  Sparkles,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface NaukriPreferences {
  targetTitles: string[];
  targetLocations: string[];
  minCtcLakhs: number;
  experienceYears: number;
  maxNoticePeriodDays: number;
  dailyLimit: number;
  autoApplyEnabled: boolean;
}

interface IntegrationData {
  connected: boolean;
  sessionStatus: 'active' | 'expired' | 'disconnected';
  connectedAt?: string;
  lastSyncedAt?: string;
  userEmail?: string;
  preferences: NaukriPreferences;
  stats: {
    totalFetched: number;
    totalApplied: number;
    lastAppliedAt?: string;
  };
}

const DEFAULT_PREFERENCES: NaukriPreferences = {
  targetTitles: ['Full Stack Developer', 'Software Engineer', 'Frontend Developer'],
  targetLocations: ['Bangalore', 'Remote', 'Mumbai', 'Hyderabad', 'Pune'],
  minCtcLakhs: 12,
  experienceYears: 3,
  maxNoticePeriodDays: 30,
  dailyLimit: 25,
  autoApplyEnabled: true,
};

const COMMON_LOCATIONS = [
  'Bangalore',
  'Remote',
  'Mumbai',
  'Hyderabad',
  'Pune',
  'Delhi / NCR',
  'Chennai',
  'Noida',
  'Gurgaon'
];

interface NaukriIntegrationPanelProps {
  onConnectionChange?: (connected: boolean) => void;
}

export const NaukriIntegrationPanel: React.FC<NaukriIntegrationPanelProps> = ({ onConnectionChange }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [data, setData] = useState<IntegrationData | null>(null);
  const [preferences, setPreferences] = useState<NaukriPreferences>(DEFAULT_PREFERENCES);
  const [newTitle, setNewTitle] = useState('');
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const authPopupRef = useRef<Window | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations/naukri/session');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.preferences && Object.keys(json.preferences).length > 0) {
          setPreferences({
            ...DEFAULT_PREFERENCES,
            ...json.preferences,
          });
        }
        if (onConnectionChange) {
          onConnectionChange(json.sessionStatus === 'active');
        }
      }
    } catch (error) {
      console.error('Failed to fetch Naukri status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Listen for extension message
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'NAUKRI_SESSION_CAPTURED' && event.data?.cookies) {
        toast.success('Session captured automatically from browser!');
        await handleSaveSession(event.data.cookies);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  const handleSaveSession = async (cookies: any) => {
    try {
      setSaving(true);
      const res = await fetch('/api/integrations/naukri/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cookies,
          preferences,
        }),
      });

      if (!res.ok) throw new Error('Failed to link Naukri session');
      toast.success('Naukri.com connected successfully!');
      setAuthenticating(false);
      if (authPopupRef.current && !authPopupRef.current.closed) {
        authPopupRef.current.close();
      }
      await fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoConnect = () => {
    setAuthenticating(true);
    toast.loading('Opening Naukri Sign-in...', { id: 'naukri-auth' });

    // 1. Dispatch extension bridge request if extension is active
    if (typeof window !== 'undefined') {
      window.postMessage({ type: 'CV_CIRCLE_CONNECT_NAUKRI' }, '*');
    }

    // 2. Open centered Naukri Sign-in popup
    const width = 560;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      'https://www.naukri.com/nlogin/login',
      'NaukriAuthWindow',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`
    );

    authPopupRef.current = popup;
    toast.dismiss('naukri-auth');

    // 3. Poll for session sync
    let attempts = 0;
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    pollIntervalRef.current = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch('/api/integrations/naukri/session');
        if (res.ok) {
          const json = await res.json();
          if (json.sessionStatus === 'active') {
            clearInterval(pollIntervalRef.current!);
            setAuthenticating(false);
            if (popup && !popup.closed) popup.close();
            toast.success('Naukri.com connected successfully!');
            setData(json);
            if (onConnectionChange) onConnectionChange(true);
            return;
          }
        }
      } catch {
        // Continue polling
      }

      // Check if popup closed by user or timed out after 3 minutes
      if ((popup && popup.closed) || attempts > 60) {
        clearInterval(pollIntervalRef.current!);
        setAuthenticating(false);
      }
    }, 3000);
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/integrations/naukri/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferences,
        }),
      });

      if (!res.ok) throw new Error('Failed to save preferences');
      toast.success('Naukri integration settings saved!');
      await fetchStatus();
    } catch (error: any) {
      toast.error(error.message || 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Naukri account?')) return;

    try {
      setSaving(true);
      const res = await fetch('/api/integrations/naukri/session', {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Disconnect failed');
      toast.success('Naukri account disconnected');
      await fetchStatus();
      if (onConnectionChange) onConnectionChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to disconnect');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTitle = () => {
    if (!newTitle.trim()) return;
    if (preferences.targetTitles.includes(newTitle.trim())) {
      setNewTitle('');
      return;
    }
    setPreferences({
      ...preferences,
      targetTitles: [...preferences.targetTitles, newTitle.trim()],
    });
    setNewTitle('');
  };

  const handleRemoveTitle = (title: string) => {
    setPreferences({
      ...preferences,
      targetTitles: preferences.targetTitles.filter((t) => t !== title),
    });
  };

  const handleToggleLocation = (loc: string) => {
    const exists = preferences.targetLocations.includes(loc);
    setPreferences({
      ...preferences,
      targetLocations: exists
        ? preferences.targetLocations.filter((l) => l !== loc)
        : [...preferences.targetLocations, loc],
    });
  };

  if (loading) {
    return (
      <div className="p-6 sm:p-8 space-y-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="h-28 w-full bg-gray-200 dark:bg-white/10 rounded-2xl" />
        <div className="h-48 w-full bg-gray-200 dark:bg-white/10 rounded-2xl" />
      </div>
    );
  }

  const isConnected = data?.sessionStatus === 'active';

  return (
    <div className="space-y-8 min-w-0 max-w-full">
      {/* Header Banner Card */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-r from-blue-50/70 via-white to-lime-50/40 dark:from-blue-950/20 dark:via-[#141810] dark:to-lime-950/20 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-h3 font-bold text-gray-900 dark:text-white">
                  Naukri.com Integration
                </h3>
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36D39B]/15 text-[#013f2e] dark:text-[#36D39B] border border-[#36D39B]/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected & Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Account Not Linked
                  </span>
                )}
              </div>
              <p className="mt-1 text-small text-gray-600 dark:text-gray-400 max-w-2xl">
                Automatically ingest fresh jobs from Naukri.com matching your CV profile, and apply with 1-click tailored applications.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            {isConnected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={saving}
                className="px-3.5 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAutoConnect}
                disabled={authenticating}
                className="px-5 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md shadow-blue-500/20 flex items-center gap-2"
              >
                {authenticating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Listening for Sign In...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Sign In & Link Naukri
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Authenticating Progress Indicator */}
        {authenticating && (
          <div className="mt-5 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <span className="font-semibold">Sign-in window active:</span> Complete sign in on Naukri.com. Your session will be linked automatically.
            </div>
          </div>
        )}

        {/* Stats Row if Connected */}
        {isConnected && data?.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-gray-200 dark:border-white/10">
            <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-white/5">
              <div className="text-xs text-gray-500 dark:text-gray-400">Jobs Discovered</div>
              <div className="text-h3 font-bold text-gray-900 dark:text-white mt-0.5">
                {data.stats.totalFetched || 0}
              </div>
            </div>
            <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-white/5">
              <div className="text-xs text-gray-500 dark:text-gray-400">Applications Sent</div>
              <div className="text-h3 font-bold text-lime-600 dark:text-lime-400 mt-0.5">
                {data.stats.totalApplied || 0}
              </div>
            </div>
            <div className="p-3 bg-white/80 dark:bg-black/30 rounded-xl border border-gray-100 dark:border-white/5 col-span-2 sm:col-span-1">
              <div className="text-xs text-gray-500 dark:text-gray-400">Last Synced</div>
              <div className="text-xs font-medium text-gray-800 dark:text-gray-200 mt-1 truncate">
                {data.lastSyncedAt ? new Date(data.lastSyncedAt).toLocaleString() : 'Just now'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Target Search & Application Preferences */}
      <div className="space-y-6">
        <div>
          <h4 className="text-h3 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-lime-600" />
            Naukri Discovery & Auto-Apply Criteria
          </h4>
          <p className="mt-1 text-small text-gray-500 dark:text-gray-400">
            Configure target job roles, preferred work locations, and salary thresholds for automated matching.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Target Job Titles */}
          <div className="space-y-3 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <label className="text-small font-semibold text-gray-900 dark:text-white block">
              Target Job Titles & Roles
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTitle())}
                placeholder="e.g. React Developer, Backend Lead"
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#141810] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#013f2e]"
              />
              <button
                type="button"
                onClick={handleAddTitle}
                className="px-3 py-2 bg-[#013f2e] text-white rounded-xl hover:bg-[#025c43] transition-colors shrink-0"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {preferences.targetTitles.map((title) => (
                <span
                  key={title}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  {title}
                  <button
                    type="button"
                    onClick={() => handleRemoveTitle(title)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Target Locations */}
          <div className="space-y-3 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <label className="text-small font-semibold text-gray-900 dark:text-white block">
              Preferred Work Locations
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {COMMON_LOCATIONS.map((loc) => {
                const active = preferences.targetLocations.includes(loc);
                return (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => handleToggleLocation(loc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      active
                        ? 'bg-[#013f2e] text-white shadow-sm'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-[#013f2e]'
                    }`}
                  >
                    {loc}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Salary & Experience */}
          <div className="space-y-4 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div>
              <div className="flex justify-between text-small font-semibold text-gray-900 dark:text-white mb-1.5">
                <span>Minimum Target CTC (LPA)</span>
                <span className="text-[#013f2e] dark:text-[#36D39B] font-bold">₹ {preferences.minCtcLakhs} Lakhs</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={preferences.minCtcLakhs}
                onChange={(e) =>
                  setPreferences({ ...preferences, minCtcLakhs: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#013f2e] dark:accent-[#36D39B]"
              />
            </div>

            <div>
              <div className="flex justify-between text-small font-semibold text-gray-900 dark:text-white mb-1.5">
                <span>Relevant Experience</span>
                <span className="text-gray-600 dark:text-gray-400">{preferences.experienceYears} Years</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="1"
                value={preferences.experienceYears}
                onChange={(e) =>
                  setPreferences({ ...preferences, experienceYears: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#013f2e] dark:accent-[#36D39B]"
              />
            </div>
          </div>

          {/* Daily Apply Limit & Automation Toggle */}
          <div className="space-y-4 p-5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
            <div>
              <div className="flex justify-between text-small font-semibold text-gray-900 dark:text-white mb-1.5">
                <span>Daily Auto-Apply Limit</span>
                <span className="text-[#013f2e] dark:text-[#36D39B] font-bold">{preferences.dailyLimit} apps / day</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={preferences.dailyLimit}
                onChange={(e) =>
                  setPreferences({ ...preferences, dailyLimit: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#013f2e] dark:accent-[#36D39B]"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Safe throttling prevents platform flags (recommended: 20–30/day).
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-white/10">
              <div>
                <div className="text-small font-semibold text-gray-900 dark:text-white">
                  Enable 1-Click Auto-Apply
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Allow automatic submission for high-match jobs
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    autoApplyEnabled: !preferences.autoApplyEnabled,
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.autoApplyEnabled ? 'bg-[#013f2e] dark:bg-[#36D39B]' : 'bg-gray-300 dark:bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.autoApplyEnabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSavePreferences}
            disabled={saving}
            className="px-6 py-2.5 bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-small rounded-xl transition-all shadow-md flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            Save Integration Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default NaukriIntegrationPanel;
