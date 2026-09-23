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
  CreditCard,
  CheckCircle
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, convertToINR } from '@/lib/utils/currencyConverter';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [sentInvoices, setSentInvoices] = useState<Record<string, boolean>>({});

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
      setSentInvoices(prev => ({ ...prev, [userId]: true }));
    } else {
      try {
        const response = await fetch(`/api/admin/invoices/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (response.ok) {
          setSentInvoices(prev => ({ ...prev, [userId]: true }));
          toast({ title: "Success", description: "Invoice generated & sent successfully!", variant: "success" });
        } else {
          toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" });
        }
      } catch (error) {
        console.error('Error sending invoice:', error);
        toast({ title: "Error", description: "Failed to send invoice", variant: "destructive" });
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Revenue Summary
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Financial Overview & Monetization Telemetry
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white/70 hover:bg-white/10 transition-all w-36 h-9">
              <Calendar className="h-3.5 w-3.5 mr-1.5 text-white/40" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#111216] border-white/10 text-white rounded-xl text-xs">
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-white/70 hover:text-white flex items-center gap-1.5 text-xs font-semibold h-9"
          >
            <Download className="h-3.5 w-3.5" />
            Report
          </button>

          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 bg-[#635BFF] hover:bg-[#5851E2] text-white rounded-xl flex items-center gap-1.5 transition-all text-xs font-semibold h-9 shadow-sm"
          >
            <CreditCard className="h-3.5 w-3.5" />
            Stripe
          </a>
        </div>
      </div>

      {/* Stats Bento */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Total Earned (INR)</p>
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              ₹{revenueData.totalInINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
          </div>
          <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Total Orders</p>
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              {revenueData.totalPurchases}
            </p>
          </div>
          <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
            <Users className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Avg. Order Value</p>
            <p className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
              ₹{revenueData.totalPurchases > 0
                ? (revenueData.totalInINR / revenueData.totalPurchases).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                : '0.00'}
            </p>
          </div>
          <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Sales by Currency */}
      {Object.keys(revenueData.revenueByCurrency).length > 0 && (
        <div className="bg-[#111216] border border-white/5 rounded-2xl p-4 sm:p-5 shadow-xl">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Sales by Currency</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(revenueData.revenueByCurrency).map(([currency, data]) => (
              <div key={currency} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl group hover:border-white/10 transition-all">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{currency}</p>
                <p className="text-base font-bold text-white mt-1">
                  {formatCurrency(data.amount, currency)}
                </p>
                <div className="flex justify-between items-center mt-2 text-xs">
                  <span className="text-[10px] text-white/40">{data.count} {data.count === 1 ? 'sale' : 'sales'}</span>
                  <span className="text-[10px] font-semibold text-emerald-400">₹{convertToINR(data.amount, currency).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Purchases Table */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02]">
          <h3 className="text-xs font-semibold text-white">Recent Sales</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">User</th>
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Plan</th>
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Country</th>
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider">Date</th>
                <th className="px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {revenueData.userPurchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-white/30 text-xs">
                    No sales recorded for this period
                  </td>
                </tr>
              ) : (
                revenueData.userPurchases.map((purchase, index) => (
                  <tr key={index} className="group hover:bg-white/[0.02] transition-colors cursor-default">
                    <td className="px-5 py-3">
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-emerald-400 transition-colors">{purchase.userName}</div>
                        <div className="text-[10px] text-white/40">{purchase.userEmail}</div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-md text-[10px] font-medium text-white/70">
                        {purchase.planName}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-xs font-semibold text-white">
                        {formatCurrency(purchase.amount, purchase.currency)}
                      </div>
                      <div className="text-[10px] text-white/40">
                        ₹{purchase.amountInINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5 text-white/50 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{purchase.location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-white/40">
                      {new Date(purchase.purchaseDate).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleSendInvoice(purchase.userId, purchase.invoiceUrl)}
                        className={`p-1.5 rounded-lg transition-all border ${
                          sentInvoices[purchase.userId] 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 border-transparent hover:border-emerald-500/20'
                        }`}
                        title="Send Receipt"
                      >
                        {sentInvoices[purchase.userId] ? (
                          <CheckCircle className="w-3.5 h-3.5" />
                        ) : (
                          <Mail className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
