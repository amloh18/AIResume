'use client';

import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

const GlobalSearchBar: React.FC = () => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  const openCommandBar = () => {
    window.dispatchEvent(new CustomEvent('open-global-command-bar'));
  };

  return (
    <>
      {/* Desktop/Tablet Search Bar Trigger */}
      <div 
        onClick={openCommandBar}
        className="relative hidden tablet:block shrink min-w-[220px] max-w-full cursor-pointer group"
      >
        <div className="relative flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400 dark:text-gray-500 z-10 pointer-events-none group-hover:text-lime-400 transition-colors" />
          <div
            className="w-[clamp(220px,28vw,450px)] max-w-full pl-10 pr-12 py-2 rounded-2xl bg-gray-100 dark:bg-[#232f1c] border border-gray-300 dark:border-lime-500/20 text-gray-500 dark:text-white/50 transition-all text-sm select-none"
          >
            Search jobs, CVs, cover letters...
          </div>
          <div className="absolute right-3 hidden desktop:flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 font-medium px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-white/10 bg-white/50 dark:bg-black/20 pointer-events-none">
            <span className="text-[10px] mr-0.5">{isMac ? '⌘' : 'Ctrl'}</span>K
          </div>
        </div>
      </div>

      {/* Mobile Search Icon Trigger */}
      <div className="tablet:hidden relative flex items-center">
        <button
          onClick={openCommandBar}
          className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Search"
        >
          <Search size={18} />
        </button>
      </div>
    </>
  );
};

export default GlobalSearchBar;
