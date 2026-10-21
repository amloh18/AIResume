'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Shield, Loader2, AlertCircle } from 'lucide-react';

function CashfreeCheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paymentSessionId = searchParams.get('payment_session_id');
  const orderId = searchParams.get('order_id');
  const planKey = searchParams.get('plan_key');

  const [status, setStatus] = useState<'loading' | 'ready' | 'redirecting' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentSessionId) {
      setStatus('error');
      setErrorMessage('Missing payment session ID. Please restart the checkout process.');
      return;
    }

    // Load Cashfree Web SDK
    const existingScript = document.getElementById('cashfree-sdk-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'cashfree-sdk-script';
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.async = true;
      script.onload = () => setStatus('ready');
      script.onerror = () => {
        setStatus('error');
        setErrorMessage('Failed to load secure payment gateway. Please check your connection.');
      };
      document.body.appendChild(script);
    } else {
      setStatus('ready');
    }
  }, [paymentSessionId]);

  useEffect(() => {
    if (status !== 'ready' || !paymentSessionId) return;

    let isMounted = true;

    async function launchCashfree() {
      try {
        let env: 'sandbox' | 'production' = 'sandbox';
        try {
          const res = await fetch('/api/payment/provider');
          if (res.ok) {
            const data = await res.json();
            if (data?.cashfree?.environment === 'production') {
              env = 'production';
            }
          }
        } catch (err) {
          console.warn('Could not determine Cashfree environment from API, defaulting to sandbox:', err);
        }

        if (!isMounted) return;

        if (typeof (window as any).Cashfree !== 'function') {
          setStatus('error');
          setErrorMessage('Cashfree SDK initialization failed.');
          return;
        }

        setStatus('redirecting');
        const cashfree = (window as any).Cashfree({
          mode: env,
        });

        cashfree.checkout({
          paymentSessionId,
          redirectTarget: '_self',
        });
      } catch (err: any) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err.message || 'Error launching payment checkout.');
      }
    }

    launchCashfree();

    return () => {
      isMounted = false;
    };
  }, [status, paymentSessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0c0e0b] px-4">
      <div className="max-w-md w-full bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl text-center">
        {status === 'error' ? (
          <div>
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Checkout Error</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{errorMessage || 'Something went wrong.'}</p>
            <button
              onClick={() => router.push('/dashboard?tab=billing')}
              className="w-full py-2.5 px-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Return to Billing
            </button>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Connecting to Secure Payment</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {status === 'redirecting'
                ? 'Redirecting to payment gateway...'
                : 'Preparing your secure payment session...'}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span>256-bit encrypted checkout</span>
            </div>
            {orderId && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-[11px] text-gray-400">
                Order ID: {orderId}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CashfreeCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0c0e0b]">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        </div>
      }
    >
      <CashfreeCheckoutContent />
    </Suspense>
  );
}
