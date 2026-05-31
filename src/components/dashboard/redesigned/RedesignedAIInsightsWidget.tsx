'use client';

import React from 'react';
import { Sparkles, ArrowRight, Lightbulb, TrendingUp } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'tip' | 'intelligence' | 'market';
}

const defaultInsights: Insight[] = [
  { id: '1', title: 'Timing Optimization', description: 'Applications sent on Tuesdays perform 23% better.', type: 'intelligence' },
  { id: '2', title: 'CV Performance', description: 'Your backend-focused CV receives more callbacks.', type: 'intelligence' },
  { id: '3', title: 'Market Trend', description: 'Remote React roles have increased by 15% this week.', type: 'market' },
];

export default function RedesignedAIInsightsWidget({ insights = defaultInsights, loading = false, empty = false }: { insights?: Insight[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="ai-insights"
      title="AI Behavioral Insights"
      subtitle="Data-Driven Strategy"
      type="list"
      userTier={['smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "More data needed",
        description: "Insights will appear once more data is collected.",
      }}
      className="h-[450px]"
    >
      <div className="space-y-4">
        {insights.map((insight) => (
          <div 
            key={insight.id} 
            className="flex items-start gap-3 p-4 rounded-[24px] bg-slate-50 dark:bg-white/[0.02] border border-gray-100 dark:border-white/5"
          >
            <div className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
              insight.type === 'intelligence' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
            )}>
              {insight.type === 'intelligence' ? <TrendingUp size={16} /> : <Lightbulb size={16} />}
            </div>
            <div>
              <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">{insight.title}</h4>
              <p className="text-[11px] font-medium text-gray-500 mt-1 leading-relaxed">{insight.description}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
