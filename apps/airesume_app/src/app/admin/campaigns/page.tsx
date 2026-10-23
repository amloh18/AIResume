'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  Send,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  X,
} from 'lucide-react';

interface Campaign {
  _id: string;
  campaignName: string;
  subject: string;
  status: string;
  targetedUserCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  scheduledAt?: string;
  sentAt?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300',
  scheduled: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
  sending: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
  sent: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  recurring: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
};

const fmtInt = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

export default function AdminCampaignsPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Composer state
  const [showComposer, setShowComposer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [composer, setComposer] = useState({
    campaignName: '',
    subject: '',
    htmlContent: '',
    fromName: 'AIResume',
    fromEmail: '',
    replyTo: '',
    plans: [] as string[],
  });
  const [preview, setPreview] = useState<{ count: number; sample: Array<{ email: string; plan: string }> } | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20', status: statusFilter });
      const res = await fetch(`/api/admin/campaigns?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      setItems(body.items || []);
      setTotal(body.total || 0);
      setPages(body.pages || 1);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const targetFilters = () => ({
    ...(composer.plans.length > 0 ? { membershipPlans: composer.plans } : {}),
  });

  const runPreview = async () => {
    try {
      setPreviewing(true);
      setFeedback(null);
      const res = await fetch('/api/admin/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFilters: targetFilters() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Preview failed');
      setPreview(body);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Preview failed' });
    } finally {
      setPreviewing(false);
    }
  };

  const createCampaign = async () => {
    if (!composer.campaignName || !composer.subject || !composer.htmlContent) {
      setFeedback({ type: 'error', message: 'Name, subject and HTML content are required.' });
      return;
    }
    try {
      setSaving(true);
      setFeedback(null);
      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: composer.campaignName,
          subject: composer.subject,
          htmlContent: composer.htmlContent,
          fromName: composer.fromName || undefined,
          fromEmail: composer.fromEmail || undefined,
          replyTo: composer.replyTo || undefined,
          targetFilters: targetFilters(),
          status: 'draft',
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Create failed');
      setFeedback({ type: 'success', message: 'Campaign created as draft.' });
      setShowComposer(false);
      setComposer({ campaignName: '', subject: '', htmlContent: '', fromName: 'AIResume', fromEmail: '', replyTo: '', plans: [] });
      setPreview(null);
      await load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Create failed' });
    } finally {
      setSaving(false);
    }
  };

  const sendCampaign = async (id: string, dryRun: boolean) => {
    if (!dryRun && !window.confirm('Send this campaign to all targeted users now? This cannot be undone.')) return;
    try {
      setSendingId(id);
      setFeedback(null);
      const res = await fetch('/api/admin/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: id, dryRun }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Send failed');
      if (dryRun) {
        setFeedback({ type: 'success', message: `Dry run: would send to ${fmtInt(body.totalSent || 0)} recipients.` });
      } else {
        setFeedback({ type: 'success', message: `Sent to ${fmtInt(body.totalSent || 0)} recipients (${fmtInt(body.totalFailed || 0)} failed).` });
        await load();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Send failed' });
    } finally {
      setSendingId(null);
    }
  };

  const deleteCampaign = async (id: string) => {
    if (!window.confirm('Delete this campaign? Sent campaigns cannot be deleted.')) return;
    try {
      setFeedback(null);
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Delete failed');
      setFeedback({ type: 'success', message: 'Campaign deleted.' });
      await load();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    }
  };

  const togglePlan = (plan: string) => {
    setComposer((c) => ({
      ...c,
      plans: c.plans.includes(plan) ? c.plans.filter((p) => p !== plan) : [...c.plans, plan],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Compose, target, and send campaigns. Sending reuses the same service as the scheduled cron.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button
            onClick={() => setShowComposer(true)}
            className="px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> New campaign
          </button>
        </div>
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

      {/* Composer */}
      {showComposer && (
        <div className="bg-white dark:bg-[#141810] border border-emerald-500/40 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">New campaign</h3>
            <button onClick={() => setShowComposer(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Internal name</label>
              <input
                value={composer.campaignName}
                onChange={(e) => setComposer({ ...composer, campaignName: e.target.value })}
                placeholder="e.g. October newsletter"
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Subject line</label>
              <input
                value={composer.subject}
                onChange={(e) => setComposer({ ...composer, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">From name</label>
              <input
                value={composer.fromName}
                onChange={(e) => setComposer({ ...composer, fromName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
              />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">From email</label>
              <input
                value={composer.fromEmail}
                onChange={(e) => setComposer({ ...composer, fromEmail: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">HTML content</label>
            <textarea
              value={composer.htmlContent}
              onChange={(e) => setComposer({ ...composer, htmlContent: e.target.value })}
              rows={8}
              placeholder="<p>Hello…</p>"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Target plans {composer.plans.length === 0 && <span className="font-normal text-gray-400">(none selected = all users)</span>}
            </label>
            <div className="flex flex-wrap gap-2">
              {['free', 'starter_monthly', 'starter_yearly', 'focused_monthly', 'focused_yearly'].map((plan) => (
                <button
                  key={plan}
                  onClick={() => togglePlan(plan)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                    composer.plans.includes(plan)
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-300 dark:border-white/10 text-gray-500'
                  }`}
                >
                  {plan}
                </button>
              ))}
            </div>
          </div>

          {preview && (
            <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl text-xs">
              <div className="font-semibold mb-1">Projected recipients: {fmtInt(preview.count)}</div>
              {preview.sample.length > 0 && (
                <div className="text-gray-500">
                  e.g. {preview.sample.map((s) => s.email).join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={runPreview}
              disabled={previewing}
              className="px-4 py-2 text-xs font-medium border border-gray-300 dark:border-white/10 rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            >
              {previewing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              Preview recipients
            </button>
            <button
              onClick={createCampaign}
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Save as draft
            </button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="sending">Sending</option>
          <option value="sent">Sent</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <span className="text-xs text-gray-400">{fmtInt(total)} campaigns</span>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* List */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 text-left">
                <th className="py-3 px-4 font-semibold">Campaign</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Sent</th>
                <th className="py-3 px-4 font-semibold text-right">Opened</th>
                <th className="py-3 px-4 font-semibold text-right">Clicked</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {items.length === 0 && !loading && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">No campaigns yet. Create one.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c._id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div className="font-medium">{c.campaignName}</div>
                    <div className="text-gray-400 truncate max-w-xs">{c.subject}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[c.status] || 'bg-gray-100'}`}>
                      {c.status}
                    </span>
                    {c.scheduledAt && c.status === 'scheduled' && (
                      <div className="text-[10px] text-gray-400 mt-1">
                        {new Date(c.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{fmtInt(c.sentCount)}</td>
                  <td className="py-3 px-4 text-right font-mono">{fmtInt(c.openedCount)}</td>
                  <td className="py-3 px-4 text-right font-mono">{fmtInt(c.clickedCount)}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(c.status === 'draft' || c.status === 'scheduled') && (
                        <>
                          <button
                            onClick={() => sendCampaign(c._id, true)}
                            disabled={sendingId === c._id}
                            title="Dry run"
                            className="px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> Test
                          </button>
                          <button
                            onClick={() => sendCampaign(c._id, false)}
                            disabled={sendingId === c._id}
                            title="Send now"
                            className="px-2 py-1 text-[11px] rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 disabled:opacity-50"
                          >
                            {sendingId === c._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                            Send
                          </button>
                        </>
                      )}
                      {(c.status === 'draft' || c.status === 'scheduled' || c.status === 'cancelled') && (
                        <button
                          onClick={() => deleteCampaign(c._id)}
                          title="Delete"
                          className="px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-white/10 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-gray-500">Page {page} of {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
