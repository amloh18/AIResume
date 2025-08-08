'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Globe,
  Shield
} from 'lucide-react';

interface PricingPlan {
  _id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly' | 'one-time';
  features: {
    maxCVs: number;
    maxExports: number;
    aiAssistant: boolean;
    coverLetterGenerator: boolean;
    jobTracker: boolean;
    communityAccess: boolean;
    prioritySupport: boolean;
    customTemplates: boolean;
    storageLimit: number;
  };
}

interface PaymentFormProps {
  plan: PricingPlan;
  onSuccess: (subscription: any) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ plan, onSuccess, onCancel }) => {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [discountCode, setDiscountCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'razorpay'>('stripe');

  // Determine default payment method based on currency
  useEffect(() => {
    if (plan.currency === 'INR') {
      setPaymentMethod('razorpay');
    } else {
      setPaymentMethod('stripe');
    }
  }, [plan.currency]);

  const handlePayment = async () => {
    if (!session) {
      setError('Please log in to continue');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const response = await fetch('/api/payment/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan._id,
          discountCode: discountCode || undefined,
          paymentMethod
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create payment');
      }

      if (paymentMethod === 'stripe') {
        // Handle Stripe payment
        await handleStripePayment(data);
      } else if (paymentMethod === 'razorpay') {
        // Handle Razorpay payment
        await handleRazorpayPayment(data);
      }

    } catch (error) {
      console.error('Payment error:', error);
      setError(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async (paymentData: any) => {
    // This would integrate with Stripe Elements
    // For now, we'll simulate a successful payment
    console.log('Stripe payment data:', paymentData);
    
    // Simulate payment confirmation
    const confirmResponse = await fetch('/api/payment/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethod: 'stripe',
        paymentIntentId: paymentData.paymentIntentId,
        planId: plan._id,
        discountCodeId: discountApplied?._id
      }),
    });

    const confirmData = await confirmResponse.json();
    
    if (confirmData.success) {
      onSuccess(confirmData.subscription);
    } else {
      throw new Error(confirmData.error || 'Payment confirmation failed');
    }
  };

  const handleRazorpayPayment = async (paymentData: any) => {
    // This would integrate with Razorpay
    // For now, we'll simulate a successful payment
    console.log('Razorpay payment data:', paymentData);
    
    // Simulate payment confirmation
    const confirmResponse = await fetch('/api/payment/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentMethod: 'razorpay',
        orderId: paymentData.orderId,
        paymentId: 'simulated_payment_id',
        signature: 'simulated_signature',
        planId: plan._id,
        discountCodeId: discountApplied?._id
      }),
    });

    const confirmData = await confirmResponse.json();
    
    if (confirmData.success) {
      onSuccess(confirmData.subscription);
    } else {
      throw new Error(confirmData.error || 'Payment confirmation failed');
    }
  };

  const applyDiscountCode = async () => {
    if (!discountCode.trim()) return;

    try {
      const response = await fetch(`/api/payment/validate-discount?code=${discountCode}&planId=${plan._id}`);
      const data = await response.json();

      if (data.success) {
        setDiscountApplied(data.discount);
        setError(null);
      } else {
        setError(data.error || 'Invalid discount code');
        setDiscountApplied(null);
      }
    } catch (error) {
      setError('Failed to validate discount code');
      setDiscountApplied(null);
    }
  };

  const finalPrice = discountApplied 
    ? plan.price - (discountApplied.discountType === 'percentage' 
        ? (plan.price * discountApplied.discountValue / 100) 
        : discountApplied.discountValue)
    : plan.price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Complete Payment
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Subscribe to {plan.name}
        </p>
      </div>

      {/* Plan Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Plan</span>
          <span className="font-medium text-gray-900 dark:text-white">{plan.name}</span>
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Billing</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {plan.currency} {plan.price} / {plan.billingCycle}
          </span>
        </div>
        {discountApplied && (
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Discount</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              -{plan.currency} {discountApplied.discountType === 'percentage' 
                ? (plan.price * discountApplied.discountValue / 100).toFixed(2)
                : discountApplied.discountValue}
            </span>
          </div>
        )}
        <div className="border-t pt-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900 dark:text-white">Total</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {plan.currency} {finalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Discount Code */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Discount Code (Optional)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
            placeholder="Enter discount code"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
          <button
            onClick={applyDiscountCode}
            disabled={!discountCode.trim()}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply
          </button>
        </div>
        {discountApplied && (
          <div className="flex items-center gap-2 mt-2 text-green-600 dark:text-green-400">
            <CheckCircle size={16} />
            <span className="text-sm">Discount applied!</span>
          </div>
        )}
      </div>

      {/* Payment Method Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Payment Method
        </label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
            <input
              type="radio"
              value="stripe"
              checked={paymentMethod === 'stripe'}
              onChange={(e) => setPaymentMethod(e.target.value as 'stripe')}
              className="text-blue-600 focus:ring-blue-500"
            />
            <Globe size={20} className="text-blue-600" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Credit/Debit Card</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Visa, Mastercard, American Express</div>
            </div>
          </label>
          {plan.currency === 'INR' && (
            <label className="flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              <input
                type="radio"
                value="razorpay"
                checked={paymentMethod === 'razorpay'}
                onChange={(e) => setPaymentMethod(e.target.value as 'razorpay')}
                className="text-blue-600 focus:ring-blue-500"
              />
              <Shield size={20} className="text-purple-600" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Razorpay</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">UPI, Net Banking, Wallets</div>
              </div>
            </label>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md mb-6">
          <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          onClick={handlePayment}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard size={16} />
              Pay {plan.currency} {finalPrice.toFixed(2)}
            </>
          )}
        </button>
      </div>

      {/* Security Notice */}
      <div className="mt-4 text-center">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Shield size={12} />
          <span>Your payment is secure and encrypted</span>
        </div>
      </div>
    </motion.div>
  );
};

export default PaymentForm;
