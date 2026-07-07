'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OptimizedDashboardLayout from '@/components/dashboard/OptimizedDashboardLayout';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';
import MoriAssistant from '@/components/dashboard/MoriAssistant';

interface ClientLayoutProps {
  children: React.ReactNode;
  session?: any;
}

const ClientLayoutContent: React.FC<ClientLayoutProps> = ({ children, session }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      setSelectedPlanKey(plan);
      setShowPaymentModal(true);

      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('plan');
      newParams.delete('returnUrl');
      router.replace(`/dashboard?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  return (
    <OptimizedDashboardLayout sessionFromServer={session}>
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

const ClientLayout: React.FC<ClientLayoutProps> = ({ children, session }) => {
  return (
    <Suspense fallback={<OptimizedDashboardLayout sessionFromServer={session}>{children}</OptimizedDashboardLayout>}>
      <ClientLayoutContent session={session}>{children}</ClientLayoutContent>
    </Suspense>
  );
};

export default ClientLayout;
