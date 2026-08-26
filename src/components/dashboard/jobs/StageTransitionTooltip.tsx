'use client';

import React from 'react';
import { Info, CheckCircle2, Mail, Zap, User } from 'lucide-react';

interface StageTransitionTooltipProps {
  stage: string;
  source?: 'user' | 'automation_worker' | 'email_intelligence' | 'admin' | 'system';
  reason?: string;
  evidenceText?: string;
}

export default function StageTransitionTooltip({
  stage,
  source = 'user',
  reason,
  evidenceText,
}: StageTransitionTooltipProps) {
  const getSourceBadge = () => {
    switch (source) {
      case 'automation_worker':
        return {
          icon: Zap,
          text: 'Auto-Applied & Verified',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
      case 'email_intelligence':
        return {
          icon: Mail,
          text: 'Verified via Inbound Email',
          color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        };
      case 'user':
        return {
          icon: User,
          text: 'Manually Moved by You',
          color: 'text-white/70 bg-white/5 border-white/10',
        };
      default:
        return {
          icon: Info,
          text: 'System Update',
          color: 'text-white/60 bg-white/5 border-white/10',
        };
    }
  };

  const badge = getSourceBadge();
  const Icon = badge.icon;

  return (
    <div className="p-3 rounded-xl bg-[#141414] border border-white/10 text-xs shadow-xl max-w-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-white uppercase text-[10px] tracking-wider">
          Stage: {stage}
        </span>
        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold ${badge.color}`}>
          <Icon className="w-3 h-3" />
          {badge.text}
        </div>
      </div>

      {reason && (
        <p className="text-white/70 text-[11px] leading-relaxed">
          {reason}
        </p>
      )}

      {evidenceText && (
        <div className="p-2 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-emerald-400">
          ✓ {evidenceText}
        </div>
      )}
    </div>
  );
}
