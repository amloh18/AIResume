'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, AlertCircle, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { ConsoleLogEntry } from '@/lib/utils/consoleLogger';

interface InlineMessagesProps {
  messages: ConsoleLogEntry[];
  onClear?: () => void;
  className?: string;
}

const InlineMessages: React.FC<InlineMessagesProps> = ({ 
  messages, 
  onClear, 
  className = '' 
}) => {
  const [visibleMessages, setVisibleMessages] = useState<ConsoleLogEntry[]>([]);

  useEffect(() => {
    setVisibleMessages(messages.slice(0, 3)); // Show max 3 messages
  }, [messages]);

  const getIcon = (level: ConsoleLogEntry['level']) => {
    switch (level) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBackgroundColor = (level: ConsoleLogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warn':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (visibleMessages.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <AnimatePresence>
        {visibleMessages.map((message, index) => (
          <motion.div
            key={`${message.timestamp.getTime()}-${index}`}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, delay: index * 0.1 }}
            className={`p-3 rounded-none border-l-4 ${getBackgroundColor(message.level)}`}
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-3">
                {getIcon(message.level)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    {message.level === 'error' ? 'Error' : 
                     message.level === 'warn' ? 'Warning' : 
                     message.level === 'info' ? 'Information' : 'Debug'}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {formatTime(message.timestamp)}
                    </span>
                    <button
                      onClick={() => {
                        setVisibleMessages(prev => prev.filter((_, i) => i !== index));
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <p className="text-sm mt-1 break-words">
                  {message.message}
                </p>
                {message.data && message.data.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
                      Additional data
                    </summary>
                    <pre className="text-xs text-gray-600 mt-1 p-2 bg-gray-100 rounded overflow-x-auto">
                      {JSON.stringify(message.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      
      {messages.length > 3 && (
        <div className="text-center">
          <button
            onClick={onClear}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear all messages
          </button>
        </div>
      )}
    </div>
  );
};

export default InlineMessages;
