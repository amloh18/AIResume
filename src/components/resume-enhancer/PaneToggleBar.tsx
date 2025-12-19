'use client';

import React from 'react';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import { Eye, Sparkles } from 'lucide-react';

export default function PaneToggleBar() {
    const { state, dispatch } = useResumeEnhancer();
    const pendingFixes = state.surgicalFixes.filter(f => f.status === 'pending').length;

    const toggleToSurgeon = () => {
        dispatch({ type: 'SET_SHOW_PREVIEW_OVERLAY', payload: false });
    };

    const toggleToPreview = () => {
        dispatch({ type: 'SET_SHOW_PREVIEW_OVERLAY', payload: true });
    };

    return (
        <div className="flex bg-[var(--bg-secondary)] shadow-sm shadow-black/10 dark:shadow-black/30">
            <button
                onClick={toggleToSurgeon}
                className={`flex-1 px-4 py-3 font-medium text-sm transition-all relative flex items-center justify-center gap-2 ${!state.showPreviewOverlay
                        ? 'text-[color:var(--accent-primary)] bg-black/5 dark:bg-white/5'
                        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
            >
                <Sparkles className="w-4 h-4" />
                Surgeon
                {pendingFixes > 0 && (
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">
                        {pendingFixes}
                    </span>
                )}
            </button>
            <button
                onClick={toggleToPreview}
                className={`flex-1 px-4 py-3 font-medium text-sm transition-all flex items-center justify-center gap-2 ${state.showPreviewOverlay
                        ? 'text-[color:var(--accent-primary)] bg-black/5 dark:bg-white/5'
                        : 'text-[color:var(--text-tertiary)] hover:text-[color:var(--text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
            >
                <Eye className="w-4 h-4" />
                Preview
            </button>
        </div>
    );
}
