'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Sliders, Shield, CheckCircle2, Save, Zap } from 'lucide-react';

export default function AutoApplySettingsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(15);
  const [minMatchScore, setMinMatchScore] = useState(85);
  const [remoteOnly, setRemoteOnly] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 space-y-6 max-w-2xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Autonomous Auto-Apply Preferences
            </h3>
            <p className="text-xs text-white/50">
              Control daily application limits, minimum match threshold, and platform safety rules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white/60">
            {enabled ? 'Active' : 'Disabled'}
          </span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
              enabled ? 'bg-emerald-500' : 'bg-white/20'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Daily Quota Slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-white">Daily Application Quota</label>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {dailyLimit} / day
            </span>
          </div>
          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={dailyLimit}
            onChange={(e) => setDailyLimit(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <p className="text-[11px] text-white/40">
            Guarantees safe pacing to prevent employer rate limits or low-quality submission spam.
          </p>
        </div>

        {/* Min Match Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="font-bold text-white">Minimum Match Score Threshold</label>
            <span className="font-mono text-emerald-400 font-bold text-sm">
              {minMatchScore}%+
            </span>
          </div>
          <input
            type="range"
            min="70"
            max="95"
            step="5"
            value={minMatchScore}
            onChange={(e) => setMinMatchScore(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <p className="text-[11px] text-white/40">
            Only applies to jobs where your Master Profile score meets or exceeds this bar.
          </p>
        </div>

        {/* Remote Only Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
          <div>
            <div className="font-semibold text-white">Remote Roles Only</div>
            <div className="text-[11px] text-white/40">Filter out on-site and non-remote roles</div>
          </div>
          <input
            type="checkbox"
            checked={remoteOnly}
            onChange={(e) => setRemoteOnly(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded"
          />
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" /> Preferences Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Preferences'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
