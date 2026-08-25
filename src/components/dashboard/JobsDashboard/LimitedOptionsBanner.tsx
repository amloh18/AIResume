'use client';

import React from 'react';
import { Puzzle, ArrowRight, ExternalLink } from 'lucide-react';

const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=discover-banner';

interface LimitedOptionsBannerProps {
  onAddManually: () => void;
}

export const LimitedOptionsBanner: React.FC<LimitedOptionsBannerProps> = ({ onAddManually }) => {
  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-dashed border-lime-500/50 dark:border-lime-500/40 p-5 bg-gradient-to-br from-lime-50/40 via-white to-gray-50/60 dark:from-lime-950/20 dark:via-[#141810] dark:to-[#141810] hover:border-lime-500 hover:shadow-xl transition-all duration-200">
      <div className="flex flex-col h-full gap-3.5">
        {/* Top Header: Extension tag */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-lime-500/10 text-lime-600 dark:text-[#80FF00]">
              <Puzzle className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-gray-900 dark:text-white">
              Browser Extension
            </span>
          </div>

          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-500/15 text-lime-700 dark:text-[#80FF00] border border-lime-500/30">
            Import from anywhere
          </span>
        </div>

        {/* Title & Body */}
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
            Want to import a job from any site?
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            Use the BuildAIResume browser extension to save and tailor applications directly from LinkedIn, Indeed, or any career page.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-auto pt-3 border-t border-gray-100 dark:border-white/5 space-y-2">
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-600 dark:bg-[#80FF00] dark:hover:brightness-95 text-white dark:text-black text-xs font-bold transition-all shadow-sm flex justify-center items-center gap-1.5"
          >
            <Puzzle className="w-3.5 h-3.5" />
            <span>Get Extension</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            type="button"
            onClick={onAddManually}
            className="w-full text-center text-[11px] font-semibold text-gray-500 hover:text-lime-600 dark:text-gray-400 dark:hover:text-[#80FF00] transition-colors py-1 flex items-center justify-center gap-1"
          >
            <span>Or paste job description manually</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitedOptionsBanner;
