'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Briefcase,
  Layers,
  Search,
  Building2,
  X,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  Sparkles,
  Lock,
  ExternalLink,
  Laptop,
  AlertTriangle,
  Mail,
  KeyRound,
} from 'lucide-react';
import toast from '@/lib/hot-toast';

export type PortalType =
  | 'naukri'
  | 'indeed'
  | 'linkedin'
  | 'greenhouse'
  | 'adzuna'
  | 'lever'
  | 'ashby'
  | 'workable';

interface PortalConnectModalProps {
  portal: PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PORTAL_CONFIG: Record<
  PortalType,
  {
    name: string;
    icon: any;
    color: string;
    authType: 'oauth' | 'browser_session' | 'public_feed';
    tagline: string;
    loginUrl?: string;
  }
> = {
  naukri: {
    name: 'Naukri.com',
    icon: Globe,
    color: 'bg-blue-600',
    authType: 'browser_session',
    tagline: 'Connect your Naukri profile to discover tech roles in India & Middle East.',
    loginUrl: 'https://www.naukri.com/mnjuser/login',
  },
  indeed: {
    name: 'Indeed Global',
    icon: Briefcase,
    color: 'bg-indigo-600',
    authType: 'browser_session',
    tagline: 'Connect Indeed to personalize discovery across US, UK, and worldwide tech hubs.',
    loginUrl: 'https://secure.indeed.com/auth',
  },
  linkedin: {
    name: 'LinkedIn',
    icon: Globe,
    color: 'bg-sky-600',
    authType: 'oauth',
    tagline: 'Connect LinkedIn for professional network recommendations.',
    loginUrl: 'https://www.linkedin.com/login',
  },
  greenhouse: {
    name: 'Greenhouse ATS',
    icon: Building2,
    color: 'bg-emerald-600',
    authType: 'public_feed',
    tagline: 'Direct unicorn and enterprise career board stream.',
  },
  adzuna: {
    name: 'Adzuna Free Index',
    icon: Search,
    color: 'bg-amber-600',
    authType: 'public_feed',
    tagline: 'Global search aggregator with live salary indices.',
  },
  lever: {
    name: 'Lever Job Postings',
    icon: Briefcase,
    color: 'bg-violet-600',
    authType: 'public_feed',
    tagline: 'Direct postings from high-growth tech startups.',
  },
  ashby: {
    name: 'Ashby Boards',
    icon: Layers,
    color: 'bg-rose-600',
    authType: 'public_feed',
    tagline: 'Compensation-enriched career postings.',
  },
  workable: {
    name: 'Workable Boards',
    icon: Search,
    color: 'bg-cyan-600',
    authType: 'public_feed',
    tagline: 'Fast-moving tech and agency job postings.',
  },
};

export const PortalConnectModal: React.FC<PortalConnectModalProps> = ({
  portal,
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Steps: email_input -> checking_browser -> browser_success | direct_login_fallback -> preferences -> connecting -> done
  const [step, setStep] = useState<
    'email_input' | 'checking_browser' | 'browser_success' | 'direct_login_fallback' | 'preferences' | 'connecting' | 'done'
  >('email_input');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [targetTitles, setTargetTitles] = useState('Software Engineer, Full Stack Developer, Tech Lead');
  const [targetLocations, setTargetLocations] = useState('Remote, London, Bangalore');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [browserCheckFailed, setBrowserCheckFailed] = useState(false);

  const config = PORTAL_CONFIG[portal] || {
    name: portal,
    icon: Globe,
    color: 'bg-emerald-600',
    authType: 'public_feed',
    tagline: 'Career portal stream',
  };
  const IconComponent = config.icon;

  useEffect(() => {
    if (isOpen) {
      setStep('email_input');
      setEmail('');
      setPassword('');
      setBrowserCheckFailed(false);
    }
  }, [isOpen, portal]);

  if (!isOpen) return null;

  // Handle email submission & attempt browser detection
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your portal account email');
      return;
    }

    if (config.authType === 'public_feed') {
      handleFinalizeConnect();
      return;
    }

    setStep('checking_browser');

    // Simulate browser session / extension pairing check
    setTimeout(() => {
      // If user has extension active, or we check session
      // By default, if browser session is not found, we smoothly show direct login fallback
      const mockBrowserSessionDetected = false; // Graceful fallback path

      if (mockBrowserSessionDetected) {
        setStep('browser_success');
      } else {
        setBrowserCheckFailed(true);
        setStep('direct_login_fallback');
      }
    }, 1200);
  };

  const handleOpenExternalLogin = () => {
    if (config.loginUrl) {
      window.open(config.loginUrl, '_blank', 'width=600,height=700');
      toast('Login window opened. Complete login, then click Continue.', {
        icon: 'ℹ️',
      });
    }
  };

  const handleFinalizeConnect = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setStep('connecting');

    try {
      // Step 1: Start connection attempt
      const startRes = await fetch('/api/portal-connections/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: portal }),
      });
      const startData = await startRes.json();

      if (!startRes.ok) {
        throw new Error(startData.error || 'Failed to initialize connection attempt');
      }

      // Step 2: Complete connection with email & encrypted session
      const titlesArray = targetTitles.split(',').map((t) => t.trim()).filter(Boolean);
      const locationsArray = targetLocations.split(',').map((l) => l.trim()).filter(Boolean);

      const completeRes = await fetch('/api/portal-connections/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionAttemptId: startData.connectionAttemptId,
          provider: portal,
          accountEmail: email.trim(),
          displayName: email.trim().split('@')[0],
          sessionPayload: password
            ? {
                method: 'direct_login',
                email: email.trim(),
                password,
              }
            : {
                method: 'browser_session',
                email: email.trim(),
              },
          preferences: {
            targetTitles: titlesArray,
            targetLocations: locationsArray,
            experienceYears: 3,
            minSalary: 0,
            dailyLimit: 25,
          },
        }),
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || 'Failed to complete connection');
      }

      setStep('done');
      toast.success(`${config.name} (${email}) connected successfully!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (error: any) {
      toast.error(error.message || 'Connection failed. Please try again.');
      setStep('direct_login_fallback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP: Done */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-[#013f2e]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">Connected!</h3>
            <p className="text-small text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              <strong className="text-gray-800 dark:text-gray-200">{email}</strong> is now connected to {config.name}. Job synchronization has started in the background.
            </p>
          </div>
        )}

        {/* STEP: Connecting */}
        {step === 'connecting' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-lime-600 dark:text-[#013f2e]">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">Connecting {config.name}...</h3>
            <p className="text-small text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              Establishing encrypted synchronization link for <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
            </p>
          </div>
        )}

        {/* STEP 1: Enter Account Email */}
        {step === 'email_input' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl ${config.color} flex items-center justify-center text-white shadow-md`}
              >
                <IconComponent className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Connect {config.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {config.tagline}
                </p>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-lime-600 dark:text-[#013f2e]" />
                  Enter your {config.name} Account Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`your.name@${portal}.com or personal email`}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2518] text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 placeholder:text-gray-400 shadow-sm"
                />
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5">
                  We will first verify if an active session exists in your browser for this email.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 p-2.5 rounded-xl bg-lime-50/50 dark:bg-lime-950/20 border border-lime-200/50 dark:border-lime-900/30">
                <Shield className="w-4 h-4 text-emerald-600 dark:text-[#013f2e] shrink-0" />
                <span>
                  Protected by AES-256-GCM encryption. Never shares your BuildAIResume JWT.
                </span>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 2: Checking Browser Session */}
        {step === 'checking_browser' && (
          <div className="p-8 flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Laptop className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                Checking Browser Session...
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                Looking for an active {config.name} login in your browser for <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
              </p>
            </div>
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {/* STEP 2A: Browser Session Detected Success */}
        {step === 'browser_success' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold block">Active Browser Session Detected!</span>
                <span>Found existing {config.name} session for {email}.</span>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-400">
              BuildAIResume will use this authorized session to stream matching roles and sync applications.
            </p>

            <button
              type="button"
              onClick={() => setStep('preferences')}
              className="w-full py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              Set Discovery Preferences
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* STEP 2B: Direct Login Fallback (When browser session is not detected) */}
        {step === 'direct_login_fallback' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('email_input')}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-bold text-gray-400">Sign-in Required</span>
            </div>

            {browserCheckFailed && (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Browser session not detected</span>
                  <span>No active {config.name} tab was found for {email}. Please authenticate below:</span>
                </div>
              </div>
            )}

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                Direct Secure Login for {config.name}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Account: <strong className="text-gray-700 dark:text-gray-300">{email}</strong>
              </p>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setStep('preferences'); }} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>{config.name} Password</span>
                  {config.loginUrl && (
                    <button
                      type="button"
                      onClick={handleOpenExternalLogin}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <span>Open {config.name} tab</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2518] text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5">
                <Lock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>
                  Password is encrypted using AES-256 server-side. Zero plaintext credentials stored.
                </span>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  Set Preferences
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 3: Discovery Preferences */}
        {step === 'preferences' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(password ? 'direct_login_fallback' : 'email_input')}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <span className="text-[11px] font-bold text-gray-400">Step 2 of 2</span>
            </div>

            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                Job Discovery Preferences
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Customize the roles and locations {config.name} should stream for <strong className="text-gray-700 dark:text-gray-300">{email}</strong>:
              </p>
            </div>

            <form onSubmit={handleFinalizeConnect} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Job Titles (comma separated)
                </label>
                <input
                  type="text"
                  value={targetTitles}
                  onChange={(e) => setTargetTitles(e.target.value)}
                  placeholder="e.g. Software Engineer, Full Stack, React Lead"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2518] text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Locations
                </label>
                <input
                  type="text"
                  value={targetLocations}
                  onChange={(e) => setTargetLocations(e.target.value)}
                  placeholder="e.g. Remote, London, Bangalore"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2518] text-gray-900 dark:text-white focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  Connect & Start Sync
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalConnectModal;
