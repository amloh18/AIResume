'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { ProgressToast, ProgressToastData } from './ProgressToast';

interface ProgressToastContextType {
  addToast: (toast: Omit<ProgressToastData, 'id'>) => string;
  updateToast: (id: string, updates: Partial<ProgressToastData>) => void;
  removeToast: (id: string) => void;
  // Convenience methods
  success: (title: string, description?: string, options?: Partial<ProgressToastData>) => string;
  error: (title: string, description?: string, options?: Partial<ProgressToastData>) => string;
  warning: (title: string, description?: string, options?: Partial<ProgressToastData>) => string;
  info: (title: string, description?: string, options?: Partial<ProgressToastData>) => string;
  progress: (title: string, progress: number, description?: string, options?: Partial<ProgressToastData>) => string;
}

const ProgressToastContext = createContext<ProgressToastContextType | null>(null);

export function useProgressToast() {
  const context = useContext(ProgressToastContext);
  if (!context) {
    throw new Error('useProgressToast must be used within ProgressToastProvider');
  }
  return context;
}

export function ProgressToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ProgressToastData[]>([]);

  const addToast = useCallback((toast: Omit<ProgressToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newToast: ProgressToastData = {
      duration: toast.variant === 'progress' ? 10000 : 5000,
      showTimer: true,
      ...toast,
      id,
    };
    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ProgressToastData>) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback(
    (title: string, description?: string, options?: Partial<ProgressToastData>) =>
      addToast({ variant: 'success', title, description, ...options }),
    [addToast]
  );

  const error = useCallback(
    (title: string, description?: string, options?: Partial<ProgressToastData>) =>
      addToast({ variant: 'error', title, description, duration: 8000, ...options }),
    [addToast]
  );

  const warning = useCallback(
    (title: string, description?: string, options?: Partial<ProgressToastData>) =>
      addToast({ variant: 'warning', title, description, duration: 6000, ...options }),
    [addToast]
  );

  const info = useCallback(
    (title: string, description?: string, options?: Partial<ProgressToastData>) =>
      addToast({ variant: 'info', title, description, ...options }),
    [addToast]
  );

  const progress = useCallback(
    (title: string, progress: number, description?: string, options?: Partial<ProgressToastData>) =>
      addToast({ variant: 'progress', title, description, progress, showTimer: false, ...options }),
    [addToast]
  );

  return (
    <ProgressToastContext.Provider
      value={{ addToast, updateToast, removeToast, success, error, warning, info, progress }}
    >
      {children}

      {/* Toast container - bottom right */}
      <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-3 max-h-screen overflow-hidden pointer-events-none">
        {toasts.map((toast) => (
          <ProgressToast
            key={toast.id}
            {...toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
    </ProgressToastContext.Provider>
  );
}
