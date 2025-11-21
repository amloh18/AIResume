'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface KanbanSwimlaneProps {
  title: string;
  value: string;
  count: number;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  color?: string;
}

const KanbanSwimlane: React.FC<KanbanSwimlaneProps> = ({
  title,
  value,
  count,
  isExpanded,
  onToggle,
  children,
  color = 'bg-gray-50 dark:bg-gray-900/50'
}) => {
  return (
    <div className={`mb-6 rounded-lg border border-gray-200 dark:border-gray-700 ${color}`}>
      {/* Swimlane Header */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-t-lg"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">({count})</span>
        </div>
      </div>

      {/* Swimlane Content */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="p-4">
            {children}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default KanbanSwimlane;

