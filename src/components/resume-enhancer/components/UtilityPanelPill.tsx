'use client';

import React from 'react';
import { Sparkles, Palette, LayoutTemplate, FileJson, Target } from 'lucide-react';

type UtilityPanelId = 'analysis' | 'mori' | 'json' | 'layout' | 'design';

interface UtilityPanelPillProps {
  activePanel: UtilityPanelId | null;
}

const TABS: { id: UtilityPanelId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'analysis', label: 'Analysis', icon: Target },
  { id: 'mori', label: 'Mori', icon: Sparkles },
  { id: 'json', label: 'JSON', icon: FileJson },
  { id: 'layout', label: 'Layout', icon: LayoutTemplate },
  { id: 'design', label: 'Design', icon: Palette },
];

const activatePanel = (panel: UtilityPanelId) => {
  if (panel === 'analysis') {
    window.dispatchEvent(new CustomEvent('close-utility-panel'));
    window.dispatchEvent(new CustomEvent('open-analysis-panel'));
    return;
  }
  if (panel === 'mori') {
    window.dispatchEvent(new CustomEvent('open-mori-chat'));
    return;
  }
  if (panel === 'design') {
    window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'design' }));
    return;
  }
  if (panel === 'layout') {
    window.dispatchEvent(new CustomEvent('open-templates'));
    return;
  }
  window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'data' }));
};

export const UtilityPanelPill: React.FC<UtilityPanelPillProps> = ({ activePanel }) => {
  const resolved: UtilityPanelId = activePanel || 'analysis';

  const handleToggle = (panel: UtilityPanelId) => {
    if (resolved === panel) {
      if (panel !== 'analysis') {
        window.dispatchEvent(new CustomEvent('close-utility-panel'));
        window.dispatchEvent(new CustomEvent('open-analysis-panel'));
      }
      return;
    }
    activatePanel(panel);
  };

  return (
    <div className="hidden lg:block w-full shrink-0">
      <div className="relative grid grid-cols-5 items-stretch h-14 bg-gray-100 dark:bg-black/40">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = resolved === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleToggle(tab.id)}
              className={`relative h-full min-w-0 flex flex-col items-center justify-center gap-1 px-1 transition-colors duration-200 ${
                isActive
                  ? 'z-10 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-[var(--bg-secondary,#141810)]'
                  : 'z-0 text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/[0.06] hover:text-gray-800 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/10'
              }`}
              title={tab.label}
            >
              {isActive && (
                <span className="pointer-events-none absolute left-1/2 top-1 h-8 w-8 -translate-x-1/2 rounded-full bg-emerald-400/30 blur-md" />
              )}
              <Icon className={`relative z-10 w-4 h-4 ${isActive ? 'drop-shadow-[0_0_10px_rgba(16,185,129,0.7)]' : ''}`} />
              <span className={`relative z-10 text-[9px] leading-none truncate max-w-full ${isActive ? 'font-bold tracking-wide' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default UtilityPanelPill;
