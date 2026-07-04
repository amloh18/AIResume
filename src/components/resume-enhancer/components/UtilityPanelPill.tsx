import React from 'react';
import { Sparkles, Palette, LayoutTemplate, FileJson, Briefcase } from 'lucide-react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';

interface UtilityPanelPillProps {
  activePanel: 'mori' | 'design' | 'json' | 'layout' | null;
  /** Called when a button is hovered — pass null on mouse-leave */
  onHoverPanel?: (panel: 'mori' | 'design' | 'json' | 'layout' | 'role' | null) => void;
}

export const UtilityPanelPill: React.FC<UtilityPanelPillProps> = ({ activePanel, onHoverPanel }) => {
  const { state, dispatch } = useResumeEnhancer();

  const handleToggle = (panel: 'mori' | 'design' | 'json' | 'layout') => {
    if (activePanel === panel) {
      window.dispatchEvent(new CustomEvent('close-utility-panel'));
    } else {
      if (panel === 'mori') {
        window.dispatchEvent(new CustomEvent('open-mori-chat'));
      } else if (panel === 'design') {
        window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'design' }));
      } else if (panel === 'layout') {
        window.dispatchEvent(new CustomEvent('open-templates'));
      } else if (panel === 'json') {
        window.dispatchEvent(new CustomEvent('set-builder-sidebar', { detail: 'data' }));
      }
    }
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full p-1 shrink-0">
      {/* Briefcase Job Icon — Only show for journey-based CVs */}
      {state.cvType === 'journey' && (
        <button 
          onClick={() => {
            if (state.journeyId || state.cvType === 'journey') {
              window.dispatchEvent(new CustomEvent('open-job-sidebar'));
            } else {
              dispatch({ type: 'SET_SHOW_PROFILER_MODAL', payload: true });
            }
          }}
          onMouseEnter={() => onHoverPanel?.('role')}
          onMouseLeave={() => onHoverPanel?.(null)}
          className="p-1.5 rounded-full text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10 transition-all cursor-pointer shrink-0 hover:scale-110 active:scale-95 duration-150"
          title="Job Description"
        >
          <Briefcase className="w-4 h-4" />
        </button>
      )}

      {/* Mori AI (Sparkles) */}
      <button 
         onClick={() => handleToggle('mori')}
         onMouseEnter={() => onHoverPanel?.('mori')}
         onMouseLeave={() => onHoverPanel?.(null)}
         className={`p-1.5 rounded-full transition-all flex items-center justify-center hover:scale-110 active:scale-95 duration-150 ${
           activePanel === 'mori' 
             ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
             : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
         }`}
         title="Mori Chat"
      >
         <Sparkles className="w-4 h-4" />
      </button>

      {/* Design Panel Toggle */}
      <button 
        onClick={() => handleToggle('design')}
        onMouseEnter={() => onHoverPanel?.('design')}
        onMouseLeave={() => onHoverPanel?.(null)}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center hover:scale-110 active:scale-95 duration-150 ${
          activePanel === 'design' 
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
        }`}
        title="Global Design"
      >
        <Palette className="w-4 h-4" />
      </button>

      {/* Templates Modal Toggle */}
      <button 
        onClick={() => handleToggle('layout')}
        onMouseEnter={() => onHoverPanel?.('layout')}
        onMouseLeave={() => onHoverPanel?.(null)}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center hover:scale-110 active:scale-95 duration-150 ${
          activePanel === 'layout' 
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
        }`}
        title="Template Library"
      >
        <LayoutTemplate className="w-4 h-4" />
      </button>

      {/* Raw JSON Panel Toggle */}
      <button 
        onClick={() => handleToggle('json')}
        onMouseEnter={() => onHoverPanel?.('json')}
        onMouseLeave={() => onHoverPanel?.(null)}
        className={`p-1.5 rounded-full transition-all flex items-center justify-center hover:scale-110 active:scale-95 duration-150 ${
          activePanel === 'json' 
            ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-white/10'
        }`}
        title="Raw JSON"
      >
        <FileJson className="w-4 h-4" />
      </button>
    </div>
  );
};

export default UtilityPanelPill;
