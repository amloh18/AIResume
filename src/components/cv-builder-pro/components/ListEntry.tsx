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
      <div className={`absolute -left-[34px] top-0 bottom-0 flex flex-col items-center justify-center opacity-0 group-hover/entry:opacity-100 group-focus-within/entry:opacity-100 pointer-events-none group-hover/entry:pointer-events-auto group-focus-within/entry:pointer-events-auto transition-opacity duration-200 no-print z-50 ${moriChatMode ? 'hidden' : ''}`}>
        <div className="flex flex-col gap-1 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.12)] border border-gray-200 rounded-lg p-1 pointer-events-auto relative group-hover/entry:bg-white">
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, -1); }}
            className="text-gray-500 hover:bg-gray-50 hover:text-[#10b981] p-1 rounded-md transition-colors"
            title="Move entry up"
            aria-label="Move entry up"
            type="button"
          >
            <ChevronUp size={14}/>
          </button>
          <button
            onClick={(e: any) => { e.stopPropagation(); moveEntry(collection, index, 1); }}
            className="text-gray-500 hover:bg-gray-50 hover:text-[#10b981] p-1 rounded-md transition-colors"
            title="Move entry down"
            aria-label="Move entry down"
            type="button"
          >
            <ChevronDown size={14}/>
          </button>
          <div className="w-full h-px bg-gray-100 my-0.5"></div>
          <button
            onClick={handleDelete}
            className={`p-1 rounded-md transition-all border ${
              confirmingDelete
                ? 'bg-red-600 text-white border-red-700 shadow-sm hover:bg-red-700'
                : 'text-red-700 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-800'
            }`}
            title={confirmingDelete ? 'Click again to permanently delete this entry' : 'Delete entry'}
            aria-label={confirmingDelete ? 'Confirm delete entry' : 'Delete entry'}
            aria-pressed={confirmingDelete}
            type="button"
          >
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
      {children}
    </motion.div>
  );
};

// ==========================================
export default ListEntry;
