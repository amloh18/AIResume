'use client';

import React from 'react';
import { Puzzle, ClipboardPlus, ArrowRight, Sparkles } from 'lucide-react';

const CHROME_WEB_STORE_URL = 'https://chromewebstore.google.com/detail/fphkljfgefkfemmlfbpnjdojnfeadaii?utm_source=discover-banner';

interface LimitedOptionsBannerProps {
  onAddManually: () => void;
}

export const LimitedOptionsBanner: React.FC<LimitedOptionsBannerProps> = ({ onAddManually }) => {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-gray-50 via-white to-lime-50/30 dark:from-[#141810] dark:via-[#141810] dark:to-[#172213] p-5 md:p-6">
      {/* Subtle decorative glow */}
      <div className="absolute -top-16 -right-16 w-40 h-40 bg-lime-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        {/* Icon + Text */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-lime-100 dark:bg-lime-500/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-lime-600 dark:text-lime-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-0.5">
              Want more control over your search?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Grab our browser extension to save jobs from any site instantly, or paste a job description and we will parse it for you.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
          {/* Download Extension */}
          <a
            href={CHROME_WEB_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-black text-xs font-bold transition-all shadow-sm hover:shadow-md whitespace-nowrap flex-1 md:flex-initial"
          >
            <Puzzle className="w-3.5 h-3.5" />
            Get the Extension
          </a>

          {/* Add Manually */}
          <button
            onClick={onAddManually}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-lime-500 dark:hover:border-lime-500 text-gray-700 dark:text-gray-200 text-xs font-semibold transition-colors whitespace-nowrap flex-1 md:flex-initial"
          >
            <ClipboardPlus className="w-3.5 h-3.5" />
            Add Manually
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default LimitedOptionsBanner;
