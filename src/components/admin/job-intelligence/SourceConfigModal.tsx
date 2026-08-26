'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Shield, Clock, Sliders, CheckCircle2 } from 'lucide-react';

interface SourceConfigModalProps {
  source: any;
  onClose: () => void;
  onSaved: () => void;
}

export default function SourceConfigModal({ source, onClose, onSaved }: SourceConfigModalProps) {
  const [enabled, setEnabled] = useState(source.enabled !== false);
  const [frequency, setFrequency] = useState(source.schedule?.frequencyMinutes || 30);
  const [priority, setPriority] = useState(source.priority || 80);
  const [maxJobs, setMaxJobs] = useState(source.limits?.maxJobsPerRun || 500);
  const [concurrency, setConcurrency] = useState(source.limits?.concurrency || 5);
  const [apiKey, setApiKey] = useState('************a91f');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        action: 'update_source',
        sourceName: source.name,
        sourceConfig: {
          enabled,
          priority,
          schedule: { frequencyMinutes: Number(frequency) },
          limits: {
            maxJobsPerRun: Number(maxJobs),
            concurrency: Number(concurrency),
            timeoutMs: 30000,
            retryCount: 3,
          },
        },
      };

      const res = await fetch('/api/admin/job-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => {
          onSaved();
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error('Save source config error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#0d0d0d] border border-white/10 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                Configure {source.displayName}
              </h3>
              <p className="text-xs text-white/50">
                Source ID: {source.name} · Type: {source.type}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-sm">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/[0.03] border border-white/5">
            <div>
              <div className="font-semibold text-white">Source Enabled</div>
              <div className="text-xs text-white/40">Include in automatic ingestion runs</div>
            </div>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Schedule Frequency */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
              Scraping Frequency (Minutes)
            </label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-3 w-4 h-4 text-white/30" />
              <input
                type="number"
                min="5"
                max="1440"
                value={frequency}
                onChange={(e) => setFrequency(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Priority & Max Jobs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                Priority (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5">
                Max Jobs / Run
              </label>
              <input
                type="number"
                min="50"
                max="5000"
                value={maxJobs}
                onChange={(e) => setMaxJobs(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Masked Credentials */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-white/60 mb-1.5 flex items-center justify-between">
              <span>API Key / Token (Masked)</span>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <Shield className="w-3 h-3" /> Encrypted
              </span>
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white/70 focus:outline-none focus:border-emerald-500 transition-all font-mono text-xs"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
