// @ts-nocheck
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ParserType = 'taleo' | 'greenhouse' | 'lever' | 'generic';

export type ActiveLayer = 'reading-path' | 'timeline' | 'heatmap' | null;

export interface ATSDeepDiveState {
  isActive: boolean;
  activeLayers: Set<ActiveLayer>;
  selectedParser: ParserType;
  showCriticalOnly: boolean; // Triage mode - only show critical issues
  selectedFactor: string | null; // Currently selected factor for filtering
}

interface ATSDeepDiveContextType {
  state: ATSDeepDiveState;
  activateDeepDive: () => void;
  deactivateDeepDive: () => void;
  toggleLayer: (layer: ActiveLayer) => void;
  setParser: (parser: ParserType) => void;
  toggleCriticalOnly: () => void;
  selectFactor: (factor: string | null) => void;
  isLayerActive: (layer: ActiveLayer) => boolean;
}

const initialState: ATSDeepDiveState = {
  isActive: false,
  activeLayers: new Set(['timeline']), // Default to timeline view
  selectedParser: 'generic',
  showCriticalOnly: true, // Start with critical issues only
  selectedFactor: null,
};

const ATSDeepDiveContext = createContext<ATSDeepDiveContextType | undefined>(undefined);

export const useATSDeepDive = () => {
  const context = useContext(ATSDeepDiveContext);
  if (context === undefined) {
    throw new Error('useATSDeepDive must be used within an ATSDeepDiveProvider');
  }
  return context;
};

interface ATSDeepDiveProviderProps {
  children: ReactNode;
}

export const ATSDeepDiveProvider: React.FC<ATSDeepDiveProviderProps> = ({ children }) => {
  const [state, setState] = useState<ATSDeepDiveState>(initialState);

  const activateDeepDive = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: true,
    }));
  }, []);

  const deactivateDeepDive = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isActive: false,
      activeLayers: new Set(['timeline']), // Reset to default
      selectedFactor: null,
    }));
  }, []);

  const toggleLayer = useCallback((layer: ActiveLayer) => {
    setState((prev) => {
      const newLayers = new Set(prev.activeLayers);
      if (layer === null) {
        newLayers.clear();
      } else if (newLayers.has(layer)) {
        newLayers.delete(layer);
      } else {
        newLayers.add(layer);
      }
      return {
        ...prev,
        activeLayers: newLayers,
      };
    });
  }, []);

  const setParser = useCallback((parser: ParserType) => {
    setState((prev) => ({
      ...prev,
      selectedParser: parser,
    }));
  }, []);

  const toggleCriticalOnly = useCallback(() => {
    setState((prev) => ({
      ...prev,
      showCriticalOnly: !prev.showCriticalOnly,
    }));
  }, []);

  const selectFactor = useCallback((factor: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedFactor: factor,
    }));
  }, []);

  const isLayerActive = useCallback(
    (layer: ActiveLayer) => {
      return state.activeLayers.has(layer);
    },
    [state.activeLayers]
  );

  const value: ATSDeepDiveContextType = {
    state,
    activateDeepDive,
    deactivateDeepDive,
    toggleLayer,
    setParser,
    toggleCriticalOnly,
    selectFactor,
    isLayerActive,
  };

  return <ATSDeepDiveContext.Provider value={value}>{children}</ATSDeepDiveContext.Provider>;
};

