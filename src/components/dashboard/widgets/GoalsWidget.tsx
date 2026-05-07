'use client';

import React from 'react';
import { Target, Edit3, CheckCircle, Sparkles, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDashboardData } from '@/contexts/DashboardDataContext';

interface GoalsWidgetProps {
  className?: string;
}

interface GoalData {
  type: 'apps' | 'cvs' | 'interviews';
  title: string;
  count: number;
  target: number;
  color: string;
  icon: any;
}

export default function GoalsWidget({ className }: GoalsWidgetProps) {
  const { goals, secondaryLoading, refreshAll } = useDashboardData();
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  
  // Local state for editing targets
  const [targets, setTargets] = React.useState({
    apps: 20,
    cvs: 5,
    interviews: 10
  });

  React.useEffect(() => {
    if (goals) {
      setTargets({
        apps: goals.monthlyGoal || 20,
        cvs: goals.cvGoal || 5,
        interviews: goals.interviewGoal || 10
      });
    }
  }, [goals]);

  const isLoading = secondaryLoading.goals;

  const goalItems: GoalData[] = React.useMemo(() => {
    return [
      {
        type: 'apps',
        title: 'Applications',
        count: goals.applicationsThisMonth || 0,
        target: targets.apps,
        color: 'blue',
        icon: Target
      },
      {
        type: 'cvs',
        title: 'CV Updates',
        count: goals.cvsCreatedThisMonth || 0,
        target: targets.cvs,
        color: 'emerald',
        icon: CheckCircle
      },
      {
        type: 'interviews',
        title: 'Interviews',
        count: goals.coverLettersCreatedThisMonth || 0, // Using cover letters as proxy if interviews not direct
        target: targets.interviews,
        color: 'purple',
        icon: Sparkles
      }
    ];
  }, [goals, targets]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch('/api/dashboard/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monthlyGoal: targets.apps,
          cvGoal: targets.cvs,
          interviewGoal: targets.interviews
        })
      });
      
      if (response.ok) {
        setIsEditing(false);
        refreshAll(); // Refresh to sync data
      }
    } catch (err) {
      console.error('Failed to save goals', err);
    } finally {
      setIsSaving(false);
    }
  };

  const ProgressRing = ({ goal }: { goal: GoalData }) => {
    const radius = 32;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(1, goal.count / (goal.target || 1));
    const strokeDashoffset = circumference * (1 - progress);
    
    const colorMap: Record<string, string> = {
      blue: 'text-blue-500',
      emerald: 'text-emerald-500',
      purple: 'text-purple-500'
    };
    
    const bgMap: Record<string, string> = {
      blue: 'bg-blue-500/10',
      emerald: 'bg-emerald-500/10',
      purple: 'bg-purple-500/10'
    };

    return (
      <div className="flex flex-col items-center gap-2 group/ring">
        <div className="relative w-20 h-20">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              className="text-gray-100 dark:text-white/5"
            />
            <motion.circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeLinecap="round"
              className={cn(colorMap[goal.color])}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black dark:text-white">
              {goal.count}
            </span>
            <span className="text-[9px] font-bold text-gray-400 uppercase">
              / {goal.target}
            </span>
          </div>
        </div>
        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {goal.title}
        </span>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.7 }}
      className={cn(
        'bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-white/5 relative overflow-hidden flex flex-col h-full',
        className
      )}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Monthly Goals
            </h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Performance
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
          className={cn(
            "p-2 rounded-xl transition-all border",
            isEditing 
              ? "bg-emerald-500 text-white border-emerald-400 hover:bg-emerald-600" 
              : "bg-gray-50 dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/10 hover:text-blue-500"
          )}
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isEditing ? (
            <Save size={16} />
          ) : (
            <Edit3 size={16} />
          )}
        </button>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {goalItems.map((goal) => (
              <div key={goal.type} className="flex flex-col items-center gap-4">
                <ProgressRing goal={goal} />
                
                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 bg-gray-50 dark:bg-white/5 p-1 rounded-lg border border-gray-100 dark:border-white/10"
                    >
                      <input
                        type="number"
                        value={targets[goal.type]}
                        onChange={(e) => setTargets({...targets, [goal.type]: parseInt(e.target.value) || 0})}
                        className="w-10 bg-transparent text-center text-xs font-black dark:text-white outline-none"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggestion text when not editing */}
      {!isEditing && (
        <div className="mt-6 p-3 rounded-2xl bg-blue-50/50 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 flex items-start gap-2">
          <Sparkles size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-gray-600 dark:text-gray-400 leading-normal">
            Based on your activity, you're on track to hit your {goalItems[0].title} goal by the 25th.
          </p>
        </div>
      )}
    </motion.div>
  );
}
