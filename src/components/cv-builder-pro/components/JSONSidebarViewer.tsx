'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

const isObject = (value: any) => value !== null && typeof value === 'object';

const SECTION_COLORS: Record<string, string> = {
  basics: '#22d3ee',
  experience: '#60a5fa',
  work: '#60a5fa',
  volunteer: '#a78bfa',
  education: '#c084fc',
  awards: '#e879f9',
  certificates: '#f472b6',
  certifications: '#f472b6',
  publications: '#fb7185',
  skills: '#fb923c',
  languages: '#fbbf24',
  interests: '#facc15',
  projects: '#34d399',
  references: '#a3e635',
  structure: '#2dd4bf',
  content: '#38bdf8',
  metadata: '#818cf8',
  sectionTitles: '#f87171',
  snippetOverrides: '#93c5fd',
  stats: '#4ade80',
};

const SECTION_ORDER = [
  'basics',
  'experience',
  'education',
  'projects',
  'skills',
  'languages',
  'certifications',
  'awards',
  'publications',
  'volunteer',
  'references',
  'interests',
  'stats',
  'sectionTitles',
];

const getKeyColor = (key: string, level: number): string => {
  if (key in SECTION_COLORS) return SECTION_COLORS[key];
  const depthColors = ['#22d3ee', '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#c084fc', '#f472b6', '#fb7185'];
  return depthColors[level % depthColors.length];
};

const JSONNode = ({
  keyName,
  value,
  path,
  level,
  isLast,
  focusedPath,
  expanded,
  onToggle,
}: {
  keyName: string | null;
  value: any;
  path: string;
  level: number;
  isLast: boolean;
  focusedPath: string | null;
  expanded: Set<string>;
  onToggle: (path: string) => void;
}) => {
  const isComplex = isObject(value);
  const isArray = Array.isArray(value);
  const isExpanded = !isComplex || expanded.has(path) || level < 1;
  const isHighlighted = focusedPath && (focusedPath === path || focusedPath.startsWith(path + '.') || path.startsWith(focusedPath + '.'));
  const isExactMatch = focusedPath === path || (focusedPath && path && focusedPath.startsWith(path + '.') && !path.includes('.'));
  const indent = level * 16;
  const keyColor = keyName ? getKeyColor(keyName, level) : '#9ca3af';
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusedPath === path && nodeRef.current) {
      nodeRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [focusedPath, path]);

  if (!isComplex) {
    const valueColor = typeof value === 'string' ? '#4ade80' : typeof value === 'number' ? '#fb923c' : typeof value === 'boolean' ? '#34d399' : '#6b7280';
    const display = typeof value === 'string' ? `"${value}"` : value === null ? 'null' : String(value);
    return (
      <div
        ref={nodeRef}
        data-json-path={path}
        style={{
          paddingLeft: indent,
          background: focusedPath === path ? 'rgba(16,185,129,0.18)' : isHighlighted ? 'rgba(255,255,255,0.04)' : 'transparent',
          borderLeft: focusedPath === path ? '2px solid #10b981' : '2px solid transparent',
        }}
      >
        {keyName !== null && <span style={{ color: keyColor }}>"{keyName}"</span>}
        {keyName !== null && <span style={{ color: '#6b7280' }}>: </span>}
        <span style={{ color: valueColor }}>{display}</span>
        {!isLast && <span style={{ color: '#4b5563' }}>,</span>}
      </div>
    );
  }

  const entries: Array<[string, any]> = isArray
    ? (value as any[]).map((v: any, i: number) => [String(i), v])
    : Object.entries(value);

  return (
    <div ref={nodeRef} data-json-path={path}>
      <button
        type="button"
        className="w-full text-left"
        style={{
          paddingLeft: indent,
          background: focusedPath === path ? 'rgba(16,185,129,0.18)' : isExactMatch ? 'rgba(16,185,129,0.08)' : 'transparent',
          borderLeft: focusedPath === path ? '2px solid #10b981' : '2px solid transparent',
        }}
        onClick={(event) => {
          event.stopPropagation();
          onToggle(path);
        }}
      >
        <span style={{ color: '#6b7280', marginRight: 4 }}>{isExpanded ? '▼' : '▶'}</span>
        {keyName !== null && <span style={{ color: keyColor }}>"{keyName}"</span>}
        {keyName !== null && <span style={{ color: '#6b7280' }}>: </span>}
        <span style={{ color: '#9ca3af' }}>{isArray ? '[' : '{'}</span>
        {!isExpanded && <span style={{ color: '#6b7280' }}>{isArray ? ` ${entries.length} ]` : ' ... }'}{!isLast ? ',' : ''}</span>}
      </button>
      {isExpanded && (
        <>
          {entries.map(([k, v], index) => (
            <JSONNode
              key={`${path}.${k}`}
              keyName={isArray ? null : k}
              value={v}
              path={path ? `${path}.${isArray ? index : k}` : (isArray ? String(index) : k)}
              level={level + 1}
              isLast={index === entries.length - 1}
              focusedPath={focusedPath}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
          <div style={{ paddingLeft: indent, color: '#9ca3af' }}>
            {isArray ? ']' : '}'}
            {!isLast && ','}
          </div>
        </>
      )}
    </div>
  );
};

export interface JSONSidebarViewerProps {
  data: any;
  focusedPath: string | null;
  onChange?: (newData: any) => void;
  rainbowHighlight?: boolean;
  onCopyTemplate?: () => void | Promise<void>;
}

export const JSONSidebarViewer = ({ data, focusedPath, onChange, onCopyTemplate }: JSONSidebarViewerProps) => {
  const [rawMode, setRawMode] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['', ...SECTION_ORDER]));
  const skipSyncRef = useRef(false);

  const rawJson = useMemo(() => JSON.stringify(data ?? {}, null, 2), [data]);

  const sections = useMemo(() => {
    const keys = Object.keys(data || {});
    return SECTION_ORDER.filter((key) => keys.includes(key)).concat(keys.filter((key) => !SECTION_ORDER.includes(key) && key !== 'metadata'));
  }, [data]);

  useEffect(() => {
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    setJsonText(rawJson);
    setError(null);
  }, [rawJson]);

  useEffect(() => {
    if (!focusedPath) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      const parts = focusedPath.split('.');
      let acc = '';
      parts.forEach((part) => {
        acc = acc ? `${acc}.${part}` : part;
        next.add(acc);
      });
      next.add(parts[0]);
      next.add('');
      return next;
    });
  }, [focusedPath]);

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const jumpToSection = (section: string) => {
    handleToggle(section);
    setExpanded((prev) => new Set(prev).add(section).add(''));
    const el = document.querySelector(`[data-json-path="${section}"]`);
    el?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  const handleRawChange = (text: string) => {
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      skipSyncRef.current = true;
      onChange?.(parsed);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-[#d1d5db] relative">
      <div className="shrink-0 border-b border-white/10 px-3 py-2 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Sections</span>
          <div className="flex items-center gap-3">
            {onCopyTemplate && (
              <button
                type="button"
                onClick={async () => {
                  await onCopyTemplate();
                  setCopiedTemplate(true);
                  window.setTimeout(() => setCopiedTemplate(false), 1600);
                }}
                className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:text-emerald-300"
              >
                {copiedTemplate ? 'Copied' : 'Copy JSON Template'}
              </button>
            )}
            <button
              type="button"
              onClick={() => setRawMode((value) => !value)}
              className="text-[10px] uppercase tracking-widest font-bold text-emerald-400 hover:text-emerald-300"
            >
              {rawMode ? 'Tree view' : 'Edit raw'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => jumpToSection(section)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${focusedPath === section || focusedPath?.startsWith(section + '.') ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10' : 'border-white/10 text-gray-400 hover:text-gray-200'}`}
              style={{ color: focusedPath === section || focusedPath?.startsWith(section + '.') ? undefined : getKeyColor(section, 0) }}
            >
              {section}
            </button>
          ))}
        </div>
      </div>
      {error && <div className="bg-red-900/50 border-b border-red-500/50 text-red-400 p-2 text-small font-mono">{error}</div>}
      {rawMode ? (
        <textarea
          className="flex-1 w-full bg-[#0a0a0a] outline-none p-4 font-mono text-[11px] leading-relaxed resize-none custom-scrollbar"
          style={{ color: '#86efac' }}
          value={jsonText}
          onChange={(event) => handleRawChange(event.target.value)}
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 overflow-auto p-3 font-mono text-[11px] leading-relaxed custom-scrollbar">
          <span style={{ color: '#9ca3af' }}>{'{'}</span>
          {Object.entries(data || {}).map(([key, value], index, arr) => (
            <JSONNode
              key={key}
              keyName={key}
              value={value}
              path={key}
              level={1}
              isLast={index === arr.length - 1}
              focusedPath={focusedPath}
              expanded={expanded}
              onToggle={handleToggle}
            />
          ))}
          <span style={{ color: '#9ca3af' }}>{'}'}</span>
        </div>
      )}
    </div>
  );
};
