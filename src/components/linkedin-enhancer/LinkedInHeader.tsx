'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  RefreshCw,
  Sparkles,
  Crown,
  MessageSquare,
  ExternalLink,
  FileText,
  Sliders,
  Check,
} from 'lucide-react';
import { useMembership } from '@/lib/hooks/useMembership';
import type { CVSelectionItem, LinkedInUserContext } from '@/types/linkedin';

interface LinkedInHeaderProps {
  availableCvs: CVSelectionItem[];
  selectedCvId: string | null;
  onCvSelect: (id: string, type: 'master' | 'standalone') => void;
  onRegenerate: () => void;
  isEnhancing: boolean;
  currentTone: LinkedInUserContext['tone_selection'];
  onToneChange: (tone: LinkedInUserContext['tone_selection']) => void;
  onToneChangeWithRegenerate?: (tone: LinkedInUserContext['tone_selection']) => void;
  onUpgradeClick?: () => void;
  onFetchFromLinkedIn?: () => void;
  isFetchingFromLinkedIn?: boolean;
  showMoriChat?: boolean;
  setShowMoriChat?: (val: boolean) => void;
  showInsights?: boolean;
  setShowInsights?: (val: boolean) => void;
}

const TONES: LinkedInUserContext['tone_selection'][] = [
  'Professional',
  'Startup-Friendly',
  'Executive',
  'Conversational',
];

export default function LinkedInHeader({
  availableCvs,
  selectedCvId,
  onCvSelect,
  onRegenerate,
  isEnhancing,
  currentTone,
  onToneChange,
  onToneChangeWithRegenerate,
  onUpgradeClick,
  onFetchFromLinkedIn,
  isFetchingFromLinkedIn = false,
  showMoriChat = false,
  setShowMoriChat,
  showInsights = true,
  setShowInsights,
}: LinkedInHeaderProps) {
  const router = useRouter();
  const { canAccess } = useMembership();
  const [showCvDropdown, setShowCvDropdown] = useState(false);
  const [showToneDropdown, setShowToneDropdown] = useState(false);

  const selectedCv = availableCvs.find((cv) => cv.id === selectedCvId);
  const canChangeTone = canAccess('linkedinToneChange');
  const canSelectCv = canAccess('linkedinCVSelection');

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 bg-transparent">
      {/* Left: Breadcrumbs & Heading */}
      <div>
        <div className="text-[11px] font-medium text-[var(--text-secondary)] mb-1 flex items-center gap-1.5">
          <span
            className="cursor-pointer hover:text-[var(--text-primary)] transition-colors"
            onClick={() => router.push('/dashboard')}
          >
            Dashboard
          </span>
          <span>›</span>
          <span className="text-[var(--text-primary)] font-semibold">LinkedIn Enhancer</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
            LinkedIn Enhancer
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 px-2.5 py-0.5 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-lime-400" />
            AI Profile Optimizer
          </span>
        </div>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1">
          Transform your profile with AI-crafted headlines, about summaries, and work impact bullets.
        </p>
      </div>

      {/* Right: Controls & CTAs */}
      <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center shrink-0">
        {/* Source CV Dropdown */}
        <div className="relative">
          <button
            onClick={() => (canSelectCv ? setShowCvDropdown(!showCvDropdown) : onUpgradeClick?.())}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
            title="Select source CV"
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
            <span className="truncate max-w-[120px] sm:max-w-[150px]">
              {selectedCv?.name || 'Select CV'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          <AnimatePresence>
            {showCvDropdown && canSelectCv && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowCvDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full right-0 mt-1.5 w-56 bg-[var(--bg-secondary)] rounded-xl shadow-xl border border-[var(--border-primary)] py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Source Document
                  </div>
                  {availableCvs.map((cv) => (
                    <button
                      key={cv.id}
                      onClick={() => {
                        onCvSelect(cv.id, cv.type);
                        setShowCvDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors ${
                        cv.id === selectedCvId
                          ? 'text-emerald-700 dark:text-lime-400 bg-emerald-50/50 dark:bg-lime-500/10'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <span className="truncate">{cv.name}</span>
                      {cv.id === selectedCvId && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Tone Selector */}
        <div className="relative">
          <button
            onClick={() =>
              canChangeTone ? setShowToneDropdown(!showToneDropdown) : onUpgradeClick?.()
            }
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>{currentTone}</span>
            {canChangeTone ? (
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            ) : (
              <span className="text-[10px] text-amber-600 font-bold bg-amber-50 dark:bg-amber-950/40 px-1 rounded">
                PRO
              </span>
            )}
          </button>

          <AnimatePresence>
            {showToneDropdown && canChangeTone && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowToneDropdown(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute top-full right-0 mt-1.5 w-44 bg-[var(--bg-secondary)] rounded-xl shadow-xl border border-[var(--border-primary)] py-1.5 z-50 overflow-hidden"
                >
                  <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">
                    Optimization Tone
                  </div>
                  {TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => {
                        if (onToneChangeWithRegenerate) {
                          onToneChangeWithRegenerate(tone);
                        } else {
                          onToneChange(tone);
                        }
                        setShowToneDropdown(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs font-semibold flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors ${
                        tone === currentTone
                          ? 'text-emerald-700 dark:text-lime-400 bg-emerald-50/50 dark:bg-lime-500/10'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    >
                      <span>{tone}</span>
                      {tone === currentTone && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Mori AI Sidebar Toggle */}
        <button
          onClick={() => {
            if (showMoriChat) {
              setShowMoriChat?.(false);
            } else {
              setShowMoriChat?.(true);
              setShowInsights?.(false);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all shadow-xs ${
            showMoriChat
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700/50'
              : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
          title="Toggle Mori AI Assistant Sidebar"
        >
          <MessageSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-lime-400" />
          <span>Mori AI</span>
        </button>

        {/* Open LinkedIn Link */}
        <a
          href="https://www.linkedin.com/in/me/edit/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all shadow-xs"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">LinkedIn</span>
        </a>

        {/* Re-enhance CTA */}
        <button
          onClick={onRegenerate}
          disabled={isEnhancing || !selectedCvId}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEnhancing ? 'animate-spin' : ''}`} />
          <span>{isEnhancing ? 'Enhancing...' : 'Enhance Profile'}</span>
        </button>
      </div>
    </div>
  );
}
