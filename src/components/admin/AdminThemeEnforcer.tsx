'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from '@/lib/contexts/ThemeContext';

export default function AdminThemeEnforcer({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const initialTheme = useRef(theme);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.classList.add('admin-shell');

    return () => {
      document.documentElement.classList.remove('admin-shell');
      if (initialTheme.current === 'dark') {
        document.documentElement.classList.add('dark');
      }
    };
  }, []);

  return children;
}

