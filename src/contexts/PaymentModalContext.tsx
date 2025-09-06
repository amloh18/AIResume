'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import UniversalPaymentModal from '@/components/payment/UniversalPaymentModal';

interface PaymentModalContextType {
  openPaymentModal: (options?: PaymentModalOptions) => void;
  closePaymentModal: () => void;
  isPaymentModalOpen: boolean;
}

interface PaymentModalOptions {
  preselectedPlanKey?: string;
  onSuccess?: (subscription: any) => void;
  returnUrl?: string;
  triggerContext?: string;
}

const PaymentModalContext = createContext<PaymentModalContextType | undefined>(undefined);

export const usePaymentModal = () => {
  const context = useContext(PaymentModalContext);
  if (!context) {
    throw new Error('usePaymentModal must be used within a PaymentModalProvider');
  }
  return context;
};

interface PaymentModalProviderProps {
  children: React.ReactNode;
}

export const PaymentModalProvider: React.FC<PaymentModalProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<PaymentModalOptions>({});

  const openPaymentModal = useCallback((options: PaymentModalOptions = {}) => {
    setModalOptions(options);
    setIsOpen(true);
  }, []);

  const closePaymentModal = useCallback(() => {
    setIsOpen(false);
    setModalOptions({});
  }, []);

  const handleSuccess = useCallback((subscription: any) => {
    modalOptions.onSuccess?.(subscription);
    closePaymentModal();
  }, [modalOptions, closePaymentModal]);

  return (
    <PaymentModalContext.Provider
      value={{
        openPaymentModal,
        closePaymentModal,
        isPaymentModalOpen: isOpen,
      }}
    >
      {children}
      <UniversalPaymentModal
        isOpen={isOpen}
        onClose={closePaymentModal}
        preselectedPlanKey={modalOptions.preselectedPlanKey}
        onSuccess={handleSuccess}
        returnUrl={modalOptions.returnUrl}
        triggerContext={modalOptions.triggerContext}
      />
    </PaymentModalContext.Provider>
  );
};
