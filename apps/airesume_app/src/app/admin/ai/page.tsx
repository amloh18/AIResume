'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, Save, CheckCircle2, AlertTriangle, Cpu } from 'lucide-react';

interface AIConfig {
  primaryModel: string;
  fastModel: string;
  overridePerCallModels: boolean;
  useOllama: boolean;
  defaultTemperature?: number;
  source: 'admin' | 'env' | 'default';
}

interface Usage {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalTokens: number;
  totalCost: number;
  callsLast30Days: number;
  costLast30Days: number;
  byModel: Array<{ model: string; calls: number; tokens: number; cost: number }>;
}

const SUGGESTED_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const fmtInt = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);
const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 4 }).format(n || 0);

export default function AdminAIPage() {
  const [config, setConfig] = useState<AIConfig | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [envModel, setEnvModel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Local editable draft
  const [draft, setDraft] = useState({
    primaryModel: '',
    fastModel: '',
    overridePerCallModels: false,
    useOllama: true,
  });

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/ai-settings', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      setConfig(body.config);
      setUsage(body.usage);
      setEnvModel(body.envModel);
      setDraft({
        primaryModel: body.config.primaryModel,
        fastModel: body.config.fastModel,
        overridePerCallModels: body.config.overridePerCallModels,
        useOllama: body.config.useOllama,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load AI settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch('/api/admin/ai-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setFeedback({ type: 'success', message: 'AI settings saved. New model applies to the next AI call — no redeploy needed.' });
      await load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="ml-2 text-sm text-gray-500">Loading AI settings…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <Cpu className="w-6 h-6 text-emerald-500" /> AI Models
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Runtime model selection for every AI call. Takes effect on the next request — no redeploy.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-sm flex items-start gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {feedback.type === 'success'
            ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          <div className="flex-1">{feedback.message}</div>
          <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">Dismiss</button>
        </div>
      )}

      {/* Config card */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-sm font-bold">Model configuration</h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono uppercase">
            source: {config?.source}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Primary model</label>
            <input
              list="model-options"
              value={draft.primaryModel}
              onChange={(e) => setDraft({ ...draft, primaryModel: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">Used for all general AI workloads.</p>
          </div>
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Fast / lite model</label>
            <input
              list="model-options"
              value={draft.fastModel}
              onChange={(e) => setDraft({ ...draft, fastModel: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] font-mono"
            />
            <p className="text-[11px] text-gray-400 mt-1">Used for transcription, parsing, and other high-volume tasks.</p>
          </div>
        </div>

        <datalist id="model-options">
          {SUGGESTED_MODELS.map((m) => <option key={m} value={m} />)}
        </datalist>

        <div className="space-y-2 text-xs">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={draft.overridePerCallModels}
              onChange={(e) => setDraft({ ...draft, overridePerCallModels: e.target.checked })}
              className="mt-0.5 rounded"
            />
            <span>
              <span className="font-semibold">Override per-call models</span>
              <span className="block text-gray-400">
                Force every AI call to use the primary/fast model above, ignoring any model a specific feature requests. Useful to retire a model everywhere at once.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={draft.useOllama}
              onChange={(e) => setDraft({ ...draft, useOllama: e.target.checked })}
              className="mt-0.5 rounded"
            />
            <span>
              <span className="font-semibold">Try Ollama first (local)</span>
              <span className="block text-gray-400">
                When on, requests hit the local Ollama instance and fall back to Gemini only if Ollama is down. Turn off to call Gemini directly.
              </span>
            </span>
          </label>
        </div>

        {envModel && (
          <p className="text-[11px] text-gray-400">
            Env fallback <span className="font-mono">{envModel}</span> is used only when no admin document exists.
          </p>
        )}

        <div className="flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save settings
          </button>
        </div>
      </div>

      {/* Usage card */}
      {usage && (
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-sm font-bold mb-4">AI usage</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5 text-center">
            <div>
              <div className="text-xl font-extrabold">{fmtInt(usage.totalCalls)}</div>
              <div className="text-[11px] text-gray-400">Total calls</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{fmtInt(usage.callsLast30Days)}</div>
              <div className="text-[11px] text-gray-400">Calls (30d)</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{fmtInt(usage.totalTokens)}</div>
              <div className="text-[11px] text-gray-400">Tokens</div>
            </div>
            <div>
              <div className="text-xl font-extrabold">{fmtMoney(usage.totalCost)}</div>
              <div className="text-[11px] text-gray-400">Est. cost ({fmtMoney(usage.costLast30Days)} last 30d)</div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 text-left">
                  <th className="py-2 font-semibold">Model</th>
                  <th className="py-2 font-semibold text-right">Calls</th>
                  <th className="py-2 font-semibold text-right">Tokens</th>
                  <th className="py-2 font-semibold text-right">Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {usage.byModel.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">No AI usage recorded yet.</td></tr>
                )}
                {usage.byModel.map((m) => (
                  <tr key={m.model}>
                    <td className="py-2 font-mono">{m.model}</td>
                    <td className="py-2 text-right">{fmtInt(m.calls)}</td>
                    <td className="py-2 text-right">{fmtInt(m.tokens)}</td>
                    <td className="py-2 text-right">{fmtMoney(m.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
