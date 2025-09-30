'use client';

import React from 'react';
import OptimizedDashboardLayout from '@/components/dashboard/OptimizedDashboardLayout';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return <OptimizedDashboardLayout>{children}</OptimizedDashboardLayout>;
};

export default DashboardLayout;