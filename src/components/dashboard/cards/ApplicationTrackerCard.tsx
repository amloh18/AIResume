'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Folder, FileText, Target, CheckCircle, MessageSquare, Sparkles } from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';

interface ApplicationTrackerCardProps {
  className?: string;
}

type DocType = 'master' | 'standalone' | 'journey' | 'coverletter';

export default function ApplicationTrackerCard({ className }: ApplicationTrackerCardProps) {
  const { cvs, coverLetters } = useDashboardData();

  // Calculate doc stats
  const docs = cvs || [];
  
  const docTypes: { name: string; key: DocType; count: number; color: string; bgColor: string; icon: any }[] = [
    { name: 'Master CV', key: 'master', count: docs.filter((j: any) => j.isMaster === true || j.metadata?.isMaster === true || j.cvType === 'master').length, color: 'text-lime-600 dark:text-lime-400', bgColor: 'bg-lime-100 dark:bg-lime-900/30', icon: Sparkles },
    { name: 'Standalone', key: 'standalone', count: docs.filter((j: any) => j.cvType === 'standalone').length, color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: FileText },
    { name: 'Journey CV', key: 'journey', count: docs.filter((j: any) => j.cvType === 'journey').length, color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Target },
    { name: 'Cover Letters', key: 'coverletter', count: coverLetters?.length || 0, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: MessageSquare },
  ];

  const total = docTypes.reduce((sum, d) => sum + d.count, 0);

  return (
    <Link href="/editor">
      <motion.div
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
        className={cn(
          'group relative bg-white dark:bg-[#111317] rounded-3xl p-5 md:p-6 shadow-sm',
          'border border-gray-100 dark:border-white/5',
          'transition-all duration-300',
          'hover:shadow-lg hover:border-gray-200 dark:hover:border-white/10',
          'flex flex-col h-full overflow-hidden',
          className
        )}
      >
        {/* Background icon */}
        <div className="absolute -right-6 -bottom-6 opacity-[0.03] md:opacity-[0.04] pointer-events-none transition-opacity">
          <Folder size={140} strokeWidth={1} />
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between relative z-10">
          <span className="text-small font-semibold text-gray-500 dark:text-gray-400">
            Canvas
          </span>
          <div className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-small font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
            <Folder size={14} className="mr-1.5 text-lime-600 dark:text-lime-400" />
            <span className="hidden sm:inline">Vault</span>
          </div>
        </div>

        {/* Document Stats Summary */}
        <div className="mt-4 flex gap-6 relative z-10">
          <div className="flex flex-col">
            <span className="text-h2 font-black text-gray-900 dark:text-white leading-none">
              {docs.length}
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
              Total CVs
            </span>
          </div>
          <div className="w-px h-8 bg-gray-100 dark:bg-white/10 self-center" />
          <div className="flex flex-col">
            <span className="text-h2 font-black text-gray-900 dark:text-white leading-none">
              {coverLetters?.length || 0}
            </span>
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mt-1">
              Cover Letters
            </span>
          </div>
        </div>

        {/* Documents Overview - 4 Tiles Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 relative z-10">
          {docTypes.map((doc, idx) => {
            const Icon = doc.icon;
            return (
              <div 
                key={doc.key} 
                className={cn(
                  "p-3 rounded-2xl border border-gray-100 dark:border-white/5 transition-all duration-300",
                  "bg-gray-50/50 dark:bg-white/[0.02] flex flex-col gap-2 group/tile",
                  "hover:border-lime-500/30 dark:hover:border-lime-500/20 hover:bg-white dark:hover:bg-white/[0.04]"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className={cn('p-1.5 rounded-lg', doc.bgColor)}>
                    <Icon size={16} className={doc.color} />
                  </div>
                  <span className={cn("text-h3 font-black tracking-tight", doc.color.replace('text-', 'text-opacity-90 '))}>
                    {doc.count}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {doc.name}
                </span>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-3 text-right relative z-10">
          <span className="text-small font-medium text-gray-600 dark:text-gray-300 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
            Open Canvas →
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
