'use client';

import React, { useState, useEffect, useRef } from 'react';

const isObject = (value: any) => value !== null && typeof value === 'object';

const JSONNode = ({ keyName, value, path, level, isLast, focusedPath, expandedPaths }: any) => {
  const isComplex = isObject(value);
  const isArray = Array.isArray(value);
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const isHighlighted = focusedPath && (focusedPath === path || focusedPath.startsWith(path + '.'));
  const isExactMatch = focusedPath === path;
  
  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expandedPaths && expandedPaths.has(path)) {
      setIsExpanded(true);
    } else if (expandedPaths && expandedPaths.size === 0) {
      setIsExpanded(level < 2);
    }
  }, [expandedPaths, path, level]);

  useEffect(() => {
    if (isExactMatch && nodeRef.current) {
      setTimeout(() => {
        nodeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isExactMatch]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const indent = level * 16;
  const highlightClass = isExactMatch 
    ? 'bg-emerald-500/20 border-l-2 border-emerald-500' 
    : isHighlighted ? 'bg-white/5' : '';

  return (
    <div ref={nodeRef} className={`font-mono text-xs leading-relaxed ${highlightClass}`} style={{ paddingLeft: indent ? `${indent}px` : '4px' }}>
      <div 
        className={`flex items-start group cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded transition-colors ${isExactMatch ? 'text-emerald-400 font-bold' : ''}`}
        onClick={isComplex ? handleToggle : undefined}
      >
        {isComplex && (
          <span className="text-gray-500 mr-1 select-none inline-block w-4 text-center">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
        {!isComplex && <span className="w-4 mr-1 inline-block" />}
        
        {keyName !== null && (
          <span className="text-blue-400 mr-1">"{keyName}":</span>
        )}

        {!isComplex && (
          <span className={typeof value === 'string' ? 'text-green-400' : 'text-orange-400'}>
            {typeof value === 'string' ? `"${value}"` : String(value)}
            {!isLast && <span className="text-gray-500">,</span>}
          </span>
        )}

        {isComplex && !isExpanded && (
          <span className="text-gray-500">
            {isArray ? '[...]' : '{...}'}
            {!isLast && ','}
          </span>
        )}

        {isComplex && isExpanded && (
          <span className="text-gray-500">{isArray ? '[' : '{'}</span>
        )}
      </div>

      {isComplex && isExpanded && (
        <div className="flex flex-col">
          {Object.entries(value).map(([k, v], index, arr) => (
            <JSONNode 
              key={k}
              keyName={isArray ? null : k}
              value={v}
              path={path ? `${path}.${k}` : k}
              level={level + 1}
              isLast={index === arr.length - 1}
              focusedPath={focusedPath}
              expandedPaths={expandedPaths}
            />
          ))}
          <div className="text-gray-500 px-1" style={{ paddingLeft: '20px' }}>
            {isArray ? ']' : '}'}
            {!isLast && ','}
          </div>
        </div>
      )}
    </div>
  );
};

export const JSONSidebarViewer = ({ data, focusedPath, onChange }: { data: any, focusedPath: string | null, onChange?: (newData: any) => void }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only update the local text if it successfully parses to the same data (prevents cursor jumping)
    try {
      const parsed = JSON.parse(jsonText);
      if (JSON.stringify(parsed) === JSON.stringify(data)) return;
    } catch (e) {
      // If currently invalid, ignore data updates? Or overwrite? 
      // Overwrite if external changes happen.
    }
    setJsonText(JSON.stringify(data, null, 2));
    setError(null);
  }, [data]);

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
    <div className="w-full h-full flex flex-col bg-[#0a0a0a] text-gray-300">
      {error && <div className="bg-red-900/50 border-b border-red-500/50 text-red-400 p-2 text-xs font-mono">{error}</div>}
      <textarea
        className="flex-1 w-full bg-transparent outline-none p-4 font-mono text-[11px] leading-relaxed resize-none custom-scrollbar"
        value={jsonText}
        onChange={handleChange}
        spellCheck={false}
      />
    </div>
  );
};
