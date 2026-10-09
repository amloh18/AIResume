'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Globe,
  RefreshCw,
} from 'lucide-react';
import {
  JOB_SOURCE_DESCRIPTORS,
  JobSourceProvider,
} from '@/lib/portals/connection-state';
import { useConnectJobSource } from '@/hooks/useJobSourceConnections';

export type PortalType = JobSourceProvider;

interface PortalConnectModalProps {
  portal: PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'waiting_login' | 'verifying' | 'done' | 'error';

export const PortalConnectModal: React.FC<PortalConnectModalProps> = ({
  portal,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useConnectJobSource();
  const descriptor = JOB_SOURCE_DESCRIPTORS[portal];

  const clearPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setErrorMessage(null);
    } else {
      clearPolling();
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
    }
    return () => {
      clearPolling();
    };
  }, [isOpen, portal]);

  if (!isOpen || !descriptor) return null;

  const completeConnection = async (sessionPayload?: unknown) => {
    setStep('verifying');
    setErrorMessage(null);

    try {
      await connect.mutateAsync({
        provider: portal,
        preferences: {
          targetTitles: ['Software Engineer', 'Product Manager', 'Data Scientist'],
        },
      });

      // Close the popup window automatically if open
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
      popupRef.current = null;
      clearPolling();

      setStep('done');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error: any) {
      clearPolling();
      const message =
        typeof error?.message === 'string' && error.message.length < 200
          ? error.message
          : `Failed to verify your ${descriptor.name} session. Please ensure you are logged in and try again.`;
      setErrorMessage(message);
      setStep('error');
    }
  };

  const handleOpenLogin = () => {
    setErrorMessage(null);

    // Calculate center screen for popup window
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      descriptor.loginUrl,
      `${descriptor.name}Login`,
      `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no`
    );

    if (!popup || popup.closed) {
      // Pop-up blocked by browser
      setErrorMessage(
        'Popup was blocked by your browser. Please allow popups for BuildAIResume or click "Open in New Tab" below.'
      );
      setStep('error');
      return;
    }

    popupRef.current = popup;
    setStep('waiting_login');

    // Poll to detect when user closes the window or finishes
    clearPolling();
    pollTimerRef.current = setInterval(() => {
      if (popup.closed) {
        clearPolling();
        // Window was closed by user
        // We prompt verification
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Connect ${descriptor.name}`}
        className="relative w-full max-w-md bg-white dark:bg-[#141810] rounded-3xl border border-gray-200 dark:border-white/10 shadow-2xl overflow-hidden"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <span aria-hidden className="text-lg leading-none">×</span>
        </button>

        {/* ── Connected ─────────────────────────────────────────────────── */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-lime-400 animate-in zoom-in-95">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">
              {descriptor.name} connected
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
              Your session has been connected to BuildAIResume. You can manage this
              connection from Settings anytime.
            </p>
          </div>
        )}

        {/* ── Verifying ─────────────────────────────────────────────────── */}
        {step === 'verifying' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-lime-600 dark:text-lime-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">
              Verifying {descriptor.name} Session…
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
              Saving your account connection securely.
            </p>
          </div>
        )}

        {/* ── Waiting for Login in Popup ─────────────────────────────────── */}
        {step === 'waiting_login' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl ${descriptor.iconClass} flex items-center justify-center shrink-0`}
              >
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Login to {descriptor.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Window opened on {descriptor.domain}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-lime-50/60 dark:bg-lime-950/20 border border-lime-200/50 dark:border-lime-900/30 space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-lime-300">
                <Loader2 className="w-4 h-4 animate-spin text-lime-600 dark:text-lime-400" />
                <span>Waiting for you to log in…</span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                1. Complete your sign-in in the opened {descriptor.name} window.
                <br />
                2. Once signed in, click <strong>&quot;Confirm & Connect&quot;</strong> below.
              </p>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
              <span>Window not appearing?</span>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="font-semibold text-emerald-600 dark:text-lime-400 hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reopen login window
              </button>
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
                type="button"
                onClick={() => completeConnection()}
                disabled={connect.isPending}
                className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                {connect.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Confirm & Connect
              </button>
            </div>
          </div>
        )}

        {/* ── Failed ────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Connection Failed</span>
                <span className="mt-0.5 block leading-relaxed">{errorMessage}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Intro ─────────────────────────────────────────────────────── */}
        {step === 'intro' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl ${descriptor.iconClass} flex items-center justify-center shrink-0`}
              >
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Connect {descriptor.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {descriptor.description}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-gray-600 dark:text-gray-400 leading-relaxed bg-gray-50/70 dark:bg-white/[0.02] p-4 rounded-2xl border border-gray-100 dark:border-white/5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-lime-100 dark:bg-lime-900/30 text-emerald-700 dark:text-lime-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  Click <strong>&quot;Open {descriptor.name} Login&quot;</strong> to log into your account directly on {descriptor.domain}.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-lime-100 dark:bg-lime-900/30 text-emerald-700 dark:text-lime-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  No email or password is ever entered into or stored by BuildAIResume.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-lime-100 dark:bg-lime-900/30 text-emerald-700 dark:text-lime-400 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  Your session connects safely and allows streamlined job discovery.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-lime-400 shrink-0" />
              <span>You can disconnect this account at any time.</span>
            </div>

            <div className="pt-1 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                Open {descriptor.name} Login
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PortalConnectModal;
