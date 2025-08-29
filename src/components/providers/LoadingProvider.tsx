'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingAnimation from '@/components/ui/LoadingAnimation';

interface LoadingContextType {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

// Memoized LoadingAnimation component for better performance
const MemoizedLoadingAnimation = React.memo(LoadingAnimation);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = React.memo(({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const pathname = usePathname();

  // Optimized loading handler with useCallback
  const handleRouteChange = useCallback(() => {
    setIsLoading(true);
    setProgress(0);
    
    // Faster, more efficient loading progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 0.95) {
          clearInterval(interval);
          return 0.95;
        }
        return prev + 0.15; // Faster progress increments
      });
    }, 50); // Faster interval

    // Complete loading much faster
    setTimeout(() => {
      setProgress(1);
      setTimeout(() => {
        setIsLoading(false);
        setProgress(0);
      }, 200); // Reduced delay
    }, 400); // Reduced total loading time

    return () => clearInterval(interval);
  }, []);

  // Handle route changes with optimized loading
  useEffect(() => {
    handleRouteChange();
  }, [pathname, handleRouteChange]);

  // Optimized setLoading function
  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
    if (!loading) {
      setProgress(0);
    }
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    isLoading,
    setLoading,
    progress,
    setProgress
  }), [isLoading, setLoading, progress]);

  return (
    <LoadingContext.Provider value={contextValue}>
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            className="fixed inset-0 z-[9999]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }} // Faster transition
          >
            <MemoizedLoadingAnimation progress={progress} showProgressBar={false} />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </LoadingContext.Provider>
  );
});

LoadingProvider.displayName = 'LoadingProvider';

