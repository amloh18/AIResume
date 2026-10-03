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
    // The console monkey-patch is a development aid (toast/inline surfacing of
    // console messages). Never patch console in production: it adds a heavy
    // JSON.stringify pass to every console call in the client bundle.
    if (process.env.NODE_ENV === 'production') {
      // isInitialized already defaults to false — skip the patch entirely.
      return;
    }

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

    // Flush the initialized flag after mount so the effect never sets state
    // synchronously (avoids cascading renders).
    const markInitialized = setTimeout(() => setIsInitialized(true), 0);

    // Cleanup on unmount
    return () => {
      clearTimeout(markInitialized);
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
