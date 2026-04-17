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
      } else {
        console.error('Failed to fetch revenue data');
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (userId: string, invoiceUrl?: string) => {
    if (invoiceUrl) {
      // Open existing invoice
      window.open(invoiceUrl, '_blank');
    } else {
      // Generate and send invoice
      try {
        const response = await fetch(`/api/admin/invoices/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            alert('Invoice sent successfully!');
          } else {
            alert('Invoice sent, but received invalid response');
          }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-400">Loading revenue data...</div>
      </div>
    );
  }

  if (!revenueData) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-400">No revenue data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>Revenue Analytics</h2>
          <p className={`${ADMIN_THEME.text.muted} mt-1`}>Track revenue across different time periods</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${ADMIN_THEME.button.outline}`}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#635BFF] hover:bg-[#5851E2] text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
            title="Open Stripe Dashboard"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden tablet:inline">Stripe</span>
          </a>

          <a
            href="https://dashboard.razorpay.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#3395FF] hover:bg-[#2E86E5] text-white rounded-lg flex items-center gap-2 transition-colors font-medium"
            title="Open Razorpay Dashboard"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden tablet:inline">Razorpay</span>
          </a>

          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className={`w-48 ${ADMIN_THEME.input.base}`}>
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6">
        <Card className={ADMIN_THEME.card.base}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${ADMIN_THEME.text.muted}`}>Total Revenue (INR)</p>
                <p className={`text-3xl font-bold mt-2 ${ADMIN_THEME.text.primary}`}>
                  ₹{revenueData.totalInINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="h-12 w-12 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_THEME.card.base}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${ADMIN_THEME.text.muted}`}>Total Purchases</p>
                <p className={`text-3xl font-bold mt-2 ${ADMIN_THEME.text.primary}`}>
                  {revenueData.totalPurchases}
                </p>
              </div>
              <Users className="h-12 w-12 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_THEME.card.base}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${ADMIN_THEME.text.muted}`}>Average Order Value</p>
                <p className={`text-3xl font-bold mt-2 ${ADMIN_THEME.text.primary}`}>
                  ₹{revenueData.totalPurchases > 0
                    ? (revenueData.totalInINR / revenueData.totalPurchases).toLocaleString('en-IN', { maximumFractionDigits: 2 })
                    : '0.00'}
                </p>
              </div>
              <TrendingUp className="h-12 w-12 text-emerald-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Currency */}
      {
        Object.keys(revenueData.revenueByCurrency).length > 0 && (
          <Card className={ADMIN_THEME.card.base}>
            <CardContent className="p-6">
              <h3 className={`text-xl font-bold mb-4 ${ADMIN_THEME.text.primary}`}>Revenue by Currency</h3>
              <div className="grid grid-cols-2 tablet:grid-cols-4 gap-4">
                {Object.entries(revenueData.revenueByCurrency).map(([currency, data]) => (
                  <div key={currency} className={`p-4 rounded-xl border ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                    <p className={`text-sm ${ADMIN_THEME.text.secondary}`}>{currency}</p>
                    <p className={`text-2xl font-bold mt-1 ${ADMIN_THEME.text.primary}`}>
                      {formatCurrency(data.amount, currency)}
                    </p>
                    <p className={`text-xs mt-1 ${ADMIN_THEME.text.tertiary}`}>
                      {data.count} {data.count === 1 ? 'purchase' : 'purchases'}
                    </p>
                    <p className={`text-xs mt-1 ${ADMIN_THEME.text.muted}`}>
                      ₹{convertToINR(data.amount, currency).toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      }

      {/* User Purchases Table */}
      <Card className={ADMIN_THEME.card.base}>
        <CardContent className="p-0">
          <div className={`p-6 border-b ${ADMIN_THEME.border.primary}`}>
            <h3 className={`text-xl font-bold ${ADMIN_THEME.text.primary}`}>User Purchases</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${ADMIN_THEME.border.primary} ${ADMIN_THEME.table.header}`}>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>User</th>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>Plan</th>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>Amount</th>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>Location</th>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>Date</th>
                  <th className={`text-left p-4 text-sm font-semibold ${ADMIN_THEME.text.secondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.userPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={6} className={`p-8 text-center ${ADMIN_THEME.text.muted}`}>
                      No purchases found for this period
                    </td>
                  </tr>
                ) : (
                  revenueData.userPurchases.map((purchase, index) => (
                    <tr
                      key={index}
                      className={`border-b ${ADMIN_THEME.border.primary} ${ADMIN_THEME.table.row} transition-colors`}
                    >
                      <td className="p-4">
                        <div>
                          <div className={`font-medium ${ADMIN_THEME.text.primary}`}>{purchase.userName}</div>
                          <div className={`text-xs ${ADMIN_THEME.text.muted}`}>{purchase.userEmail}</div>
                        </div>
                      </td>
                      <td className={`p-4 ${ADMIN_THEME.text.secondary}`}>{purchase.planName}</td>
                      <td className="p-4">
                        <div>
                          <div className={`font-medium ${ADMIN_THEME.text.primary}`}>
                            {formatCurrency(purchase.amount, purchase.currency)}
                          </div>
                          <div className={`text-xs ${ADMIN_THEME.text.muted}`}>
                            ₹{purchase.amountInINR.toLocaleString('en-IN', { maximumFractionDigits: 2 })} INR
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className={`flex items-center gap-1 ${ADMIN_THEME.text.secondary}`}>
                          <MapPin className="w-4 h-4" />
                          {purchase.location}
                        </div>
                      </td>
                      <td className={`p-4 ${ADMIN_THEME.text.secondary}`}>
                        {new Date(purchase.purchaseDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleSendInvoice(purchase.userId, purchase.invoiceUrl)}
                          className={`p-2 rounded-lg transition-colors ${ADMIN_THEME.button.ghost}`}
                          title="Send Invoice"
                        >
                          <Mail className="w-4 h-4 text-emerald-600" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Globe-based Revenue Map (Future Enhancement) */}
      <Card className={ADMIN_THEME.card.base}>
        <CardContent className="p-6">
          <h3 className={`text-xl font-bold mb-4 ${ADMIN_THEME.text.primary}`}>Revenue by Location</h3>
          <div className={`rounded-lg p-8 text-center ${ADMIN_THEME.background.tertiary}`}>
            <Globe className={`h-16 w-16 mx-auto mb-4 ${ADMIN_THEME.text.muted}`} />
            <p className={ADMIN_THEME.text.muted}>
              Interactive map visualization coming soon.
              Ensure user location tracking is enabled.
            </p>
          </div>
        </CardContent>
      </Card>
    </div >
  );
}
