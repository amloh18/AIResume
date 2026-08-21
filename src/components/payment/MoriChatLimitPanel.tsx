'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface MoriChatLimitPanelProps {
  className?: string;
  title?: string;
  description?: React.ReactNode;
  triggerContext?: string;
}

/**
 * Inline "Mori Chat Limit Reached" prompt that replaces the chat composer
 * when the free monthly AI conversation limit is exhausted. Shared by the
 * resume-enhancer and LinkedIn chat panels so both UIs stay pixel-identical.
 * The primary action opens the unified payment modal.
 */
export default function MoriChatLimitPanel({
  className = '',
  title = 'Mori Chat Limit Reached',
  description = "You've exhausted your limit of 5 free AI conversations this month. Upgrade to Pro for unlimited edits!",
  triggerContext = 'mori-chat-limit',
}: MoriChatLimitPanelProps) {
  const { openPaymentModal } = usePaymentModal();

  return (
    <div
      className={`pointer-events-auto relative p-5 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-purple-500/10 dark:from-emerald-500/20 dark:to-purple-500/20 border border-emerald-500/20 dark:border-emerald-500/40 rounded-2xl shadow-xl flex flex-col items-center text-center gap-3 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 animate-pulse">
        <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <h4 className="text-[13.5px] font-bold text-slate-800 dark:text-white">
          {title}
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[290px] leading-relaxed">
          {description}
        </p>
      </div>
      <button
        onClick={() =>
          openPaymentModal({
            preselectedPlanKey: 'focused_monthly',
            triggerContext,
            returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          })
        }
        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5"
      >
        <span>Upgrade to Pro</span>
        <Sparkles className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
