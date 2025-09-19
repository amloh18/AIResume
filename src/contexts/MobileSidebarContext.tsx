'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileSidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  toggleSidebar: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(undefined);

interface MobileSidebarProviderProps {
  children: ReactNode;
}

export const MobileSidebarProvider: React.FC<MobileSidebarProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(prev => !prev);
  };

  return (
    <MobileSidebarContext.Provider value={{ isOpen, setIsOpen, toggleSidebar }}>
      {children}
    </MobileSidebarContext.Provider>
  );
};

export const useMobileSidebar = () => {
  const context = useContext(MobileSidebarContext);
  if (context === undefined) {
    throw new Error('useMobileSidebar must be used within a MobileSidebarProvider');
  }
  return context;
};
