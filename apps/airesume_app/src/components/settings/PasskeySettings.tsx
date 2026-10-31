'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Key, Plus, Trash2, Loader2, ShieldCheck, Smartphone, Laptop, CheckCircle2 } from 'lucide-react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';
import toast from '@/lib/hot-toast';

interface PasskeyData {
  credentialID: string;
  name: string;
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

function getPasskeyIcon(name: string, deviceType?: string) {
  const lower = (name || '').toLowerCase();
  if (lower.includes('phone') || lower.includes('iphone') || lower.includes('android')) {
    return <Smartphone className="w-5 h-5 text-emerald-400" />;
  }
  if (lower.includes('mac') || lower.includes('laptop') || lower.includes('windows') || lower.includes('pc')) {
    return <Laptop className="w-5 h-5 text-emerald-400" />;
  }
  if (lower.includes('key') || lower.includes('yubi')) {
    return <Key className="w-5 h-5 text-amber-400" />;
  }
  return <Fingerprint className="w-5 h-5 text-emerald-400" />;
}

function getDefaultDeviceName(): string {
  if (typeof window === 'undefined') return 'Passkey';
  const ua = window.navigator.userAgent;
  if (/Macintosh/i.test(ua)) return 'MacBook Touch ID';
  if (/iPhone/i.test(ua)) return 'iPhone Face ID';
  if (/iPad/i.test(ua)) return 'iPad Touch ID';
  if (/Windows/i.test(ua)) return 'Windows Hello';
  if (/Android/i.test(ua)) return 'Android Biometric';
  return 'Personal Passkey';
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return 'Recently';
  }
}

export default function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [showNameModal, setShowNameModal] = useState(false);
  const [passkeyName, setPasskeyName] = useState(getDefaultDeviceName());

  useEffect(() => {
    setIsSupported(browserSupportsWebAuthn());
  }, []);

  const fetchPasskeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/passkey/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.passkeys)) {
        setPasskeys(data.passkeys);
      }
    } catch (err) {
      console.error('Failed to fetch passkeys:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPasskeys();
  }, [fetchPasskeys]);

  const handleStartAddPasskey = () => {
    if (!browserSupportsWebAuthn()) {
      toast.error('Passkeys are not supported on this browser or device.');
      return;
    }
    setPasskeyName(getDefaultDeviceName());
    setShowNameModal(true);
  };

  const handleConfirmAddPasskey = async () => {
    setShowNameModal(false);
    setRegistering(true);

    try {
      // 1. Fetch challenge and registration options from server
      const optRes = await fetch('/api/auth/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const optData = await optRes.json();

      if (!optData.success || !optData.options) {
        throw new Error(optData.message || 'Could not initiate passkey registration.');
      }

      // 2. Prompt native browser Touch ID / Face ID / Windows Hello
      const registrationResponse = await startRegistration(optData.options);

      // 3. Verify signature and save passkey to database
      const verifyRes = await fetch('/api/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: registrationResponse,
          name: passkeyName.trim() || getDefaultDeviceName(),
        }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        throw new Error(verifyData.message || 'Verification failed on server.');
      }

      toast.success('Passkey added successfully! You can now use it to sign in.');
      await fetchPasskeys();
    } catch (error: any) {
      if (error?.name === 'NotAllowedError') {
        // User cancelled the prompt - silent or polite note
        console.log('User cancelled passkey registration.');
      } else {
        toast.error(error?.message || 'Failed to register passkey.');
      }
    } finally {
      setRegistering(false);
    }
  };

  const handleDeletePasskey = async (credentialID: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"? You will not be able to sign in with this passkey anymore.`)) {
      return;
    }

    setDeletingId(credentialID);
    try {
      const res = await fetch(`/api/auth/passkey/${encodeURIComponent(credentialID)}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success('Passkey removed.');
        setPasskeys(prev => prev.filter(p => p.credentialID !== credentialID));
      } else {
        toast.error(data.message || 'Failed to delete passkey.');
      }
    } catch (err: any) {
      toast.error('Network error. Could not delete passkey.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-small font-medium text-gray-900 dark:text-white">Passkeys & Biometrics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3 h-3" /> Recommended
            </span>
          </div>
          <p className="text-small text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            Sign in without a password using Touch ID, Face ID, Windows Hello, or a hardware security key.
          </p>
        </div>

        <button
          onClick={handleStartAddPasskey}
          disabled={registering || !isSupported}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 active:bg-lime-700 text-white rounded-lg font-medium text-small transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shrink-0"
        >
          {registering ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Scanning...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>Add Passkey</span>
            </>
          )}
        </button>
      </div>

      {!isSupported && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-small text-amber-700 dark:text-amber-400">
          Your current browser or device does not support WebAuthn Passkeys. Try using Safari, Chrome, or Edge on macOS, iOS, Windows, or Android.
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-400 text-small gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading passkeys...</span>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
          <Fingerprint className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-60" />
          <p className="text-small font-medium text-gray-700 dark:text-gray-300">No passkeys registered yet</p>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Add your fingerprint, facial recognition, or security key for instant 1-click login.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {passkeys.map(pk => (
            <div
              key={pk.credentialID}
              className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-[#1f1f1f] rounded-xl border border-gray-200 dark:border-gray-800 transition hover:border-gray-300 dark:hover:border-gray-700"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-white dark:bg-[#2a2a2a] flex items-center justify-center border border-gray-100 dark:border-gray-700/60 shadow-xs shrink-0">
                  {getPasskeyIcon(pk.name, pk.deviceType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-small font-semibold text-gray-900 dark:text-white truncate">
                      {pk.name}
                    </span>
                    {pk.backedUp && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        Synced
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span>Added {formatDate(pk.createdAt)}</span>
                    <span>•</span>
                    <span>Last used {formatDate(pk.lastUsedAt)}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeletePasskey(pk.credentialID, pk.name)}
                disabled={deletingId === pk.credentialID}
                title="Remove passkey"
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors shrink-0 disabled:opacity-50"
              >
                {deletingId === pk.credentialID ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Device Name Modal */}
      {showNameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-lime-500/10 text-lime-500 flex items-center justify-center mb-4 border border-lime-500/20">
              <Fingerprint className="w-6 h-6" />
            </div>
            <h3 className="text-h3 font-semibold text-gray-900 dark:text-white">Name Your Passkey</h3>
            <p className="text-small text-gray-500 dark:text-gray-400 mt-1">
              Give this device or key a friendly name so you can recognize it later.
            </p>

            <div className="mt-4">
              <input
                type="text"
                autoFocus
                value={passkeyName}
                onChange={e => setPasskeyName(e.target.value)}
                placeholder="e.g. MacBook Touch ID, iPhone Face ID"
                className="w-full px-3.5 py-2.5 text-small border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-[#242424] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500"
                onKeyDown={e => {
                  if (e.key === 'Enter') handleConfirmAddPasskey();
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-4 py-2 text-small font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAddPasskey}
                className="px-4 py-2 text-small font-medium bg-lime-500 hover:bg-lime-600 active:bg-lime-700 text-white rounded-xl transition shadow-xs"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
