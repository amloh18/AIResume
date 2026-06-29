'use client';

import React, { useEffect, useState, useContext, useRef } from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { CanvasContext } from './CoreUI';
import { motion } from 'framer-motion';

// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }: any) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ctx = useContext(CanvasContext);
  const moriChatMode = ctx?.moriChatMode || false;
  const entryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleUpdated = (e: CustomEvent) => {
      const { collection: eventCol, index: eventIdx, highlightIndex } = e.detail;
      if (eventCol === collection && eventIdx === index) {
        requestAnimationFrame(() => {
          if (typeof highlightIndex === 'number') {
            const element = entryRef.current?.querySelector(`[data-highlight-index="${highlightIndex}"]`);
            if (element) {
              element.classList.remove('mori-pulse-highlight');
              void (element as HTMLElement).offsetWidth;
              element.classList.add('mori-pulse-highlight');
              setTimeout(() => {
                element.classList.remove('mori-pulse-highlight');
              }, 2500);
            }
          } else {
            const element = entryRef.current;
            if (element) {
              element.classList.remove('mori-pulse-highlight');
              void (element as HTMLElement).offsetWidth;
              element.classList.add('mori-pulse-highlight');
              setTimeout(() => {
                element.classList.remove('mori-pulse-highlight');
              }, 2500);
            }
          }
        });
      }
    };

    window.addEventListener('mori-cv-updated-section', handleUpdated as EventListener);
    return () => {
      window.removeEventListener('mori-cv-updated-section', handleUpdated as EventListener);
    };
  }, [collection, index]);

  useEffect(() => {
    if (!confirmingDelete) return undefined;
    const timer = window.setTimeout(() => setConfirmingDelete(false), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmingDelete]);

  const handleDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    deleteEntry(collection, index);
    setConfirmingDelete(false);
  };

  const handleMoriClick = (e: React.MouseEvent) => {
    if (!moriChatMode) return;
    e.stopPropagation();
    const text = (e.currentTarget as HTMLElement).innerText || '';
    const path = `${collection}[${index}]`;
    window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
      detail: { path, text: `(Record from ${collection}): ${text.substring(0, 100)}...` } 
    }));
  };

  const baseClass = "relative group/entry cv-item cv-page-breakable transition-all duration-200 rounded-md border border-transparent";
  const hoverClass = moriChatMode 
    ? "hover:bg-emerald-500/10 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] cursor-pointer z-40" 
    : "hover:bg-[#10b981]/[0.02] shadow-none hover:shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover/snippet:z-30 hover:z-40 hover:border-transparent";

  return (
    <motion.div
      layout="position"
      ref={entryRef}
      onClick={handleMoriClick}
      className={`${baseClass} ${hoverClass}`}
      data-collection={collection}
      data-index={index}
    >
      <div className={`absolute -left-[32px] top-0 bottom-0 flex flex-col items-center justify-center opacity-0 group-hover/entry:opacity-100 group-focus-within/entry:opacity-100 pointer-events-none group-hover/entry:pointer-events-auto group-focus-within/entry:pointer-events-auto transition-opacity duration-200 no-print z-50 gap-0 ${moriChatMode ? 'hidden' : ''}`}>
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }}
            className="text-gray-400 hover:text-emerald-500 w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent"
            title="Move entry up"
            aria-label="Move entry up"
            type="button"
          >
            <ChevronUp size={13}/>
          </button>
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }}
            className="text-gray-400 hover:text-emerald-500 w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 bg-transparent"
            title="Move entry down"
            aria-label="Move entry down"
            type="button"
          >
            <ChevronDown size={13}/>
          </button>
          <button
            onClick={handleDelete}
            className={`w-7 h-7 flex items-center justify-center transition-all duration-150 hover:scale-110 active:scale-95 ${
              confirmingDelete
                ? 'bg-red-500 text-white rounded-lg shadow-md'
                : 'text-red-400/70 hover:text-red-500 bg-transparent'
            }`}
            title={confirmingDelete ? 'Click again to permanently delete this entry' : 'Delete entry'}
            aria-label={confirmingDelete ? 'Confirm delete entry' : 'Delete entry'}
            aria-pressed={confirmingDelete}
            type="button"
          >
            <Trash2 size={13}/>
          </button>
      </div>
      {children}
    </motion.div>
  );
};

// ==========================================
export default ListEntry;
