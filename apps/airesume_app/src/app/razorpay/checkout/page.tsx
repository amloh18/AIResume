'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { X, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

function RazorpayCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const subscriptionId = searchParams.get('subscription_id');
  const planKey = searchParams.get('plan_key');
  const billingCycle = searchParams.get('billing_cycle');

  const [status, setStatus] = useState<'loading' | 'ready' | 'processing' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subscriptionId) {
      setStatus('error');
      setError('Missing subscription ID');
      return;
    }

    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => setStatus('ready');
    script.onerror = () => {
      setStatus('error');
      setError('Failed to load Razorpay checkout');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [subscriptionId]);

  useEffect(() => {
    if (status !== 'ready' || !subscriptionId) return;

    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      setStatus('error');
      setError('Razorpay is not configured');
      return;
    }

    // Auto-open Razorpay checkout
    const rzp = new (window as any).Razorpay({
      key: razorpayKey,
      subscription_id: subscriptionId,
      name: 'BuildAIResume',
      description: `Subscription: ${planKey}`,
      handler: function (response: any) {
        setStatus('success');
        setTimeout(() => {
          const baseUrl = window.location.origin;
          router.push(`${baseUrl}/dashboard/settings?tab=billing&success=true`);
        }, 2000);
      },
      prefill: {},
      theme: {
        color: '#013f2e',
      },
      modal: {
        ondismiss: function () {
          setStatus('ready');
        },
      },
    });

    rzp.on('payment.failed', function (response: any) {
      setStatus('error');
      setError(response.error?.description || 'Payment failed');
    });

    rzp.open();
  }, [status, subscriptionId, planKey, billingCycle, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#013f2e] mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">Loading payment gateway...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md mx-auto text-center p-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Payment Error</h1>
          <p className="text-sm text-gray-500 mb-6">{error || 'Something went wrong'}</p>
          <button
            onClick={() => router.push('/dashboard/settings?tab=billing')}
            className="px-6 py-2 bg-[#013f2e] text-white rounded-lg text-sm font-medium hover:bg-[#02523c]"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="max-w-md mx-auto text-center p-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h1>
          <p className="text-sm text-gray-500 mb-6">Your subscription has been activated. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="max-w-md mx-auto text-center p-8">
        <CreditCard className="w-12 h-12 text-[#013f2e] mx-auto mb-4" />
        <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Complete Payment</h1>
        <p className="text-sm text-gray-500 mb-6">The payment window should open automatically.</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-[#013f2e] text-white rounded-lg text-sm font-medium hover:bg-[#02523c]"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default function RazorpayCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#013f2e]"></div>
      </div>
    }>
      <RazorpayCheckoutContent />
    </Suspense>
  );
}
