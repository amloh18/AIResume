'use client';

import React from 'react';
import { Crown, Zap, Star, ArrowRight } from 'lucide-react';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

interface PaymentTriggerProps {
  variant?: 'button' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
  preselectedPlanKey?: string;
  triggerContext?: string;
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
  showArrow?: boolean;
}

const PaymentTrigger: React.FC<PaymentTriggerProps> = ({
  variant = 'button',
  size = 'md',
  preselectedPlanKey,
  triggerContext,
  className = '',
  children,
  showIcon = true,
  showArrow = false
}) => {
  const { openPaymentModal } = usePaymentModal();

  const handleClick = () => {
    openPaymentModal({
      preselectedPlanKey,
      triggerContext,
      returnUrl: window.location.href
    });
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-6 h-6';
      default:
        return 'w-5 h-5';
    }
  };

  const getIcon = () => {
    if (preselectedPlanKey === 'day_pass') return <Zap className={getIconSize()} />;
    if (preselectedPlanKey?.includes('pro')) return <Crown className={getIconSize()} />;
    return <Star className={getIconSize()} />;
  };

  if (variant === 'card') {
    return (
      <div
        onClick={handleClick}
        className={`bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl ${className}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Upgrade to Pro</h3>
            <p className="text-blue-100 mb-4">
              Unlock unlimited CVs, advanced AI features, and premium templates
            </p>
            <div className="flex items-center text-blue-100">
              <span className="text-sm">Start your free trial</span>
              {showArrow && <ArrowRight className="w-4 h-4 ml-2" />}
            </div>
          </div>
          {showIcon && (
            <div className="text-blue-200">
              {getIcon()}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleClick}
        className={`inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors ${className}`}
      >
        {showIcon && <span className="mr-1">{getIcon()}</span>}
        {children || 'Upgrade'}
        {showArrow && <ArrowRight className="w-4 h-4 ml-1" />}
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-md hover:shadow-lg ${getSizeClasses()} ${className}`}
    >
      {showIcon && <span className="mr-2">{getIcon()}</span>}
      {children || 'Upgrade to Pro'}
      {showArrow && <ArrowRight className="w-4 h-4 ml-2" />}
    </button>
  );
};

export default PaymentTrigger;
