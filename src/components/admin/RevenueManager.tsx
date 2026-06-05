'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  DollarSign,
  TrendingUp,
  Globe,
  Mail,
  Users,
  MapPin,
  Calendar,
  Download,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, convertToINR } from '@/lib/utils/currencyConverter';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { motion } from 'framer-motion';

interface RevenueData {
  period: string;
  startDate: string;
  endDate: string;
  revenueByCurrency: Record<string, { amount: number; count: number }>;
  totalInINR: number;
  userPurchases: Array<{
    userId: string;
    userEmail: string;
    userName: string;
    planName: string;
    planKey: string;
    amount: number;
    currency: string;
    amountInINR: number;
    purchaseDate: string;
    paymentMethod: string;
    location: string;
    invoiceUrl?: string;
  }>;
  totalPurchases: number;
}

export default function RevenueManager() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);

  useEffect(() => {
    fetchRevenueData();
  }, [period]);

  const fetchRevenueData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/revenue?period=${period}`);
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setRevenueData(data);
        }
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (userId: string, invoiceUrl?: string) => {
    if (invoiceUrl) {
      window.open(invoiceUrl, '_blank');
    } else {
      try {
        const response = await fetch(`/api/admin/invoices/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (response.ok) {
          alert('Invoice sent successfully!');
        } else {
          alert('Failed to send invoice');
        }
      } catch (error) {
        console.error('Error sending invoice:', error);
        alert('Failed to send invoice');
      }
    }
  };

  const handleExportCSV = () => {
    if (!revenueData) return;

    const csvRows = [
      ['User Email', 'User Name', 'Plan Name', 'Amount', 'Currency', 'Amount (INR)', 'Location', 'Purchase Date', 'Payment Method'],
      ...revenueData.userPurchases.map(p => [
        p.userEmail,
        p.userName,
        p.planName,
        p.amount.toString(),
        p.currency,
        p.amountInINR.toFixed(2),
        p.location,
        new Date(p.purchaseDate).toLocaleDateString(),
        p.paymentMethod
      ])
    ];

    const csvContent = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !revenueData) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-white/20 font-black uppercase tracking-widest text-xs italic">No data available for this period</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            Revenue <span className="text-emerald-500">Summary</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Financial Overview • v2.6.0
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/60 focus:outline-none hover:bg-white/10 transition-all w-48 h-12">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-white/10 text-white rounded-xl">
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleExportCSV}
            className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <Download className="h-4 w-4" />
            Download Report
          </button>

          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#635BFF] hover:bg-[#5851E2] text-white rounded-2xl flex items-center gap-2 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <CreditCard className="h-4 w-4" />
            Stripe
          </a>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-[#111111] border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Earned (INR)</p>
                <p className="text-4xl font-black text-white mt-4 tracking-tighter">
                  ₹{revenueData.totalInINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500">
                <DollarSign className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Total Orders</p>
                <p className="text-4xl font-black text-white mt-4 tracking-tighter">
                  {revenueData.totalPurchases}
                </p>
              </div>
              <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500">
                <Users className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-[#111111] border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
          <CardContent className="p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Avg. Order Value</p>
                <p className="text-4xl font-black text-white mt-4 tracking-tighter">
                  ₹{revenueData.totalPurchases > 0
                    ? (revenueData.totalInINR / revenueData.totalPurchases).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : '0.00'}
                </p>
              </div>
              <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500">
                <TrendingUp className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales by Currency */}
      {Object.keys(revenueData.revenueByCurrency).length > 0 && (
        <Card className="bg-[#111111] border-white/10 rounded-[2.5rem] shadow-2xl">
          <CardContent className="p-8">
            <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Sales by Currency</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(revenueData.revenueByCurrency).map(([currency, data]) => (
                <div key={currency} className="p-6 bg-white/[0.02] border border-white/5 rounded-[1.5rem] group hover:bg-white/[0.05] transition-all">
                  <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">{currency}</p>
                  <p className="text-2xl font-black text-white mt-2">
                    {formatCurrency(data.amount, currency)}
                  </p>
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-[10px] font-bold text-white/40 uppercase">{data.count} {data.count === 1 ? 'sale' : 'sales'}</p>
                    <p className="text-[10px] font-black text-emerald-500">₹{convertToINR(data.amount, currency).toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Purchases Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8 border-b border-white/5 bg-white/2">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Recent Sales</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Country</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {revenueData.userPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest text-xs italic">
                    No sales recorded for this period
                  </td>
                </tr>
              ) : (
                revenueData.userPurchases.map((purchase, index) => (
                  <tr key={index} className="group hover:bg-white/[0.03] transition-colors cursor-default">
                    <td className="px-8 py-6">
                      <div>
                        <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{purchase.userName}</div>
                        <div className="text-xs text-white/30 font-medium">{purchase.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest text-white/60">
                        {purchase.planName}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-white">
                        {formatCurrency(purchase.amount, purchase.currency)}
                      </div>
                      <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
                        ₹{purchase.amountInINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-white/40">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">{purchase.location}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-black text-white/30">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <button
                        onClick={() => handleSendInvoice(purchase.userId, purchase.invoiceUrl)}
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
                        title="Send Receipt"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Map Area */}
      <Card className="bg-[#111111] border-white/10 rounded-[2.5rem] shadow-2xl">
        <CardContent className="p-8">
          <h3 className="text-lg font-black text-white uppercase tracking-tight mb-8">Sales by Region</h3>
          <div className="rounded-[1.5rem] bg-white/[0.02] border border-white/5 p-20 text-center flex flex-col items-center">
            <Globe className="h-16 w-16 text-white/10 mb-6" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">
              Map view coming soon.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
