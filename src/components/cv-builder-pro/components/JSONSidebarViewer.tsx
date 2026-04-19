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

export const JSONSidebarViewer = ({ data, focusedPath }: { data: any, focusedPath: string | null }) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (focusedPath) {
      const parts = focusedPath.split('.');
      const pathsToExpand = new Set<string>();
      let currentPath = '';
      
      parts.forEach(part => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        pathsToExpand.add(currentPath);
      });
      
      setExpandedPaths(pathsToExpand);
    } else {
      setExpandedPaths(new Set());
    }
  }, [focusedPath]);

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar p-4 bg-[#0a0a0a] text-gray-300">
      <div className="text-gray-500 mb-1">{'{'}</div>
      {Object.entries(data).map(([k, v], index, arr) => (
        <JSONNode 
          key={k}
          keyName={k}
          value={v}
          path={k}
          level={1}
          isLast={index === arr.length - 1}
          focusedPath={focusedPath}
          expandedPaths={expandedPaths}
        />
      ))}
      <div className="text-gray-500 mt-1">{'}'}</div>
    </div>
  );
};
