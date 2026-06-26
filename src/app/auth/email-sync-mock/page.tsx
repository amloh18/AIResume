'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Shield, Check, AlertCircle } from 'lucide-react';

export default function EmailSyncMockPage() {
  const [provider, setProvider] = useState<'gmail' | 'outlook'>('gmail');
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('provider');
      if (p === 'outlook') {
        setProvider('outlook');
      }
      const e = params.get('email');
      if (e) {
        setEmailInput(e);
      }
    }
  }, []);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/tracker/emails/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect',
          provider,
          emailAddress: emailInput,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        // Post message back to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'email-sync-success',
              provider,
              emailAddress: emailInput,
            },
            '*'
          );
        }
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        setError(data.error || 'Failed to authorize email connection.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold mb-2">Authorization Successful!</h1>
        <p className="text-sm text-gray-400">Connecting your inbox and closing window...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white flex flex-col justify-between p-6">
      {/* Brand Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/5">
        {provider === 'gmail' ? (
          <div className="flex items-center gap-2">
            <svg className="h-6 w-6" viewBox="0 0 24 24">
              <path fill="#EA4335" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 6l8 5 8-5v2l-8 5-8-5V6z"/>
            </svg>
            <span className="font-bold text-sm text-gray-200">Google Account Sync</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-2 gap-0.5 w-5 h-5">
              <div className="bg-[#F25022] w-2 h-2"></div>
              <div className="bg-[#7FBA00] w-2 h-2"></div>
              <div className="bg-[#00A4EF] w-2 h-2"></div>
              <div className="bg-[#FFB900] w-2 h-2"></div>
            </div>
            <span className="font-bold text-sm text-gray-200">Microsoft Account Sync</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
          <Shield className="h-3.5 w-3.5 text-emerald-500" />
          <span>Secure Connection</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="my-auto max-w-sm w-full mx-auto space-y-6 py-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {provider === 'gmail' ? 'Sign in with Google' : 'Sign in with Microsoft'}
          </h2>
          <p className="text-xs text-gray-400 px-4">
            to grant <span className="font-bold text-lime-400">CVCircle App</span> access to track your application and update pipeline stages.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2 animate-shake">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuthorize} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
              Email Address
            </label>
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={provider === 'gmail' ? 'your-name@gmail.com' : 'your-name@outlook.com'}
              className="w-full text-sm px-4 py-3 bg-[#161616] border border-white/10 rounded-2xl focus:outline-none focus:ring-1 focus:ring-lime-500 text-white placeholder-gray-600"
            />
          </div>

          {/* Consent Checkboxes */}
          <div className="p-4 bg-white/5 border border-white/5 rounded-3xl space-y-3">
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Requested Permissions:
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 text-xs">
                <Check className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">Read job applications and related communications</span>
              </div>
              <div className="flex items-start gap-2.5 text-xs">
                <Check className="h-4 w-4 text-lime-400 shrink-0 mt-0.5" />
                <span className="text-gray-300">Auto-classify stages and update job tracker</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => window.close()}
              className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !emailInput}
              className="flex-1 px-4 py-3 bg-lime-500 hover:bg-lime-600 text-black rounded-2xl text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-lime-500/20"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                'Grant Access'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Footer Disclaimer */}
      <div className="text-[10px] text-gray-600 text-center pt-4 border-t border-white/5">
        By continuing, you authorize CVCircle to connect to your mailbox securely. You can revoke access at any time in your Settings dashboard.
      </div>
    </div>
  );
}
