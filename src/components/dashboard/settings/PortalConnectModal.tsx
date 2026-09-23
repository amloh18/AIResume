'use client';

import React, { useState, useEffect } from 'react';
import { Mail, ShieldCheck, ArrowRight, Loader2, CheckCircle2, AlertTriangle, Lock } from 'lucide-react';
import toast from '@/lib/hot-toast';
import {
  JOB_SOURCE_DESCRIPTORS,
  JobSourceProvider,
} from '@/lib/portals/connection-state';
import { useConnectJobSource } from '@/hooks/useJobSourceConnections';

/**
 * The supported connection sources. Narrowed from eight to three: the other five
 * were public-feed sources that never went through this modal, and listing them
 * here invited a caller to open a connect flow for something that has no account
 * to connect.
 */
export type PortalType = JobSourceProvider;

interface PortalConnectModalProps {
  portal: PortalType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type Step = 'intro' | 'connecting' | 'done' | 'error';

/**
 * Connect a job-site account.
 *
 * ⚠️ This modal no longer collects a password, and no longer pretends to detect a
 * browser session.
 *
 * What it replaced: a "Checking Browser Session…" step whose result was hardcoded
 * (`const mockBrowserSessionDetected = false`) — so it *always* failed and *always*
 * fell through to a password form. The user was then asked to type their Indeed /
 * Naukri / LinkedIn password into our page, which was encrypted and stored
 * server-side, under copy claiming "Zero plaintext credentials stored".
 *
 * The honest position: these sites offer no API for this, and reading another
 * domain's session requires a browser extension, which is not part of this phase.
 * So connecting records the account the user uses and nothing else. The dialog says
 * so plainly rather than implying a session was captured.
 */
export const PortalConnectModal: React.FC<PortalConnectModalProps> = ({
  portal,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>('intro');
  const [accountIdentifier, setAccountIdentifier] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const connect = useConnectJobSource();
  const descriptor = JOB_SOURCE_DESCRIPTORS[portal];

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setAccountIdentifier('');
      setErrorMessage(null);
    }
  }, [isOpen, portal]);

  if (!isOpen || !descriptor) return null;

  const handleContinue = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setStep('connecting');
    setErrorMessage(null);

    try {
      await connect.mutateAsync({
        provider: portal,
        // Optional. We store nothing when it is blank rather than inventing an
        // address — see `BasePortalAdapter.markConnected`.
        accountIdentifier: accountIdentifier.trim() || undefined,
        displayName: accountIdentifier.trim()
          ? accountIdentifier.trim().split('@')[0]
          : undefined,
      });

      setStep('done');
      // Let the confirmation register before the caller closes the dialog and the
      // card behind it flips to Connected.
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);
    } catch (error: any) {
      // The API returns a safe, user-facing message; anything else is generic.
      // Stack traces, cookies, tokens and backend URLs never reach the UI.
      setErrorMessage(
        typeof error?.message === 'string' && error.message.length < 200
          ? error.message
          : `Unable to connect ${descriptor.name}`
      );
      setStep('error');
    }
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
            <div className="w-16 h-16 rounded-2xl bg-lime-100 dark:bg-lime-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-lime-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">
              {descriptor.name} connected
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
              Your {descriptor.name} account is now connected to AIResume. You can
              manage this connection from Settings.
            </p>
          </div>
        )}

        {/* ── Connecting ────────────────────────────────────────────────── */}
        {step === 'connecting' && (
          <div className="p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4 text-lime-600 dark:text-lime-400">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-xl">
              Connecting {descriptor.name}…
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 max-w-xs">
              Saving your account connection.
            </p>
          </div>
        )}

        {/* ── Failed ────────────────────────────────────────────────────── */}
        {step === 'error' && (
          <div className="p-6 sm:p-7 space-y-5">
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Unable to connect {descriptor.name}</span>
                <span>Your account was not connected. {errorMessage}</span>
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
                onClick={() => handleContinue()}
                className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm"
              >
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
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  Connect your {descriptor.name} account
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {descriptor.description}
                </p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                {descriptor.name} doesn&apos;t offer an API for this, so AIResume connects
                by recording the account you use.
              </p>
              <p>
                Your account connection is stored securely in your profile. You can
                disconnect at any time from Settings.
              </p>
            </div>

            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label
                  htmlFor="job-source-account"
                  className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5"
                >
                  {descriptor.name} account email{' '}
                  <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  id="job-source-account"
                  type="email"
                  autoFocus
                  value={accountIdentifier}
                  onChange={(e) => setAccountIdentifier(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1e2518] text-gray-900 dark:text-white focus:outline-none focus:border-lime-500 placeholder:text-gray-400 shadow-sm"
                />
              </div>

              <div className="flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-400 p-2.5 rounded-xl bg-lime-50/50 dark:bg-lime-950/20 border border-lime-200/50 dark:border-lime-900/30">
                <Lock className="w-4 h-4 text-emerald-600 dark:text-lime-400 shrink-0 mt-px" />
                <span>
                  AIResume never asks for or stores your {descriptor.name} password.
                </span>
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
                  type="submit"
                  disabled={connect.isPending}
                  className="flex-1 py-2.5 text-xs font-black bg-[#013f2e] hover:brightness-95 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  Continue
                  <ArrowRight className="w-3.5 h-3.5" />
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
