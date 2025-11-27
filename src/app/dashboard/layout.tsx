'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import OptimizedDashboardLayout from '@/components/dashboard/OptimizedDashboardLayout';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState<string | null>(null);

  useEffect(() => {
    const plan = searchParams.get('plan');
    if (plan) {
      setSelectedPlanKey(plan);
      setShowPaymentModal(true);

      // Clear the query param
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete('plan');
      newParams.delete('returnUrl'); // Also clear returnUrl if present
      router.replace(`/dashboard?${newParams.toString()}`);
    }
  }, [searchParams, router]);

  return (
    <OptimizedDashboardLayout>
      {children}
      {selectedPlanKey && (
        <UniversalPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          preselectedPlanKey={selectedPlanKey}
          onSuccess={() => setShowPaymentModal(false)}
        />
      )}
    </OptimizedDashboardLayout>
  );
};

export default DashboardLayout;