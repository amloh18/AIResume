'use client';

import { Phase4TestPage } from '@/components/test/TestPhase4Components';
import { DashboardDataProvider } from '@/contexts/DashboardDataContext';

/**
 * Phase 4 Test Page
 * 
 * Access at: /test/phase4
 * 
 * This page provides interactive test components for:
 * - Dashboard race condition fixes
 * - Studio conflict resolution
 * - Enhanced error boundaries
 */
export default function Phase4TestPageRoute() {
  return (
    <DashboardDataProvider>
      <Phase4TestPage />
    </DashboardDataProvider>
  );
}

