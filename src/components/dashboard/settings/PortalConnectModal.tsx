'use client';

import React, { useState } from 'react';
import {
  Globe,
  Briefcase,
  Layers,
  Search,
  Building2,
  X,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export type PortalType = 'naukri' | 'indeed' | 'greenhouse' | 'adzuna' | 'lever' | 'ashby' | 'workable';

interface PortalConnectModalProps {
  portal: PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PORTAL_CONFIG: Record<PortalType, {
  name: string;
  icon: any;
  color: string;
  loginUrl: string;
  sessionBased: boolean;
}> = {
  naukri: {
    name: 'Naukri',
    icon: Globe,
    color: 'bg-blue-600',
    loginUrl: 'https://www.naukri.com/mnjuser/login',
    sessionBased: true,
  },
  indeed: {
    name: 'Indeed',
    icon: Briefcase,
    color: 'bg-indigo-600',
    loginUrl: 'https://secure.indeed.com/auth',
    sessionBased: true,
  },
  greenhouse: {
    name: 'Greenhouse',
    icon: Building2,
    color: 'bg-emerald-600',
    loginUrl: '',
    sessionBased: false,
  },
  adzuna: {
    name: 'Adzuna',
    icon: Search,
    color: 'bg-amber-600',
    loginUrl: '',
    sessionBased: false,
  },
  lever: {
    name: 'Lever',
    icon: Briefcase,
    color: 'bg-violet-600',
    loginUrl: '',
    sessionBased: false,
  },
  ashby: {
    name: 'Ashby',
    icon: Layers,
    color: 'bg-rose-600',
    loginUrl: '',
    sessionBased: false,
  },
  workable: {
    name: 'Workable',
    icon: Search,
    color: 'bg-cyan-600',
    loginUrl: '',
    sessionBased: false,
  },
};

export const PortalConnectModal: React.FC<PortalConnectModalProps> = ({
  portal,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'idle' | 'logging_in' | 'credentials' | 'connecting' | 'done'>('idle');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const config = PORTAL_CONFIG[portal];
  const IconComponent = config.icon;

  if (!isOpen) return null;

  const handleOpenPortal = () => {
    window.open(config.loginUrl, '_blank');
    setStep('credentials');
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setStep('connecting');

    try {
      const endpoint =
        portal === 'naukri'
          ? '/api/integrations/naukri/login'
          : '/api/integrations/indeed/login';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Could not connect');
      }

      setStep('done');
      toast.success(`${config.name} connected!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (error: any) {
      toast.error(error.message || 'Connection failed. Please try again.');
      setStep('credentials');
    }
  };

  const handleQuickConnect = async () => {
    setStep('connecting');

    try {
      if (portal === 'greenhouse' || portal === 'lever' || portal === 'ashby' || portal === 'workable' || portal === 'adzuna') {
        // Public API - no auth needed
        setStep('done');
        toast.success(`${config.name} connected!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
        return;
      }

      // Session-based portals need credentials
      setStep('credentials');
    } catch {
      setStep('idle');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-white dark:bg-[#141810] rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Done state */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-7 h-7 text-lime-600 dark:text-lime-400" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Connected!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{config.name} is ready to go</p>
          </div>
        )}

        {/* Connecting state */}
        {step === 'connecting' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
              <Loader2 className="w-7 h-7 text-gray-400 animate-spin" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">Connecting...</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Setting up {config.name}</p>
          </div>
        )}

        {/* Credentials form (Naukri / Indeed) */}
        {step === 'credentials' && config.sessionBased && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center text-white shadow-md`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Login to {config.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enter your {config.name} credentials
                </p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-3">
              <div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={`${config.name} email`}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1a230f] text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-lime-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                className={`w-full py-2.5 text-sm font-semibold text-white ${config.color} hover:opacity-90 rounded-xl transition-all shadow-md`}
              >
                Connect {config.name}
              </button>
            </form>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-3">
              Your credentials are encrypted and stored securely
            </p>
          </div>
        )}

        {/* Initial state (public APIs or before credentials) */}
        {step === 'idle' && (
          <div className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center text-white shadow-md`}>
                <IconComponent className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Connect {config.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {config.sessionBased
                    ? 'Link your account for auto-apply'
                    : 'Free public API — instant setup'}
                </p>
              </div>
            </div>

            {config.sessionBased ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We&apos;ll open {config.name} so you can log in, then connect your account automatically.
                </p>
                <button
                  onClick={handleOpenPortal}
                  className={`w-full py-2.5 text-sm font-semibold text-white ${config.color} hover:opacity-90 rounded-xl transition-all shadow-md flex items-center justify-center gap-2`}
                >
                  Login to {config.name}
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {portal === 'greenhouse' && 'Fetches live jobs from Greenhouse company boards.'}
                  {portal === 'lever' && 'Streams jobs from public Lever company pages.'}
                  {portal === 'ashby' && 'Pulls roles from Ashby public job boards.'}
                  {portal === 'workable' && 'Connects to Workable public job listings.'}
                  {portal === 'adzuna' && 'Searches millions of jobs via Adzuna index.'}
                </p>
                <button
                  onClick={handleQuickConnect}
                  className={`w-full py-2.5 text-sm font-semibold text-white ${config.color} hover:opacity-90 rounded-xl transition-all shadow-md`}
                >
                  Enable {config.name}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalConnectModal;
