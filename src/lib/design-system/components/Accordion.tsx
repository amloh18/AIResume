'use client';

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
  disabled?: boolean;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
  defaultExpanded?: string[];
  onChange?: (expandedIds: string[]) => void;
}

export const Accordion: React.FC<AccordionProps> = ({
  items,
  allowMultiple = false,
  defaultExpanded = [],
  onChange,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(defaultExpanded));

  const handleToggle = (id: string) => {
    const isExpanded = expandedIds.has(id);
    let newExpanded: Set<string>;

    if (allowMultiple) {
      newExpanded = new Set(expandedIds);
      if (isExpanded) {
        newExpanded.delete(id);
      } else {
        newExpanded.add(id);
      }
    } else {
      newExpanded = isExpanded ? new Set() : new Set([id]);
    }

    setExpandedIds(newExpanded);
    onChange?.(Array.from(newExpanded));
  };

  return (
    <div className="flex flex-col gap-2" role="region" aria-label="Accordion">
      {items.map((item) => {
        const isExpanded = expandedIds.has(item.id);
        
        return (
          <div
            key={item.id}
            className="border border-[var(--border-primary)] dark:border-[var(--border-primary)] rounded-lg overflow-hidden"
          >
            <button
              onClick={() => !item.disabled && handleToggle(item.id)}
              disabled={item.disabled}
              className={`
                w-full flex items-center justify-between px-4 py-3
                bg-white dark:bg-[var(--bg-secondary)]
                text-left text-sm font-medium
                text-[var(--text-primary)] dark:text-white
                transition-colors duration-150
                ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--bg-tertiary)]'}
              `}
              aria-expanded={isExpanded}
              aria-controls={`accordion-content-${item.id}`}
            >
              <span>{item.title}</span>
              <ChevronDown
                size={16}
                className={`text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isExpanded && (
              <div
                id={`accordion-content-${item.id}`}
                className="px-4 py-3 bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)] dark:text-gray-300"
              >
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Accordion;