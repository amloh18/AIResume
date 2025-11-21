'use client';

import { useState, useEffect, useCallback } from 'react';

interface ViewPreferences {
  mode: 'kanban' | 'list';
  zoomedStage?: string | null;
  filterStatus?: string;
  sortBy?: 'lastUpdated' | 'followUpDate' | 'salaryRange' | 'priority';
  lastUpdatedFilter?: 'today' | 'last7days' | 'last30days' | 'all';
  followUpFilter?: 'upcoming' | 'overdue' | 'all';
  salaryRangeFilter?: 'all' | 'under50k' | '50k-75k' | '75k-100k' | '100k-150k' | '150k-200k' | 'over200k';
  priorityFilter?: 'high' | 'medium' | 'low' | 'all';
}

const STORAGE_KEY = 'jobs-view-preferences';

export const useJobsPersistence = () => {
  const [preferences, setPreferences] = useState<ViewPreferences>(() => {
    if (typeof window === 'undefined') {
      return {
        mode: 'kanban',
        filterStatus: 'all',
        sortBy: 'lastUpdated',
        lastUpdatedFilter: 'all',
        followUpFilter: 'all',
        salaryRangeFilter: 'all',
        priorityFilter: 'all'
      };
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }

    return {
      mode: 'kanban',
      filterStatus: 'all',
      sortBy: 'lastUpdated',
      lastUpdatedFilter: 'all',
      followUpFilter: 'all',
      salaryRangeFilter: 'all',
      priorityFilter: 'all'
    };
  });

  const savePreferences = useCallback((newPreferences: Partial<ViewPreferences>) => {
    // Use functional update to avoid dependency on preferences
    setPreferences((prevPreferences) => {
      const updated = { ...prevPreferences, ...newPreferences };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving preferences:', error);
      }
      
      return updated;
    });
  }, []); // No dependencies needed since we use functional update

  const clearPreferences = useCallback(() => {
    const defaultPrefs: ViewPreferences = {
      mode: 'kanban',
      filterStatus: 'all',
      sortBy: 'lastUpdated',
      lastUpdatedFilter: 'all',
      followUpFilter: 'all',
      salaryRangeFilter: 'all',
      priorityFilter: 'all'
    };
    setPreferences(defaultPrefs);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPrefs));
    } catch (error) {
      console.error('Error clearing preferences:', error);
    }
  }, []);

  return {
    preferences,
    savePreferences,
    clearPreferences
  };
};

