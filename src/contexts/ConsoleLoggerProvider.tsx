'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { consoleLogger, ConsoleLogEntry, useConsoleLogger, useInlineMessages } from '@/lib/utils/consoleLogger';

interface ConsoleLoggerContextType {
  isInitialized: boolean;
  messages: ConsoleLogEntry[];
  clearMessages: () => void;
}

const ConsoleLoggerContext = createContext<ConsoleLoggerContextType | undefined>(undefined);

export const useConsoleLoggerContext = () => {
  const context = useContext(ConsoleLoggerContext);
  if (!context) {
    throw new Error('useConsoleLoggerContext must be used within a ConsoleLoggerProvider');
  }
  return context;
};

interface ConsoleLoggerProviderProps {
  children: React.ReactNode;
}

export const ConsoleLoggerProvider: React.FC<ConsoleLoggerProviderProps> = ({ children }) => {
  const router = useRouter();
  const [isInitialized, setIsInitialized] = useState(false);
  const { showToastNotification } = useConsoleLogger();
  const { messages, addInlineMessage, clearMessages } = useInlineMessages();

  useEffect(() => {
    // Initialize console logger
    consoleLogger.initialize(
      // Toast notification callback for dashboard/studio pages
      (entry: ConsoleLogEntry) => {
        showToastNotification(entry);
      },
      // Inline message callback for auth pages
      (entry: ConsoleLogEntry) => {
        addInlineMessage(entry);
      }
    );

    setIsInitialized(true);

    // Cleanup on unmount
    return () => {
      consoleLogger.restore();
    };
  }, [showToastNotification, addInlineMessage]);

  const contextValue: ConsoleLoggerContextType = {
    isInitialized,
    messages,
    clearMessages,
  };

  return (
    <ConsoleLoggerContext.Provider value={contextValue}>
      {children}
    </ConsoleLoggerContext.Provider>
  );
};
