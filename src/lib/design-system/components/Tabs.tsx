'use client';

import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  defaultTab,
  onChange,
  variant = 'default',
  size = 'md',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || items[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeContent = items.find(item => item.id === activeTab)?.content;

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  const variantStyles = {
    default: `
      bg-[var(--bg-tertiary)] dark:bg-[var(--bg-tertiary)]
      border border-[var(--border-primary)] dark:border-[var(--border-primary)]
      rounded-lg
      text-[var(--text-secondary)] dark:text-gray-400
    `,
    pills: `
      bg-transparent
      rounded-full
      text-[var(--text-secondary)] dark:text-gray-400
    `,
    underline: `
      bg-transparent
      border-b-2 border-transparent
      rounded-none
      text-[var(--text-secondary)] dark:text-gray-400
    `,
  };

  const activeStyles = {
    default: `
      bg-white dark:bg-[var(--bg-secondary)]
      text-[var(--text-primary)] dark:text-white
      shadow-sm
    `,
    pills: `
      bg-[var(--accent-primary)]/20
      text-[var(--accent-primary)] dark:text-[var(--accent-primary)]
    `,
    underline: `
      border-[var(--accent-primary)] text-[var(--accent-primary)]
    `,
  };

  return (
    <div>
      <div
        className={`flex gap-1 ${variant === 'default' ? 'p-1' : variant === 'pills' ? 'gap-2' : 'gap-0'}`}
        role="tablist"
        aria-label="Tabs"
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const isDisabled = item.disabled;

          return (
            <button
              key={item.id}
              onClick={() => !isDisabled && handleTabChange(item.id)}
              disabled={isDisabled}
              className={`
                flex items-center gap-2 font-medium transition-all duration-150
                ${sizeStyles[size]}
                ${variantStyles[variant]}
                ${isActive ? activeStyles[variant] : ''}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'}
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${item.id}`}
              tabIndex={isActive ? 0 : -1}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {items.map((item) => (
          <div
            key={item.id}
            id={`tabpanel-${item.id}`}
            role="tabpanel"
            aria-labelledby={`tab-${item.id}`}
            hidden={activeTab !== item.id}
          >
            {activeTab === item.id && item.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;