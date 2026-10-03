'use client';

import React from 'react';

/**
 * Lightweight markdown renderer for Mori chat responses.
 * Handles: bold, italic, bullet points, line breaks, links, code.
 * No external dependencies — safe, fast, and minimal.
 */

interface MoriMarkdownProps {
  content: string;
  className?: string;
}

function parseInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Match bold, italic, inline code, and links
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      nodes.push(<strong key={match.index} className="font-bold">{match[2]}</strong>);
    } else if (match[4]) {
      // Italic
      nodes.push(<em key={match.index} className="italic">{match[4]}</em>);
    } else if (match[6]) {
      // Inline code
      nodes.push(
        <code key={match.index} className="px-1 py-0.5 bg-black/5 dark:bg-white/10 rounded text-[0.9em] font-mono">
          {match[6]}
        </code>
      );
    } else if (match[8] && match[9]) {
      // Link
      nodes.push(
        <a
          key={match.index}
          href={match[9]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          {match[8]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : [text];
}

export default function MoriMarkdown({ content, className = '' }: MoriMarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' | null = null;

  const flushList = () => {
    if (currentList.length > 0 && listType) {
      const Tag = listType;
      elements.push(
        <Tag
          key={`list-${elements.length}`}
          className={`${listType === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1 my-1`}
        >
          {currentList}
        </Tag>
      );
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trimStart();

    // Unordered list item
    if (/^[-*]\s+/.test(trimmed)) {
      flushList();
      listType = 'ul';
      const itemText = trimmed.replace(/^[-*]\s+/, '');
      currentList.push(
        <li key={idx} className="text-[13px] leading-relaxed">
          {parseInline(itemText)}
        </li>
      );
      return;
    }

    // Ordered list item
    if (/^\d+\.\s+/.test(trimmed)) {
      flushList();
      listType = 'ol';
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      currentList.push(
        <li key={idx} className="text-[13px] leading-relaxed">
          {parseInline(itemText)}
        </li>
      );
      return;
    }

    // Empty line
    if (trimmed === '') {
      flushList();
      // Don't add extra spacing at the very start or end
      if (idx > 0 && idx < lines.length - 1) {
        elements.push(<div key={idx} className="h-2" />);
      }
      return;
    }

    // Regular paragraph text
    flushList();
    elements.push(
      <p key={idx} className="text-[13px] leading-relaxed my-0.5">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList();

  return (
    <div className={`space-y-0 ${className}`}>
      {elements}
    </div>
  );
}
