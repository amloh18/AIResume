'use client';

import React, { useEffect, useState, useContext, useRef } from 'react';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';
import { CanvasContext, SnippetContext } from './CoreUI';
import { motion } from 'framer-motion';

// REUSABLE ENTRY WRAPPER
// ==========================================
const ListEntry = ({ collection, index, moveEntry, deleteEntry, children }: any) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const ctx = useContext(CanvasContext);
  const snippetCtx = useContext(SnippetContext);
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
    if (!e.altKey) return;
    e.stopPropagation();
    const text = (e.currentTarget as HTMLElement).innerText || '';
    const path = `${collection}[${index}]`;
    window.dispatchEvent(new CustomEvent('mori-cv-selection', { 
      detail: { path, text: `(Record from ${collection}): ${text.substring(0, 100)}...` } 
    }));
  };

  const baseClass = "relative group/entry cv-item cv-page-breakable transition-[background-color,border-color,box-shadow,opacity] duration-200 rounded-md border border-transparent";
  const hoverClass = moriChatMode 
    ? "hover:bg-emerald-500/10 hover:shadow-[0_0_0_2px_rgba(16,185,129,0.4)] z-40" 
    : "hover:bg-[#10b981]/[0.02] shadow-none hover:shadow-[0_2px_8px_rgba(16,185,129,0.05)] group-hover/snippet:z-30 hover:z-40 hover:border-transparent";

  const entryId = ctx?.cvData?.[collection]?.[index]?.id;
  if (snippetCtx && entryId) {
    const entryUnitId = `${snippetCtx.blockId}_entry_${entryId}`;
    const assignedPage = snippetCtx.pageAssignments[entryUnitId] ?? 0;
    if (assignedPage !== snippetCtx.pageIdx) {
      return null;
    }
  }

  return (
    <div
      ref={entryRef}
      onClick={handleMoriClick}
      className={`${baseClass} ${hoverClass}`}
      data-collection={collection}
      data-index={index}
      data-entry-id={entryId}
    >
      {/* Entry rail: sits INSIDE the page, immediately left of the entry (no gap
          to cross, so hover survives the trip to the buttons). Same chrome as the
          section and text rails — see RAIL_SHELL in CoreUI. */}
      <div className={`entry-controls absolute -left-[28px] w-7 top-0 bottom-0 flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl border backdrop-blur-sm shadow-[0_6px_20px_rgba(0,0,0,0.12)] bg-white/95 border-gray-200 dark:bg-[#23271f] dark:border-white/10 opacity-0 group-hover/entry:opacity-100 group-focus-within/entry:opacity-100 pointer-events-none group-hover/entry:pointer-events-auto group-focus-within/entry:pointer-events-auto transition-opacity duration-150 no-print z-50`}>
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
            title="Move entry up"
            aria-label="Move entry up"
            type="button"
          >
            <ChevronUp size={13}/>
          </button>
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 dark:text-gray-400 hover:text-emerald-500 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors duration-150"
            title="Move entry down"
            aria-label="Move entry down"
            type="button"
          >
            <ChevronDown size={13}/>
          </button>
          <button
            onClick={handleDelete}
            className={`w-6 h-6 flex items-center justify-center rounded-md transition-colors duration-150 ${
              confirmingDelete
                ? 'bg-red-500 text-white shadow-md'
                : 'text-red-400/80 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/10'
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
    </div>
  );
};

// ==========================================
export default ListEntry;
