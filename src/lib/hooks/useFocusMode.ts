'use client';

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'jobs-focus-mode';

export const useFocusMode = () => {
  const [isFocusMode, setIsFocusMode] = useState<boolean>(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'true') {
        setIsFocusMode(true);
      }
    } catch (error) {
      console.error('Error loading focus mode preference:', error);
    }
    setIsHydrated(true);
  }, []);

  const toggleFocusMode = useCallback(() => {
    setIsFocusMode((prev) => {
      const newValue = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(newValue));
        console.log('Focus mode toggled to:', newValue);
      } catch (error) {
        console.error('Error saving focus mode preference:', error);
      }
      return newValue;
    });
  }, []);

  return {
    isFocusMode,
    toggleFocusMode,
    setIsFocusMode,
    isHydrated
  };
};

