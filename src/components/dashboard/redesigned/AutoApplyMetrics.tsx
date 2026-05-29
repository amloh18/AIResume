'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

const data = [
  { name: 'Mon', apps: 4, matches: 12 },
  { name: 'Tue', apps: 7, matches: 18 },
  { name: 'Wed', apps: 5, matches: 15 },
  { name: 'Thu', apps: 8, matches: 22 },
  { name: 'Fri', apps: 12, matches: 30 },
  { name: 'Sat', apps: 3, matches: 10 },
  { name: 'Sun', apps: 2, matches: 8 },
];

export default function AutoApplyMetrics({ loading = false, empty = false }: { loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="auto-apply-metrics"
      title="Automation Metrics"
      subtitle="System Performance Analytics"
      type="chart"
      userTier={['smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No metrics available",
        description: "Metrics will appear once automation starts.",
      }}
      className="h-full min-h-[300px]"
    >
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorMatches" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#83d60d" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#83d60d" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(156, 163, 175, 0.1)" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 10, fontWeight: 700 }} 
            />
            <YAxis 
              hide 
            />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Area 
              type="monotone" 
              dataKey="matches" 
              stroke="#83d60d" 
              fillOpacity={1} 
              fill="url(#colorMatches)" 
              strokeWidth={3}
            />
            <Area 
              type="monotone" 
              dataKey="apps" 
              stroke="#3B82F6" 
              fillOpacity={1} 
              fill="url(#colorApps)" 
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#83d60d]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Matches Found</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#3B82F6]" />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Apps Sent</span>
        </div>
      </div>
    </DashboardWidget>
  );
}
