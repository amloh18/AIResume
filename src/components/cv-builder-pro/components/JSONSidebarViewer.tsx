'use client';

import React, { useState, useEffect, useMemo } from 'react';

const isObject = (value: any) => value !== null && typeof value === 'object';

const SECTION_COLORS: Record<string, string> = {
  basics: 'text-cyan-400',
  work: 'text-blue-400',
  volunteer: 'text-violet-400',
  education: 'text-purple-400',
  awards: 'text-fuchsia-400',
  certificates: 'text-pink-400',
  publications: 'text-rose-400',
  skills: 'text-orange-400',
  languages: 'text-amber-400',
  interests: 'text-yellow-400',
  projects: 'text-emerald-400',
  references: 'text-lime-400',
  structure: 'text-teal-400',
  content: 'text-sky-400',
  metadata: 'text-indigo-400',
  sectionTitles: 'text-red-400',
  snippetOverrides: 'text-blue-300',
};

const getKeyColor = (key: string, level: number): string => {
  if (key in SECTION_COLORS) return SECTION_COLORS[key];
  const depthColors = ['text-cyan-400', 'text-sky-400', 'text-blue-400', 'text-indigo-400', 'text-violet-400', 'text-purple-400', 'text-pink-400', 'text-rose-400'];
  return depthColors[level % depthColors.length];
};

interface HighlightToken {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null-token' | 'brace' | 'bracket' | 'colon' | 'comma' | 'plain';
  content: string;
  colorClass: string;
}

function tokenizeAndColor(jsonStr: string): { tokens: HighlightToken[]; html: string } {
  const tokenPattern = /("(?:[^"\\]|\\.)*"|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[\[\]{}:,])/g;
  const tokens: HighlightToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(jsonStr)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'plain', content: jsonStr.slice(lastIndex, match.index), colorClass: '' });
    }
    const val = match[0];
    const at = match.index;
    const after = jsonStr.slice(at + val.length);
    let type: HighlightToken['type'] = 'plain';
    let class_ = '';

    if (val === '{') {
      type = 'brace'; class_ = 'text-gray-400';
    } else if (val === '}') {
      type = 'brace'; class_ = 'text-gray-400';
    } else if (val === '[') {
      type = 'bracket'; class_ = 'text-gray-400';
    } else if (val === ']') {
      type = 'bracket'; class_ = 'text-gray-400';
    } else if (val === ':') {
      type = 'colon'; class_ = 'text-gray-500';
    } else if (val === ',') {
      type = 'comma'; class_ = 'text-gray-500';
    } else if (val === 'true' || val === 'false') {
      type = 'boolean'; class_ = 'text-emerald-400';
    } else if (val === 'null') {
      type = 'null-token'; class_ = 'text-gray-600';
    } else if (/^-?\d/.test(val)) {
      type = 'number'; class_ = 'text-orange-400';
    } else if (val.startsWith('"')) {
      const beforeColon = jsonStr.indexOf(':', at);
      type = beforeColon !== -1 && beforeColon < at + val.length ? 'key' : 'string';
      if (type === 'key') {
        const inner = val.slice(1, -1);
        class_ = getKeyColor(inner, 0);
      } else {
        class_ = 'text-green-400';
      }
    }

    tokens.push({ type, content: val, colorClass: class_ });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < jsonStr.length) {
    tokens.push({ type: 'plain', content: jsonStr.slice(lastIndex), colorClass: '' });
  }

  const html = tokens.map((t) =>
    t.colorClass
      ? `<span class="${t.colorClass}">${t.content.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
      : `<span>${t.content.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>`
  ).join('');

  return { tokens, html };
}

const JSONNode = ({ keyName, value, path, level, isLast, focusedPath, expandedPaths }: any) => {
  const isComplex = isObject(value);
  const isArray = Array.isArray(value);
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isHighlighted = focusedPath && (focusedPath === path || focusedPath.startsWith(path + '.'));
  const isExactMatch = focusedPath === path;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const indent = level * 16;
  const keyColor = keyName ? getKeyColor(keyName, level) : '';
  const highlightClass = isExactMatch
    ? 'bg-emerald-500/20 border-l-2 border-emerald-500'
    : isHighlighted ? 'bg-white/5' : '';

  return (
    <div ref={isExactMatch ? null : null} className={`${highlightClass ? highlightClass : ''}`}>
      <div
        className={`cursor-pointer ${isExactMatch ? 'bg-emerald-500/15 font-semibold' : ''}`}
        style={{ paddingLeft: indent ? `${indent}px` : '4px' }}
        onClick={isComplex ? handleToggle : undefined}
      >
        <div className="flex items-start group py-0.5 rounded hover:bg-white/5">
          {isComplex && (
            <span className="text-gray-500 mr-1 select-none inline-block w-4 text-center text-[10px]" style={{ fontSize: '9px' }}>
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!isComplex && <span className="w-4 mr-1 inline-block" />}
          {keyName !== null && (
            <span className={`mr-1 ${keyColor}`}>"{keyName}"</span>
          )}
          {!isComplex && (
            <span className={typeof value === 'string' ? 'text-green-400' : typeof value === 'number' ? 'text-orange-400' : typeof value === 'boolean' ? 'text-emerald-400' : 'text-gray-500'}>
              {typeof value === 'string' ? `"${value}"` : value === null ? 'null' : String(value)}
              {!isLast && <span className="text-gray-600">,</span>}
            </span>
          )}
        </div>
      </div>
      {isComplex && isExpanded && (
        Array.isArray(value) ? (
          <span className="text-gray-500" style={{ paddingLeft: `${indent + 20}px` }}>
            [{value.map((v: any, i: number) => (
              <React.Fragment key={i}>
                {typeof v === 'string' ? <><span className="text-green-400">"{v}"</span>{i < value.length - 1 ? <span className="text-gray-500">,</span> : ''}</> : (
                  !isObject(v) ? <><span className={typeof v === 'number' ? 'text-orange-400' : v === null ? 'text-gray-500' : 'text-emerald-400'}>{String(v)}</span>{i < value.length - 1 ? <span className="text-gray-500">,</span> : ''}</> : ''
                )}
                {isObject(v) && (
                  <JSONNode keyName={null} value={v} path={`${path}.${i}`} level={level + 1} isLast={i === value.length - 1} focusedPath={focusedPath} expandedPaths={expandedPaths} />
                )}
              </React.Fragment>
            ))}
          ]</span>
        ) : (
          <div>
            {Object.entries(value).map(([k, v], index, arr) => (
              <JSONNode key={k} keyName={k} value={v} path={path ? `${path}.${k}` : k} level={level + 1} isLast={index === arr.length - 1} focusedPath={focusedPath} expandedPaths={expandedPaths} />
            ))}
            <div className="text-gray-500 flex" style={{ paddingLeft: `${indent + 20}px`, gap: '0' }}>
              <span>{'}'}</span>
              {!isLast && <span className="text-gray-500">,</span>}
            </div>
          </div>
        )
      )}
      {isComplex && !isExpanded && (
        <div className="text-gray-500" style={{ paddingLeft: `${indent + 20}px` }}>
          {isArray ? `[...]` : `{...}`}{!isLast && ','}
        </div>
      )}
    </div>
  );
};

export interface JSONSidebarViewerProps {
  data: any;
  focusedPath: string | null;
  onChange?: (newData: any) => void;
  rainbowHighlight?: boolean;
}

export const JSONSidebarViewer = ({ data, focusedPath, onChange, rainbowHighlight = false }: JSONSidebarViewerProps) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const { highlightedHtml, rawJson } = useMemo(() => {
    const str = JSON.stringify(data, null, 2);
    if (rainbowHighlight) {
      const { html } = tokenizeAndColor(str);
      return { highlightedHtml: html, rawJson: str };
    }
    return { highlightedHtml: '', rawJson: str };
  }, [data, rainbowHighlight]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(jsonText);
      if (JSON.stringify(parsed) === JSON.stringify(data)) return;
    } catch (e) {
      // If currently invalid, allow overwriting
    }
    setJsonText(rawJson);
    setError(null);
  }, [data, rawJson]);

  useEffect(() => {
    setJsonText(rawJson);
    setError(null);
  }, [rawJson]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    try {
      const parsed = JSON.parse(text);
      setError(null);
      if (onChange) onChange(parsed);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0a0a0a]">
      {error && <div className="bg-red-900/50 border-b border-red-500/50 text-red-400 p-2 text-xs font-mono">{error}</div>}
      {rainbowHighlight && !isEditing ? (
        <div
          className="flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed custom-scrollbar cursor-text"
          onClick={() => setIsEditing(true)}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      ) : (
        <textarea
          className="flex-1 w-full bg-transparent outline-none p-4 font-mono text-[11px] leading-relaxed resize-none custom-scrollbar text-gray-300"
          value={jsonText}
          onChange={handleChange}
          onBlur={() => isEditing && setIsEditing(false)}
          onFocus={() => setIsEditing(true)}
          spellCheck={false}
          autoFocus={isEditing}
        />
      )}
      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="absolute top-4 right-4 text-xs text-gray-400 hover:text-gray-200 bg-[#1a1a1a] px-2 py-1 rounded transition-colors z-10"
        >
          Done
        </button>
      )}
    </div>
  );
};
