'use client';

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Shield, 
  TrendingUp, 
  DollarSign,
  Users,
  Globe
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface PaymentStats {
  stripe: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    currencyBreakdown: { [key: string]: number };
  };
  razorpay: {
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    currencyBreakdown: { [key: string]: number };
  };
  total: {
    revenue: number;
    transactions: number;
    averageOrderValue: number;
  };
}

interface PaymentPartnerStatsProps {
  selectedCurrency?: string;
}

const PaymentPartnerStats: React.FC<PaymentPartnerStatsProps> = ({ selectedCurrency = 'EUR' }) => {
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    fetchPaymentStats();
  }, [timeRange, selectedCurrency]);

  const fetchPaymentStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/payment-stats?range=${timeRange}&currency=${selectedCurrency}`);
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setStats(data);
        } else {
          // Use mock data if response is not JSON
          setStats(generateMockStats());
        }
      } else {
        // Use mock data for demonstration
        setStats(generateMockStats());
      }
    } catch (error) {
      console.error('Error fetching payment stats:', error);
      setStats(generateMockStats());
    } finally {
      setLoading(false);
    }
  };

  const generateMockStats = (): PaymentStats => {
    const baseRevenue = timeRange === '7d' ? 5000 : timeRange === '30d' ? 25000 : timeRange === '90d' ? 75000 : 300000;
    const baseTransactions = timeRange === '7d' ? 50 : timeRange === '30d' ? 250 : timeRange === '90d' ? 750 : 3000;
    
    return {
      stripe: {
        totalRevenue: baseRevenue * 0.75,
        totalTransactions: baseTransactions * 0.8,
        averageOrderValue: baseRevenue * 0.75 / (baseTransactions * 0.8),
        currencyBreakdown: {
          'EUR': baseRevenue * 0.4,
          'USD': baseRevenue * 0.25,
          'GBP': baseRevenue * 0.1
        }
      },
      razorpay: {
        totalRevenue: baseRevenue * 0.25,
        totalTransactions: baseTransactions * 0.2,
        averageOrderValue: baseRevenue * 0.25 / (baseTransactions * 0.2),
        currencyBreakdown: {
          'INR': baseRevenue * 0.25
        }
      },
      total: {
        revenue: baseRevenue,
        transactions: baseTransactions,
        averageOrderValue: baseRevenue / baseTransactions
      }
    };
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'INR': '₹'
    };
    
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'INR': '₹'
    };
    return symbols[currency] || currency;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-400"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No payment statistics available</p>
      </div>
    );
  }

  const pieChartData = [
    {
      name: 'Stripe',
      value: stats.stripe.totalRevenue,
      color: '#3B82F6',
      transactions: stats.stripe.totalTransactions
    },
    {
      name: 'Razorpay',
      value: stats.razorpay.totalRevenue,
      color: '#8B5CF6',
      transactions: stats.razorpay.totalTransactions
    }
  ];

  const currencyBreakdownData = [
    ...Object.entries(stats.stripe.currencyBreakdown).map(([currency, amount]) => ({
      currency,
      amount,
      partner: 'Stripe',
      color: '#3B82F6'
    })),
    ...Object.entries(stats.razorpay.currencyBreakdown).map(([currency, amount]) => ({
      currency,
      amount,
      partner: 'Razorpay',
      color: '#8B5CF6'
    }))
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Partner Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400">Revenue and transaction statistics by payment provider</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.total.revenue, selectedCurrency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total.transactions.toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Stripe Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.stripe.totalRevenue, selectedCurrency)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Razorpay Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(stats.razorpay.totalRevenue, selectedCurrency)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <Shield className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="value"
                  label={({ name, value, transactions }) =>
                  `${name}: ${formatCurrency(Number(value), selectedCurrency)} (${transactions} txns)`
                }
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value, selectedCurrency), 'Revenue']}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Currency Breakdown Bar Chart */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue by Currency</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={currencyBreakdownData}>
              <XAxis 
                dataKey="currency" 
                stroke="#6B7280"
                fontSize={12}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => formatCurrency(value, selectedCurrency)}
              />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(value, selectedCurrency), 'Revenue']}
                contentStyle={{
                  backgroundColor: '#1F2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }}
              />
              <Bar dataKey="amount" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stripe Statistics */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Stripe Statistics</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.stripe.totalRevenue, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.stripe.totalTransactions.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Average Order:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.stripe.averageOrderValue, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Market Share:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {((stats.stripe.totalRevenue / stats.total.revenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Razorpay Statistics */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Razorpay Statistics</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Total Revenue:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.razorpay.totalRevenue, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Transactions:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.razorpay.totalTransactions.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Average Order:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatCurrency(stats.razorpay.averageOrderValue, selectedCurrency)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">Market Share:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {((stats.razorpay.totalRevenue / stats.total.revenue) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPartnerStats;
