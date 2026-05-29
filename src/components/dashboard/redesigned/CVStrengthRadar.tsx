'use client';

import React from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Metric {
  subject: string;
  A: number;
  fullMark: number;
}

const defaultMetrics: Metric[] = [
  { subject: 'Formatting', A: 95, fullMark: 100 },
  { subject: 'Keywords', A: 82, fullMark: 100 },
  { subject: 'Readability', A: 78, fullMark: 100 },
  { subject: 'Impact', A: 75, fullMark: 100 },
  { subject: 'Skills', A: 90, fullMark: 100 },
];

export default function CVStrengthRadar({ metrics = defaultMetrics, loading = false, empty = false }: { metrics?: Metric[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="cv-strength-radar"
      title="CV Strength Radar"
      subtitle="Visual ATS Quality"
      type="radar"
      userTier={['starter', 'focused', 'smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No CV analyzed yet",
        description: "Upload a CV to generate insights.",
        action: {
          label: "Upload CV",
          onClick: () => console.log('Upload CV'),
          primary: true
        }
      }}
      className="h-full"
    >
      <div className="flex flex-col md:flex-row items-center gap-6 h-full">
        {/* Radar Column */}
        <div className="w-full md:w-1/2 flex items-center justify-center min-h-[220px]">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={metrics}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis 
                dataKey="subject" 
                tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} 
              />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                name="CV Score"
                dataKey="A"
                stroke="#83d60d"
                fill="#83d60d"
                fillOpacity={0.6}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Bars Column */}
        <div className="w-full md:w-1/2 space-y-3 py-2">
          {metrics.map((m) => (
            <div key={m.subject} className="flex flex-col">
              <div className="flex justify-between text-[10px] font-black text-gray-400 mb-1 uppercase tracking-widest">
                <span>{m.subject}</span>
                <span className="text-[#83d60d]">{m.A}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${m.A}%` }}
                  className="h-full bg-[#83d60d]" 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardWidget>
  );
}
