'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, DollarSign, Search } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RevenueData {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  revenueToday: number;
  mrr: number;
  arr: number;
  paidInvoiceCount: number;
  refundedAmount: number;
  averageOrderValue: number;
  monthly: Array<{ month: string; revenue: number; invoices: number }>;
  byPlan: Array<{ plan: string; revenue: number; count: number }>;
  byGateway: Array<{ gateway: string; revenue: number; count: number }>;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  planName: string;
  billingCycle: string;
  paymentMethodType: string;
  paidAt: string;
  createdAt: string;
}

interface InvoicesPage {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const fmtMoney = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);
const fmtInt = (n: number) => new Intl.NumberFormat('en-US').format(n || 0);

const STATUS_STYLES: Record<string, string> = {
  paid: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
  partially_refunded: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
  refunded: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  pending: 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300',
  failed: 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300',
  cancelled: 'bg-gray-100 dark:bg-white/10 text-gray-500',
};

export default function AdminRevenuePage() {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [invoices, setInvoices] = useState<InvoicesPage | null>(null);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(page), limit: '20', status });
      if (search) params.set('search', search);
      const res = await fetch(`/api/admin/revenue?${params}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      const body = await res.json();
      setRevenue(body.revenue);
      setInvoices(body.invoices);
    } catch (err: any) {
      setError(err.message || 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Revenue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Paid invoices, MRR, and gateway breakdown.
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

      {revenue && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Today</div>
              <div className="text-2xl font-extrabold">{fmtMoney(revenue.revenueToday)}</div>
            </div>
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">This month</div>
              <div className="text-2xl font-extrabold">{fmtMoney(revenue.revenueThisMonth)}</div>
              <div className="text-xs text-gray-400 mt-1">Last month {fmtMoney(revenue.revenueLastMonth)}</div>
            </div>
            <div className="bg-white dark:bg-[#141810] border border-emerald-500/40 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> MRR
              </div>
              <div className="text-2xl font-extrabold">{fmtMoney(revenue.mrr)}</div>
              <div className="text-xs text-gray-400 mt-1">ARR {fmtMoney(revenue.arr)}</div>
            </div>
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-5">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Refunds / chargebacks</div>
              <div className="text-2xl font-extrabold text-red-500">{fmtMoney(revenue.refundedAmount)}</div>
              <div className="text-xs text-gray-400 mt-1">{fmtInt(revenue.paidInvoiceCount)} paid invoices</div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
            <h3 className="text-sm font-bold mb-4">Revenue — last 12 months</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenue.monthly}>
                <defs>
                  <linearGradient id="rev2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,120,120,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v: any) => [fmtMoney(Number(v)), 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#rev2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4">By plan</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {revenue.byPlan.map((p) => (
                    <tr key={p.plan}>
                      <td className="py-2 font-medium">{p.plan}</td>
                      <td className="py-2 text-right text-gray-400">{fmtInt(p.count)}</td>
                      <td className="py-2 text-right font-semibold">{fmtMoney(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-bold mb-4">By gateway (last 12 months)</h3>
              <table className="w-full text-xs">
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {revenue.byGateway.map((g) => (
                    <tr key={g.gateway}>
                      <td className="py-2 font-medium capitalize">{g.gateway}</td>
                      <td className="py-2 text-right text-gray-400">{fmtInt(g.count)}</td>
                      <td className="py-2 text-right font-semibold">{fmtMoney(g.revenue)}</td>
                    </tr>
                  ))}
                  {revenue.byGateway.length === 0 && (
                    <tr><td className="py-4 text-center text-gray-400">No gateway transactions in the window.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Invoices table */}
      <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-sm font-bold">Invoices {invoices ? `(${fmtInt(invoices.total)})` : ''}</h3>
          <div className="flex items-center gap-2">
            <form onSubmit={onSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search number or plan…"
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] w-48"
              />
            </form>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b]"
            >
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="partially_refunded">Partially refunded</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500 text-left">
                <th className="py-2 font-semibold">Invoice</th>
                <th className="py-2 font-semibold">Plan</th>
                <th className="py-2 font-semibold">Method</th>
                <th className="py-2 font-semibold text-right">Amount</th>
                <th className="py-2 font-semibold">Status</th>
                <th className="py-2 font-semibold text-right">Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {invoices?.items.length === 0 && (
                <tr><td colSpan={6} className="py-6 text-center text-gray-400">No invoices match.</td></tr>
              )}
              {invoices?.items.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                  <td className="py-2 font-mono">{inv.invoiceNumber}</td>
                  <td className="py-2">{inv.planName || '—'}</td>
                  <td className="py-2 capitalize text-gray-400">{inv.paymentMethodType || '—'}</td>
                  <td className="py-2 text-right font-semibold">
                    {fmtMoney(inv.amount)} <span className="text-gray-400 font-normal">{inv.currency}</span>
                  </td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLES[inv.status] || 'bg-gray-100 dark:bg-white/10'}`}>
                      {inv.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-2 text-right text-gray-400 whitespace-nowrap">
                    {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {invoices && invoices.pages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">Page {invoices.page} of {invoices.pages}</span>
            <button
              disabled={page >= invoices.pages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
