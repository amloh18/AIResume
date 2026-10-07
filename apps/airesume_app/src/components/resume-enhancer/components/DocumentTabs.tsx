'use client';

import React from 'react';

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

const CVPreview: React.FC = () => (
  <span className="up-doc up-cv-doc" aria-hidden="true">
    <span className="up-cv-hd">
      <span className="up-cv-avatar" />
      <span className="up-cv-hd-lines">
        <i className="up-cv-name" />
        <i className="up-cv-sub" />
      </span>
    </span>
    <span className="up-cv-body">
      <i className="up-cv-sec" />
      <i className="up-cv-ln" />
      <i className="up-cv-ln s" />
      <i className="up-cv-sec" />
      <i className="up-cv-ln" />
    </span>
  </span>
);

const CoverLetterPreview: React.FC = () => (
  <span className="up-doc up-cl-doc" aria-hidden="true">
    <span className="up-cl-hd">
      <i className="up-cl-to" />
      <i className="up-cl-date" />
    </span>
    <span className="up-cl-body">
      <i className="up-cl-ln" />
      <i className="up-cl-ln" />
      <i className="up-cl-ln s" />
      <i className="up-cl-ln" />
      <i className="up-cl-ln s" />
    </span>
    <span className="up-cl-foot">
      <i className="up-cl-sig" />
    </span>
  </span>
);

const DOC_THUMBNAIL_STYLES = `
.up-cv-doc {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
  padding: 3px 4px;
}
.up-cv-hd {
  display: flex;
  align-items: center;
  gap: 2.5px;
  margin-bottom: 1px;
}
.up-cv-avatar {
  display: block;
  width: 6.5px;
  height: 6.5px;
  border-radius: 999px;
  background: #10b981;
  flex-shrink: 0;
}
.up-cv-hd-lines {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
}
.up-cv-name {
  display: block;
  height: 2px;
  width: 70%;
  border-radius: 1px;
  background: rgba(17,24,39,.75);
}
.up-cv-sub {
  display: block;
  height: 1.5px;
  width: 45%;
  border-radius: 1px;
  background: rgba(17,24,39,.35);
}
.up-cv-body {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}
.up-cv-sec {
  display: block;
  height: 2px;
  width: 48%;
  border-radius: 1px;
  background: #10b981;
  margin-top: 0.5px;
}
.up-cv-ln {
  display: block;
  height: 1.5px;
  border-radius: 1px;
  background: rgba(17,24,39,.25);
  width: 95%;
}
.up-cv-ln.s {
  width: 58%;
}

.up-cl-doc {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
  padding: 3px 4px;
}
.up-cl-hd {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 1.5px;
}
.up-cl-to {
  display: block;
  height: 2px;
  width: 44%;
  border-radius: 1px;
  background: #10b981;
}
.up-cl-date {
  display: block;
  height: 1.5px;
  width: 28%;
  border-radius: 1px;
  background: rgba(17,24,39,.35);
}
.up-cl-body {
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}
.up-cl-ln {
  display: block;
  height: 1.5px;
  border-radius: 1px;
  background: rgba(17,24,39,.25);
  width: 95%;
}
.up-cl-ln.s {
  width: 60%;
}
.up-cl-foot {
  display: block;
  margin-top: auto;
  padding-top: 1px;
}
.up-cl-sig {
  display: block;
  height: 1.5px;
  width: 32%;
  border-radius: 1px;
  background: rgba(17,24,39,.65);
}
`;

/**
 * Document switch — CV ⇄ Cover Letter.
 *
 * Rendered as 1:1 tiles that live inside the tile rail (see UtilityPanelRail),
 * matching the panel tiles stacked beside them.
 *
 * Visible on mobile and desktop so the user can easily switch between CV and
 * Cover Letter from the tabs thumbnail row.
 */
const DocumentTabs: React.FC<DocumentTabsProps> = ({
  active,
  onChange,
  enabled,
  hasCoverLetter = false,
  className = '',
}) => {
  if (!enabled) return null;

  const tabs: { id: EditorDocument; label: string; title: string; Preview: React.FC }[] = [
    { id: 'cv', label: 'CV', title: 'CV', Preview: CVPreview },
    { id: 'cover-letter', label: 'Cover Letter', title: 'Cover letter', Preview: CoverLetterPreview },
  ];

  return (
    <div
      data-document-tabs
      role="group"
      aria-label="Document"
      className={`no-print flex flex-row md:flex-col items-center gap-2 shrink-0 ${className}`}
    >
      <style>{DOC_THUMBNAIL_STYLES}</style>
      {tabs.map(({ id, label, title, Preview }, index) => {
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
            <span className="up-pv">
              <Preview />
            </span>
            <span className="up-label tracking-tight">{label}</span>
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
