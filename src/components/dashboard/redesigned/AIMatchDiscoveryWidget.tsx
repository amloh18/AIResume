'use client';

import React from 'react';
import { Sparkles, ArrowRight, MapPin, Building2 } from 'lucide-react';
import DashboardWidget from './DashboardWidget';
import { cn } from '@/lib/utils';

interface Match {
  id: string;
  role: string;
  company: string;
  location: string;
  matchScore: number;
  status: 'Auto-applied' | 'Ready' | 'Review';
}

export default function AIMatchDiscoveryWidget({ matches, loading = false, empty = false }: { matches?: Match[], loading?: boolean, empty?: boolean }) {
  const displayMatches = matches || [];
  const isEmpty = empty || displayMatches.length === 0;
  return (
    <DashboardWidget
      id="ai-match-discovery"
      title="AI Match Discovery"
      subtitle="Newly Discovered Opportunities"
      type="list"
      userTier={['smart']}
      loading={loading}
      empty={empty}
      emptyState={{
        title: "No new AI matches found",
        description: "We're constantly scanning for new roles.",
      }}
      className="h-[450px]"
    >
      <div className="space-y-4">
        {displayMatches.map((match) => (
          <div 
            key={match.id} 
            className="group relative p-4 rounded-[24px] bg-white dark:bg-white/[0.02] border border-gray-100 dark:border-white/5 hover:border-[#83d60d]/30 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#83d60d] transition-colors">
                  <Building2 size={16} />
                </div>
                <div>
                  <h4 className="text-small font-black text-gray-800 dark:text-gray-200">{match.role}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{match.company}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-small font-black text-[#83d60d]">{match.matchScore}%</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">Match</div>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-[10px] font-medium text-gray-400">
                  <MapPin size={10} />
                  <span>{match.location}</span>
                </div>
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                  match.status === 'Auto-applied' ? 'bg-[#f0fbc9] text-[#487e04]' : 'bg-blue-50 text-blue-600'
                )}>
                  {match.status}
                </div>
              </div>
              <ArrowRight size={14} className="text-gray-300 group-hover:text-[#83d60d] transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
