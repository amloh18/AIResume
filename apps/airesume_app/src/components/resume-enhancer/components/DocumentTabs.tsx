'use client';

import React from 'react';
import { FileText, Mail } from 'lucide-react';

/**
 * Which document the Step-3 canvas is showing. The cover letter is edited in
 * the same step (and the same canvas frame) as the CV; only the document that
 * fills the frame changes.
 */
export type EditorDocument = 'cv' | 'cover-letter';

interface DocumentTabsProps {
  active: EditorDocument;
  onChange: (document: EditorDocument) => void;
  /** Cover letters are not offered for Profile (master) CVs. */
  enabled: boolean;
  /** A cover letter already exists for this CV/session. */
  hasCoverLetter?: boolean;
  className?: string;
}

/**
 * Document switch — CV ⇄ Cover Letter.
 *
 * Rendered as 1:1 tiles that live inside the right-hand tile rail (see
 * UtilityPanelRail), matching the panel tiles stacked beside them, rather than
 * as a strip pinned to the canvas' left edge. The old left-edge strip sat in the
 * sheet's gutter where it competed with the canvas for width and read as a
 * second navigation system; here the switch is one more thing the rail offers.
 *
 * It deliberately reuses the rail's `up-tile` / `up-pv` / `up-label` chrome, so
 * this component MUST be rendered inside UtilityPanelRail's container — that is
 * where those styles are declared.
 *
 * Desktop only (`hidden md:flex`), matching the strip it replaces: on mobile the
 * rail becomes a horizontal scroller, and two more tiles would push the panel
 * tiles out of reach.
 */
const DocumentTabs: React.FC<DocumentTabsProps> = ({
  active,
  onChange,
  enabled,
  hasCoverLetter = false,
  className = '',
}) => {
  if (!enabled) return null;

  const tabs: { id: EditorDocument; label: string; title: string; Icon: typeof FileText }[] = [
    { id: 'cv', label: 'CV', title: 'CV', Icon: FileText },
    { id: 'cover-letter', label: 'Letter', title: 'Cover letter', Icon: Mail },
  ];

  return (
    <div
      data-document-tabs
      role="group"
      aria-label="Document"
      className={`no-print hidden md:flex flex-col items-center gap-2 ${className}`}
    >
      {tabs.map(({ id, label, title, Icon }, index) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            aria-selected={isActive}
            aria-label={title}
            title={isActive ? `Editing: ${title}` : `Switch to ${title}`}
            onClick={() => onChange(id)}
            style={{ animationDelay: `${index * 80}ms` }}
            className={`up-tile group relative shrink-0 w-[4.5rem] h-[4.5rem] rounded-2xl overflow-visible border ${
              isActive
                ? 'bg-emerald-500/[0.16] border-emerald-500/60 text-emerald-600 dark:text-emerald-400'
                : 'bg-[#f3f2ee] dark:bg-[#1a1a1a] border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-emerald-400/60'
            }`}
          >
            <span className="up-pv flex items-center justify-center">
              <Icon className="w-6 h-6 stroke-[2]" aria-hidden="true" />
            </span>
            <span className="up-label">{label}</span>
            {/* A letter already exists for this session — the same signal the old
                strip carried, so the tile does not read as "start from scratch". */}
            {id === 'cover-letter' && hasCoverLetter && (
              <span
                aria-hidden="true"
                className={`absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full ${
                  isActive ? 'bg-emerald-400' : 'bg-lime-500'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default DocumentTabs;
