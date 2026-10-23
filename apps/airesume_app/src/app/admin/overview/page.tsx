'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign,
  Users,
  FileText,
  Cpu,
  Mail,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface OverviewData {
  revenue: {
    totalRevenue: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    mrr: number;
    arr: number;
    paidInvoiceCount: number;
    refundedAmount: number;
    averageOrderValue: number;
    monthly: Array<{ month: string; revenue: number; invoices: number }>;
    byPlan: Array<{ plan: string; revenue: number; count: number }>;
  };
  users: {
    totalUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    newUsersThisMonth: number;
    verifiedUsers: number;
    activeSubscriptions: number;
    planDistribution: Array<{ plan: string; count: number }>;
  };
  usage: {
    cvsCreated: number;
    coverLettersCreated: number;
    journeysCreated: number;
    jobsTracked: number;
    applications: number;
    cvsLast30Days: number;
    journeysLast30Days: number;
    applicationsLast30Days: number;
  };
  ai: {
    totalCalls: number;
    failedCalls: number;
    totalTokens: number;
    totalCost: number;
    callsLast30Days: number;
    costLast30Days: number;
    byModel: Array<{ model: string; calls: number; tokens: number; cost: number }>;
  };
  email: {
    campaignsTotal: number;
    campaignsSent: number;
    emailsSentTotal: number;
    emailsSentLast30Days: number;
    newsletterSubscribers: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    name: string;
    plan: string;
    verified: boolean;
    createdAt: string;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    planName: string;
    paidAt: string;
    status: string;
  }>;
  generatedAt: string;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtInt = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent || 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-extrabold tracking-tight">{value}</div>
      {sub && <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/admin/analytics', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setData(await res.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
        <span className="ml-2 text-sm text-gray-500">Loading analytics…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-16 p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-2xl text-center">
        <p className="text-sm text-red-700 dark:text-red-300 mb-4">{error}</p>
        <button onClick={load} className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-lg">
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { revenue, users, usage, ai, email, recentUsers, recentInvoices } = data;
  const momDelta = revenue.revenueLastMonth > 0
    ? ((revenue.revenueThisMonth - revenue.revenueLastMonth) / revenue.revenueLastMonth) * 100
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Platform health across revenue, users, product usage and AI spend.
          </p>
        </div>
        <button
          onClick={load}
          className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* KPI row 1 — revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={DollarSign} label="Revenue (all time)" value={fmtMoney(revenue.totalRevenue)} sub={`${fmtInt(revenue.paidInvoiceCount)} paid invoices`} />
        <KpiCard
          icon={TrendingUp}
          label="This month"
          value={fmtMoney(revenue.revenueThisMonth)}
          sub={momDelta === null ? `Last month ${fmtMoney(revenue.revenueLastMonth)}` : `${momDelta >= 0 ? '+' : ''}${momDelta.toFixed(1)}% vs last month`}
        />
        <KpiCard icon={DollarSign} label="MRR" value={fmtMoney(revenue.mrr)} sub={`ARR ${fmtMoney(revenue.arr)}`} accent="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600" />
        <KpiCard icon={DollarSign} label="Avg order value" value={fmtMoney(revenue.averageOrderValue)} sub={`Refunds ${fmtMoney(revenue.refundedAmount)}`} accent="bg-amber-50 dark:bg-amber-950/40 text-amber-600" />
      </div>

      {/* KPI row 2 — users / usage / AI / email */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Total users" value={fmtInt(users.totalUsers)} sub={`+${fmtInt(users.newUsersThisMonth)} last 30d · ${fmtInt(users.activeSubscriptions)} active subs`} accent="bg-blue-50 dark:bg-blue-950/40 text-blue-600" />
        <KpiCard icon={FileText} label="CVs created" value={fmtInt(usage.cvsCreated)} sub={`${fmtInt(usage.cvsLast30Days)} last 30d`} accent="bg-purple-50 dark:bg-purple-950/40 text-purple-600" />
        <KpiCard icon={Cpu} label="AI calls" value={fmtInt(ai.totalCalls)} sub={`${fmtMoney(ai.totalCost)} total · ${fmtInt(ai.failedCalls)} failed`} accent="bg-rose-50 dark:bg-rose-950/40 text-rose-600" />
        <KpiCard icon={Mail} label="Emails sent" value={fmtInt(email.emailsSentTotal)} sub={`${fmtInt(email.campaignsSent)} campaigns · ${fmtInt(email.newsletterSubscribers)} subscribers`} accent="bg-orange-50 dark:bg-orange-950/40 text-orange-600" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Revenue — last 12 months</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={revenue.monthly}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), 'Revenue']} />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#rev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Users by plan</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={users.planDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
              <XAxis dataKey="plan" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(v: any) => [fmtInt(Number(v)), 'Users']} />
              <Bar dataKey="count" fill="#10b981" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI by model + revenue by plan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">AI usage by model</h3>
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
                {ai.byModel.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-gray-400">No AI usage recorded yet.</td></tr>
                )}
                {ai.byModel.map((m) => (
                  <tr key={m.model} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
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

        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Revenue by plan</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 text-left">
                  <th className="py-2 font-semibold">Plan</th>
                  <th className="py-2 font-semibold text-right">Invoices</th>
                  <th className="py-2 font-semibold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {revenue.byPlan.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-gray-400">No paid invoices yet.</td></tr>
                )}
                {revenue.byPlan.map((p) => (
                  <tr key={p.plan} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                    <td className="py-2 font-medium">{p.plan}</td>
                    <td className="py-2 text-right">{fmtInt(p.count)}</td>
                    <td className="py-2 text-right">{fmtMoney(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Recent signups</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {recentUsers.length === 0 && (
                  <tr><td className="py-4 text-center text-gray-400">No users yet.</td></tr>
                )}
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2">
                      <div className="font-medium">{u.name}</div>
                      <div className="text-gray-400">{u.email}</div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 font-mono uppercase text-[10px]">{u.plan}</span>
                    </td>
                    <td className="py-2 text-right text-gray-400 whitespace-nowrap">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <h3 className="text-sm font-bold mb-4">Recent payments</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {recentInvoices.length === 0 && (
                  <tr><td className="py-4 text-center text-gray-400">No payments yet.</td></tr>
                )}
                {recentInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2">
                      <div className="font-medium">{inv.planName || '—'}</div>
                      <div className="text-gray-400 font-mono">{inv.invoiceNumber}</div>
                    </td>
                    <td className="py-2 text-right font-semibold">
                      {fmtMoney(inv.amount)} <span className="text-gray-400 font-normal">{inv.currency}</span>
                    </td>
                    <td className="py-2 text-right text-gray-400 whitespace-nowrap">
                      {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
