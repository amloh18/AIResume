'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Search, CheckCircle, Briefcase } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'apply' | 'match' | 'system';
  text: string;
  time: string;
}

const defaultActivities: Activity[] = [
  { id: '1', type: 'apply', text: 'Applied to Frontend Engineer @ Atlassian', time: '8 mins ago' },
  { id: '2', type: 'match', text: 'Found 4 new matches', time: '15 mins ago' },
  { id: '3', type: 'apply', text: 'Applied to Senior React Dev @ Canva', time: '1h ago' },
  { id: '4', type: 'system', text: 'System optimization complete', time: '2h ago' },
  { id: '5', type: 'match', text: 'Found 12 new matches', time: '4h ago' },
];

export default function BotActivityFeed({ activities = defaultActivities, loading = false, empty = false }: { activities?: Activity[], loading?: boolean, empty?: boolean }) {
  return (
    <DashboardWidget
      id="bot-activity-feed"
      title="Bot Activity Feed"
      subtitle="Live System Events"
      type="feed"
      userTier={['smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No bot activity yet",
        description: "Bot actions will appear here once active.",
      }}
      className="h-full"
    >
      <div className="space-y-4 relative">
        {/* Timeline Line */}
        <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-white/5" />
        
        {activities.map((activity, idx) => (
          <motion.div 
            key={activity.id} 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="flex gap-4 relative z-10"
          >
            <div className={cn(
              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-4 border-white dark:border-[#111317]",
              activity.type === 'apply' ? 'bg-blue-500 text-white' :
              activity.type === 'match' ? 'bg-[#83d60d] text-slate-900' :
              'bg-gray-400 text-white'
            )}>
              {activity.type === 'apply' && <Briefcase size={10} />}
              {activity.type === 'match' && <Search size={10} />}
              {activity.type === 'system' && <Zap size={10} />}
            </div>
            <div className="flex-1 pb-4 border-b border-gray-50 dark:border-white/[0.02]">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 leading-snug">
                {activity.text}
              </p>
              <p className="text-[10px] font-medium text-gray-400 mt-1">{activity.time}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </DashboardWidget>
  );
}
