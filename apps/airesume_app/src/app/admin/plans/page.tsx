'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Save, Plus, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Plan {
  _id: string;
  key: string;
  name: string;
  description: string;
  billingCycle: string;
  price_monthly?: number;
  price_quarterly?: number;
  price_yearly?: number;
  price_one_time?: number;
  credits?: { jobCredits: number; resetSchedule: string };
  storageLimit?: number;
  features: string[];
  status: 'active' | 'inactive';
  isPopular: boolean;
  isBestValue: boolean;
  sortOrder: number;
  displayOnLanding: boolean;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const PRICE_FIELD_FOR_CYCLE: Record<string, string> = {
  monthly: 'price_monthly',
  quarterly: 'price_quarterly',
  yearly: 'price_yearly',
  'one-time': 'price_one_time',
};

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Plan>>({});

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/plans', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      const list: Plan[] = body.plans || [];
      setPlans(list);
      const initial: Record<string, Plan> = {};
      list.forEach((p) => { initial[p._id] = { ...p, features: [...(p.features || [])] }; });
      setDrafts(initial);
    } catch (err: any) {
      setError(err.message || 'Failed to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateDraft = (id: string, patch: Partial<Plan>) => {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  };

  const updatePrice = (id: string, cycle: string, value: string) => {
    const field = PRICE_FIELD_FOR_CYCLE[cycle];
    if (!field) return;
    updateDraft(id, { [field]: value === '' ? 0 : Number(value) } as Partial<Plan>);
  };

  const currentPrice = (p: Plan) => {
    const field = PRICE_FIELD_FOR_CYCLE[p.billingCycle];
    return (p as any)[field] ?? 0;
  };

  const save = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    try {
      setSavingId(id);
      setFeedback(null);
      const res = await fetch(`/api/admin/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          price_monthly: draft.price_monthly,
          price_quarterly: draft.price_quarterly,
          price_yearly: draft.price_yearly,
          price_one_time: draft.price_one_time,
          credits: draft.credits,
          storageLimit: draft.storageLimit,
          features: (draft.features || []).filter((f) => f.trim() !== ''),
          status: draft.status,
          isPopular: draft.isPopular,
          isBestValue: draft.isBestValue,
          sortOrder: draft.sortOrder,
          displayOnLanding: draft.displayOnLanding,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      setFeedback({ type: 'success', message: `Saved ${draft.name}. Live pricing cache invalidated.` });
      await load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Save failed' });
    } finally {
      setSavingId(null);
    }
  };

  const addFeature = (id: string) => {
    const draft = drafts[id];
    updateDraft(id, { features: [...(draft.features || []), ''] });
  };

  const setFeature = (id: string, index: number, value: string) => {
    const draft = drafts[id];
    const features = [...(draft.features || [])];
    features[index] = value;
    updateDraft(id, { features });
  };

  const removeFeature = (id: string, index: number) => {
    const draft = drafts[id];
    const features = (draft.features || []).filter((_, i) => i !== index);
    updateDraft(id, { features });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="ml-2 text-sm text-gray-500">Loading plans…</span>
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
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Plans</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Edit pricing and features. Changes go live immediately (cache invalidated on save).
          </p>
        </div>
        <button
          onClick={load}
          className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Reload
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

      <div className="space-y-4">
        {plans.map((plan) => {
          const draft = drafts[plan._id];
          if (!draft) return null;
          return (
            <div key={plan._id} className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 uppercase">{plan.key}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 uppercase">{plan.billingCycle}</span>
                  {plan.displayOnLanding && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 uppercase">landing</span>
                  )}
                </div>
                <button
                  onClick={() => save(plan._id)}
                  disabled={savingId === plan._id}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingId === plan._id
                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => updateDraft(plan._id, { name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Price ({plan.billingCycle}) — {fmtMoney(currentPrice(draft))}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={(draft as any)[PRICE_FIELD_FOR_CYCLE[plan.billingCycle]] ?? 0}
                    onChange={(e) => updatePrice(plan._id, plan.billingCycle, e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] font-mono"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={draft.description || ''}
                    onChange={(e) => updateDraft(plan._id, { description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Job credits (-1 = unlimited)</label>
                  <input
                    type="number"
                    value={draft.credits?.jobCredits ?? 0}
                    onChange={(e) => updateDraft(plan._id, { credits: { ...(draft.credits || { resetSchedule: 'monthly' }), jobCredits: Number(e.target.value) } })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={draft.status}
                    onChange={(e) => updateDraft(plan._id, { status: e.target.value as Plan['status'] })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Features</label>
                  <button
                    onClick={() => addFeature(plan._id)}
                    className="text-xs text-emerald-600 flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Add feature
                  </button>
                </div>
                <div className="space-y-1.5">
                  {(draft.features || []).map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={feature}
                        onChange={(e) => setFeature(plan._id, i, e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
                      />
                      <button
                        onClick={() => removeFeature(plan._id, i)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  {(draft.features || []).length === 0 && (
                    <p className="text-xs text-gray-400">No features. Public page falls back to legacy defaults.</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-4 text-xs">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.isPopular}
                    onChange={(e) => updateDraft(plan._id, { isPopular: e.target.checked })}
                    className="rounded"
                  />
                  Popular badge
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={draft.displayOnLanding}
                    onChange={(e) => updateDraft(plan._id, { displayOnLanding: e.target.checked })}
                    className="rounded"
                  />
                  Show on landing
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
