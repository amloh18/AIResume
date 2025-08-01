'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Save, 
  CheckCircle, 
  AlertCircle,
  Clock
} from 'lucide-react';

interface AutoSaveIndicatorProps {
  status: 'saved' | 'saving' | 'error' | 'unsaved';
  lastSaved?: Date;
}

const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSaved
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'All changes saved',
          pulse: false
        };
      case 'saving':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Saving...',
          pulse: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Save failed',
          pulse: false
        };
      case 'unsaved':
        return {
          icon: Save,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          text: 'Unsaved changes',
          pulse: true
        };
      default:
        return {
          icon: Save,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Ready',
          pulse: false
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  return (
    <AnimatePresence>
      <motion.div
        className={`fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg border ${config.bgColor} ${config.borderColor} shadow-lg backdrop-blur-sm`}
        initial={{ opacity: 0, y: 20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.9 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="flex items-center gap-2">
          <div className={`relative ${config.pulse ? 'animate-pulse' : ''}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="flex flex-col">
            <span className={`text-sm font-medium ${config.color}`}>
              {config.text}
            </span>
            {lastSaved && status === 'saved' && (
              <span className="text-xs text-gray-500">
                Last saved {formatLastSaved(lastSaved)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AutoSaveIndicator; 