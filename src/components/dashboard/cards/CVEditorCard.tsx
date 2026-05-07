'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { FileText, Clock } from 'lucide-react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { cn } from '@/lib/utils';

interface CVEditorCardProps {
  className?: string;
}

export default function CVEditorCard({ className }: CVEditorCardProps) {
  const { cvs } = useDashboardData();

  const recentCVs = cvs?.slice(0, 3) || [];

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
        {/* Background icon - large, faded */}
        <div className="absolute -right-4 -bottom-4 opacity-[0.04] md:opacity-[0.05] pointer-events-none group-hover:opacity-[0.08] transition-opacity">
          <FileText size={120} strokeWidth={1} />
        </div>

        {/* Card Header */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            CV Editor
          </span>
          <div className="flex items-center px-3 py-1.5 bg-gray-50 dark:bg-white/5 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10">
            <FileText size={14} className="mr-1.5 text-lime-600 dark:text-lime-400" />
            <span className="hidden sm:inline">Manage</span>
          </div>
        </div>

        {/* Main Count */}
        <div className="mb-4 flex items-end gap-3 relative z-10">
          <h2 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white leading-none">
            {cvs?.length || 0}
          </h2>
          <span className="text-xs font-medium text-lime-600 dark:text-lime-400 mb-1 flex items-center">
            ↑ Active
          </span>
        </div>

        {/* Recent CVs List */}
        <div className="flex-1 space-y-2 relative z-10 w-full">
          {recentCVs.map((cv: any) => (
            <div
              key={cv.id || cv._id}
              className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-white/[0.03] border border-transparent group-hover:border-lime-500/10 transition-all"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-lime-500 flex-shrink-0" />
              <div className="flex-1 min-w-0 flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                    {cv.title || 'Untitled CV'}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {cv.metadata?.isMaster ? 'Master CV' : 'Targeted CV'}
                    {cv.status && ` • ${cv.status}`}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-[9px] text-gray-400 flex items-center gap-1 justify-end">
                    <Clock size={10} />
                    {new Date(cv.updatedAt || cv.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}
          {(!cvs || cvs.length === 0) && (
            <div className="text-xs text-gray-400 italic py-2 text-center">
              No CVs yet. Create your first one!
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 relative z-10">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
            Open CV Editor →
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
