'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';

interface TopSkillsWidgetProps {
  className?: string;
}

interface SkillItem {
  name: string;
  proficiency: number;
  demand: number;
  trend: 'up' | 'down' | 'stable';
}

// Mock data - should come from API analyzing saved jobs and market trends
const mockSkills: SkillItem[] = [
  { name: 'React', proficiency: 90, demand: 85, trend: 'up' },
  { name: 'TypeScript', proficiency: 75, demand: 88, trend: 'up' },
  { name: 'Node.js', proficiency: 80, demand: 72, trend: 'stable' },
  { name: 'PostgreSQL', proficiency: 65, demand: 68, trend: 'up' },
  { name: 'AWS', proficiency: 50, demand: 75, trend: 'up' },
];

export default function TopSkillsWidget({ className }: TopSkillsWidgetProps) {
  const { skillsMarket, secondaryLoading } = useDashboardData();
  const isLoading = secondaryLoading.skillsMarket;

  const skills: SkillItem[] = React.useMemo(() => {
    if (!skillsMarket?.skills) return [];
    return skillsMarket.skills.map((s: any) => ({
      name: s.name,
      proficiency: 85, // Mock proficiency for now
      demand: s.demand,
      trend: s.trend
    }));
  }, [skillsMarket]);

  const getProficiencyColor = (level: number) => {
    if (level >= 80) return 'bg-emerald-500';
    if (level >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getDemandIndicator = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={12} className="text-emerald-600 dark:text-emerald-400" />;
      case 'down':
        return <TrendingDown size={12} className="text-rose-600 dark:text-rose-400" />;
      default:
        return <Minus size={12} className="text-gray-400" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-4 md:p-5 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden h-full flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Top Skills
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Market alignment
          </p>
        </div>
        {/* Icon decoration */}
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center opacity-80">
          <span className="text-base">🎯</span>
        </div>
      </div>

      {/* Skills list */}
      <div className="relative z-10 space-y-2.5 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500" />
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No skill data available.</p>
          </div>
        ) : (
          skills.slice(0, 5).map((skill, idx) => (
            <div key={skill.name}>
              {/* Skill header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                    {skill.name}
                  </span>
                  {getDemandIndicator(skill.trend)}
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn(
                    'font-bold',
                    skill.proficiency >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                    skill.proficiency >= 60 ? 'text-amber-600 dark:text-amber-400' :
                    'text-rose-600 dark:text-rose-400'
                  )}>
                    {skill.proficiency}%
                  </span>
                  <span className="text-gray-400">prof</span>
                </div>
              </div>

              {/* Proficiency bar */}
              <div className="relative h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${skill.proficiency}%` }}
                  transition={{ duration: 0.8, delay: idx * 0.1 }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full h-full',
                    getProficiencyColor(skill.proficiency)
                  )}
                />
              </div>

              {/* Market demand indicator */}
              <div className="flex justify-between text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                <span>Market demand: {skill.demand}%</span>
                {skill.trend === 'up' && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ↑ Rising
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Insight */}
      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5 relative z-10">
        <div className="flex items-start gap-2">
          <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Lightbulb size={12} className="text-violet-600 dark:text-violet-400" />
          </div>
          <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">
            <span className="font-semibold">React demand increased 12%</span> this month. 
            Consider adding advanced patterns.
          </p>
        </div>
      </div>

      {/* Background glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-2xl pointer-events-none" />
    </motion.div>
  );
}
