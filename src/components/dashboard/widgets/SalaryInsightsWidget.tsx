'use client';

import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, MapPin, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SalaryInsightsWidgetProps {
  className?: string;
}

interface SalaryData {
  role: string;
  range: { min: number; max: number };
  median: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  location?: string;
  percentile?: number;
}

// Mock data
const mockSalary: SalaryData = {
  role: 'Frontend Developer',
  range: { min: 85000, max: 140000 },
  median: 112000,
  trend: 'up',
  trendPercent: 5.2,
  location: 'San Francisco, CA',
  percentile: 75,
};

import { useDashboardData } from '@/contexts/DashboardDataContext';
import { useUserData } from '@/lib/hooks/useUserData';

interface SalaryInsightsWidgetProps {
  className?: string;
}

interface SalaryData {
  role: string;
  range: { min: number; max: number };
  median: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  location?: string;
  percentile?: number;
}

const COUNTRY_CURRENCY_MAP: Record<string, { code: string; locale: string }> = {
  'IN': { code: 'INR', locale: 'en-IN' },
  'INDIA': { code: 'INR', locale: 'en-IN' },
  'GB': { code: 'GBP', locale: 'en-GB' },
  'UK': { code: 'GBP', locale: 'en-GB' },
  'UNITED KINGDOM': { code: 'GBP', locale: 'en-GB' },
  'US': { code: 'USD', locale: 'en-US' },
  'USA': { code: 'USD', locale: 'en-US' },
  'UNITED STATES': { code: 'USD', locale: 'en-US' },
  'CA': { code: 'CAD', locale: 'en-CA' },
  'CANADA': { code: 'CAD', locale: 'en-CA' },
  'AU': { code: 'AUD', locale: 'en-AU' },
  'AUSTRALIA': { code: 'AUD', locale: 'en-AU' },
  'DE': { code: 'EUR', locale: 'de-DE' },
  'GERMANY': { code: 'EUR', locale: 'de-DE' },
  'FR': { code: 'EUR', locale: 'fr-FR' },
  'FRANCE': { code: 'EUR', locale: 'fr-FR' },
  'AE': { code: 'AED', locale: 'ar-AE' },
  'UAE': { code: 'AED', locale: 'ar-AE' },
  'SG': { code: 'SGD', locale: 'en-SG' },
  'SINGAPORE': { code: 'SGD', locale: 'en-SG' },
};

export default function SalaryInsightsWidget({ className }: SalaryInsightsWidgetProps) {
  const { salaryInsights, secondaryLoading, jobs, cvs } = useDashboardData();
  const { userData } = useUserData();
  const isLoading = secondaryLoading.salaryInsights;

  // Extract region and currency from master CV or User Profile
  const userRegionData = React.useMemo(() => {
    const masterCV = cvs?.find((cv: any) => 
      cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.isMaster === 'true'
    );
    
    const basics = masterCV?.cvData?.basics;
    const cvLocation = basics?.location;
    const userLocation = userData?.location;
    const userRegion = userData?.region;
    
    const country = (cvLocation?.countryCode || cvLocation?.country || userRegion || '').toUpperCase();
    const city = cvLocation?.city || userLocation || 'Global';
    
    const mapped = COUNTRY_CURRENCY_MAP[country] || { code: 'USD', locale: 'en-US' };
    
    return { 
      region: city !== 'Global' ? city : (country || 'Global'), 
      currency: mapped.code,
      locale: mapped.locale 
    };
  }, [cvs, userData]);

  const data: SalaryData = React.useMemo(() => {
    const recentJob = jobs[0]?.jobTitle || jobs[0]?.title || userData?.jobTitle || 'Your Role';

    if (!salaryInsights) {
      // Mock localized defaults
      let median = 112000;
      let min = 85000;
      let max = 145000;

      if (userRegionData.currency === 'INR') {
        median = 2400000;
        min = 1200000;
        max = 4500000;
      } else if (userRegionData.currency === 'GBP') {
        median = 65000;
        min = 45000;
        max = 95000;
      } else if (userRegionData.currency === 'EUR') {
        median = 70000;
        min = 50000;
        max = 100000;
      }

      return {
        role: recentJob,
        range: { min, max },
        median,
        trend: 'up',
        trendPercent: 5.2,
        location: userRegionData.region,
        percentile: 75,
      };
    }

    // Adjust values if API returns different currency (simple mock conversion)
    let multiplier = 1;
    if (salaryInsights.currency !== userRegionData.currency) {
      if (userRegionData.currency === 'INR') multiplier = 80;
      else if (userRegionData.currency === 'GBP') multiplier = 0.8;
      else if (userRegionData.currency === 'EUR') multiplier = 0.9;
    }

    return {
      role: recentJob,
      range: { 
        min: salaryInsights.min * multiplier, 
        max: salaryInsights.max * multiplier
      },
      median: salaryInsights.average * multiplier,
      trend: 'up',
      trendPercent: 4.8,
      location: userRegionData.region,
      percentile: salaryInsights.percentile || 70
    };
  }, [salaryInsights, jobs, userData, userRegionData]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(userRegionData.locale, {
      style: 'currency',
      currency: userRegionData.currency,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const TrendIcon = data.trend === 'up' ? TrendingUp : TrendingDown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Salary Insights
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Market intelligence
          </p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center opacity-80">
          <DollarSign size={20} className="text-white" strokeWidth={2.5} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : (
        <>
          {/* Main figure */}
          <div className="relative z-10">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {data.role} - Median Salary
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-gray-900 dark:text-white">
                {formatCurrency(data.median)}
              </span>
              <div className={cn(
                'flex items-center gap-1 text-sm font-bold',
                data.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              )}>
                <TrendIcon size={16} />
                {data.trendPercent}%
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Year-over-year trend
            </p>
          </div>

          {/* Range visualization */}
          <div className="relative z-10 mt-6">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Salary Range</span>
              {data.location && (
                <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                  <MapPin size={10} />
                  {data.location}
                </span>
              )}
            </div>
            
            {/* Range bar */}
            <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200 dark:from-emerald-900/40 dark:via-emerald-600/40 dark:to-emerald-900/40">
              {/* Median indicator */}
              <div
                className="absolute top-0 w-0.5 h-full bg-gray-900 dark:bg-white"
                style={{
                  left: `${((data.median - data.range.min) / (Math.max(1, data.range.max - data.range.min))) * 100}%`,
                }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-gray-900 dark:bg-white" />
              </div>
            </div>
            
            <div className="mt-1 flex justify-between text-[10px] text-gray-500 dark:text-gray-400">
              <span>{formatCurrency(data.range.min)}</span>
              <span>{formatCurrency(data.range.max)}</span>
            </div>
          </div>

          {/* Percentile marker */}
          {data.percentile && (
            <div className="relative z-10 mt-4 p-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 size={14} className="text-violet-600 dark:text-violet-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Your Position
                  </span>
                </div>
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                  {data.percentile}th percentile
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Above {data.percentile}% of similar profiles
              </p>
            </div>
          )}

          {/* Trend indicator */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 relative z-10">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center',
                data.trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-rose-100 dark:bg-rose-900/40'
              )}>
                <TrendIcon size={12} className={cn(
                  data.trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                )} />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-300">
                <span className="font-semibold">
                  {data.trend === 'up' ? 'Rising' : 'Declining'}
                </span>{' '}
                market for {data.role} in your region
              </span>
            </div>
          </div>
        </>
      )}

      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-lime-500/5 via-emerald-500/5 to-teal-500/5 rounded-3xl blur-xl -z-10 pointer-events-none" />
    </motion.div>
  );
}

// Internal hook for demo
function useCalculateMock() {
  const [salary] = React.useState(mockSalary);
  return { salary };
}

function TrendIconDown(props: any) {
  return <TrendingDown {...props} />;
}
