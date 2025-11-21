'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'jobs-focus-mode';

export const useFocusMode = () => {
  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    } catch (error) {
      console.error('Error loading focus mode preference:', error);
      return false;
    }
  });

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
      } catch (error) {
        console.error('Error saving focus mode preference:', error);
      }
      return newValue;
    });
  }, []);

  return {
    isFocusMode,
    toggleFocusMode,
    setIsFocusMode
  };
};

