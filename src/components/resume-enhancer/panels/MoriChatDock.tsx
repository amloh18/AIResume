'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MoriChatInterface from './MoriChatInterface';

const BAR_HEIGHT = 48;

interface MoriChatDockProps {
  /** Whether the chat is expanded into its overlay. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Always-visible Mori chat bar that lives below the canvas.
 *
 * The dock reserves a fixed-height row so showing/hiding the chat never changes
 * the editor layout. Collapsed it renders a slim prompt bar; expanded it grows
 * upward into an absolutely-positioned overlay (higher z-index than the canvas)
 * that shows the conversation and Mori's "thinking" state.
 *
 * Both states share a single MoriChatInterface instance, so chat history,
 * draft input and target selection survive collapsing the chat.
 */
const MoriChatDock: React.FC<MoriChatDockProps> = ({ open, onOpenChange }) => {
  const [expandedHeight, setExpandedHeight] = useState(440);

  useEffect(() => {
    const update = () => {
      // Cap against the viewport so the overlay can never be taller than the
      // screen on short displays. Kept deliberately short (~half the viewport)
      // so the chat leaves most of the CV visible while it is open.
      setExpandedHeight(Math.max(300, Math.min(520, Math.round(window.innerHeight * 0.5))));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  return (
    <div className="shrink-0 relative z-[60] px-3 pb-3 pt-1">
      {/* Reserved height — keeps the content area's layout identical whether the chat is open or closed */}
      <div className="mx-auto w-full max-w-3xl" style={{ height: BAR_HEIGHT }} aria-hidden />

      <motion.div
        initial={false}
        animate={{ height: open ? expandedHeight : BAR_HEIGHT }}
        transition={{ type: 'spring', stiffness: 300, damping: 32, mass: 0.85 }}
        className={`absolute left-3 right-3 bottom-3 mx-auto w-auto max-w-3xl overflow-hidden bg-white/95 dark:bg-[var(--bg-secondary)] backdrop-blur-xl transition-colors duration-300 ${
          open
            ? 'rounded-2xl border border-[var(--border-primary)] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.35)]'
            : 'rounded-full border border-[var(--border-primary)] shadow-[0_10px_30px_-12px_rgba(0,0,0,0.3)] hover:border-emerald-400/50 hover:shadow-[0_14px_34px_-12px_rgba(16,185,129,0.45)]'
        }`}
      >
        <MoriChatInterface
          dock={{
            collapsed: !open,
            onRequestExpand: () => onOpenChange(true),
            onRequestCollapse: () => onOpenChange(false),
          }}
        />
      </motion.div>
    </div>
  );
};

export default MoriChatDock;
