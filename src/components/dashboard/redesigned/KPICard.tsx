'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { KPIWidgetData } from '@/types/dashboard-widgets';

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  trendDirection,
  icon,
  actionLabel,
  onClick,
  color,
  loading,
  isExpanded,
  className
}: KPIWidgetData & { onClick?: () => void; className?: string; loading?: boolean; isExpanded?: boolean }) {
  const cardColor = color || '#163d32';
  const isDarkColor = ['#163d32', '#1c4ce8', '#0f172a', '#6138db'].includes(cardColor);

  return (
    <motion.div
      layout
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      style={{ backgroundColor: cardColor }}
      className={cn(
        'relative overflow-hidden rounded-[32px] p-6 flex flex-col justify-between group cursor-pointer min-h-[160px] border border-white/20 shadow-sm',
        className
      )}
    >
      {/* Background Pattern / Icon */}
      <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700 rotate-12 pointer-events-none">
        {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 96, className: "text-white" })}
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors backdrop-blur-sm",
          isDarkColor ? 'bg-white/10 text-white' : 'bg-black/5 text-slate-900'
        )}>
          {React.isValidElement(icon) && React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}
        </div>
        
        {actionLabel && !isExpanded && (
          <span className={cn(
            "text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity",
            isDarkColor ? 'text-[#83d60d]' : 'text-slate-500'
          )}>
            {actionLabel}
          </span>
        )}
      </div>

      <div className="relative z-10 mt-4">
        <div className="flex items-baseline gap-2">
          {loading ? (
            <div className={cn(
              "h-10 w-24 rounded-lg animate-pulse",
              isDarkColor ? "bg-white/15" : "bg-white/35"
            )} />
          ) : (
            <motion.div
              layout="position"
              className={cn(
                "font-black tracking-tight leading-none group-hover:scale-105 transition-transform origin-left",
                isDarkColor ? 'text-white' : 'text-slate-900',
                isExpanded ? 'text-h3' : (typeof value === 'string' && value.length > 4 ? 'text-h2' : 'text-display')
              )}
            >
              {value}
            </motion.div>
          )}
          
          {trend && !isExpanded && !loading && (
            <div className={cn(
              "flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-md",
              trendDirection === 'up' ? (isDarkColor ? 'bg-[#83d60d]/20 text-[#83d60d]' : 'bg-emerald-50 text-emerald-600') :
              trendDirection === 'down' ? 'bg-rose-50 text-rose-600' :
              'bg-gray-50 text-gray-500'
            )}>
              {trendDirection === 'up' && <TrendingUp size={10} />}
              {trendDirection === 'down' && <TrendingDown size={10} />}
              {trendDirection === 'neutral' && <Minus size={10} />}
              {trend}
            </div>
          )}
        </div>
        
        <div className="mt-1 flex flex-col">
          <motion.div
            layout="position"
            className={cn(
              "text-[10px] font-bold uppercase tracking-wider",
              isDarkColor ? 'text-white/60' : 'text-slate-500'
            )}
          >
            {title}
          </motion.div>
          {loading && !isExpanded ? (
            <div className={cn(
              "mt-1 h-2.5 w-28 rounded animate-pulse",
              isDarkColor ? "bg-white/15" : "bg-white/35"
            )} />
          ) : subtitle && !isExpanded && (
            <div className={cn(
              "text-[9px] font-medium mt-0.5",
              isDarkColor ? 'text-[#83d60d]' : 'text-slate-400'
            )}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
