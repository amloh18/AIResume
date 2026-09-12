'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OptimizedDashboardLayout from '@/components/dashboard/OptimizedDashboardLayout';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import MoriAssistant from '@/components/dashboard/MoriAssistant';
import { useDashboardPrefetch } from '@/lib/hooks/useDashboardPrefetch';

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayoutContent: React.FC<ClientLayoutProps> = ({ children }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  // AUTH-TIME PREFETCH: Begin loading dashboard-critical data immediately
  // when session is available, before any dashboard component mounts.
  // This populates the TanStack Query cache so Dashboard reads from cache
  // instead of triggering fresh requests.
  const { bootstrapData } = useDashboardPrefetch();

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      setSelectedPlanKey(plan);
      setShowPaymentModal(true);

      // Clear the query param
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('plan');
      newParams.delete('returnUrl');
      router.replace(`/dashboard?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  return (
    <OptimizedDashboardLayout bootstrapData={bootstrapData}>
      {children}
      {selectedPlanKey && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          preselectedPlanKey={selectedPlanKey}
          onSuccess={() => setShowPaymentModal(false)}
        />
      )}
      <MoriAssistant />
    </OptimizedDashboardLayout>
  );
};

const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  return (
    <Suspense fallback={<OptimizedDashboardLayout>{children}</OptimizedDashboardLayout>}>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </Suspense>
  );
};

export default ClientLayout;
