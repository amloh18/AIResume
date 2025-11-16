'use client';

/**
 * Test Components for Phase 2 Features
 * 
 * These components can be used to test Phase 2 implementations:
 * - Payment provider health checks
 * - Credit sync polling
 * - useCredits hook
 * - useUsageLimits enhancements
 */

import React, { useState, useEffect } from 'react';
import { useUsageLimits } from '@/lib/hooks/useUsageLimits';
import { useCredits } from '@/lib/hooks/useCredits';

/**
 * Test Component: Payment Provider Health Status
 */
export function TestProviderHealth() {
  const [stripeHealth, setStripeHealth] = useState<boolean | null>(null);
  const [razorpayHealth, setRazorpayHealth] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const [stripeRes, razorpayRes] = await Promise.all([
        fetch('/api/payment/stripe/health'),
        fetch('/api/payment/razorpay/health')
      ]);

      const stripeData = await stripeRes.json();
      const razorpayData = await razorpayRes.json();

      setStripeHealth(stripeData.healthy);
      setRazorpayHealth(razorpayData.healthy);
    } catch (error) {
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">Payment Provider Health</h3>
      <button
        onClick={checkHealth}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Checking...' : 'Check Health'}
      </button>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span>Stripe:</span>
          {stripeHealth === null ? (
            <span className="text-gray-500">Unknown</span>
          ) : stripeHealth ? (
            <span className="text-green-500">✓ Healthy</span>
          ) : (
            <span className="text-red-500">✗ Unhealthy</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span>Razorpay:</span>
          {razorpayHealth === null ? (
            <span className="text-gray-500">Unknown</span>
          ) : razorpayHealth ? (
            <span className="text-green-500">✓ Healthy</span>
          ) : (
            <span className="text-red-500">✗ Unhealthy</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Test Component: useUsageLimits with Polling
 */
export function TestUsageLimitsPolling() {
  const {
    usageLimits,
    credits,
    timeAccess,
    loading,
    error,
    fetchUsageLimits
  } = useUsageLimits();

  const [pollCount, setPollCount] = useState(0);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  useEffect(() => {
    if (usageLimits) {
      setPollCount(prev => prev + 1);
      setLastFetch(new Date());
    }
  }, [usageLimits]);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">useUsageLimits Hook Test</h3>
      
      <div className="mb-4">
        <button
          onClick={fetchUsageLimits}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Manual Refresh
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Status:</strong>{' '}
          {loading ? 'Loading...' : error ? `Error: ${error}` : 'Ready'}
        </div>
        <div>
          <strong>Poll Count:</strong> {pollCount}
        </div>
        <div>
          <strong>Last Fetch:</strong>{' '}
          {lastFetch ? lastFetch.toLocaleTimeString() : 'Never'}
        </div>
        
        {usageLimits && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <strong>Usage Limits:</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(usageLimits, null, 2)}
            </pre>
          </div>
        )}

        {credits && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>Credits:</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(credits, null, 2)}
            </pre>
          </div>
        )}

        {timeAccess && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>Time Access:</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(timeAccess, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Polling should occur every 30 seconds when tab is visible.</p>
        <p>💡 Check Network tab to verify polling behavior.</p>
      </div>
    </div>
  );
}

/**
 * Test Component: useCredits Hook
 */
export function TestCreditsHook() {
  const {
    credits,
    loading,
    error,
    refreshCredits,
    checkAvailability,
    spendCredit
  } = useCredits();

  const [availabilityResult, setAvailabilityResult] = useState<any>(null);
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    if (credits) {
      setPollCount(prev => prev + 1);
    }
  }, [credits]);

  const handleCheckAvailability = async () => {
    const result = await checkAvailability('job_create');
    setAvailabilityResult(result);
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">useCredits Hook Test</h3>

      <div className="mb-4 space-x-2">
        <button
          onClick={refreshCredits}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Refresh
        </button>
        <button
          onClick={handleCheckAvailability}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Check Availability
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <strong>Status:</strong>{' '}
          {loading ? 'Loading...' : error ? `Error: ${error}` : 'Ready'}
        </div>
        <div>
          <strong>Poll Count:</strong> {pollCount}
        </div>

        {credits && (
          <div className="mt-4 p-2 bg-gray-100 rounded">
            <strong>Credits:</strong>
            <div className="mt-2 space-y-1">
              <div>Job Credits: {credits.jobCredits === -1 ? 'Unlimited' : credits.jobCredits}</div>
              <div>Limit: {credits.limit === -1 ? 'Unlimited' : credits.limit}</div>
              <div>Available: {credits.available ? 'Yes' : 'No'}</div>
              <div>Remaining: {credits.creditsRemaining === -1 ? 'Unlimited' : credits.creditsRemaining}</div>
              <div>Plan: {credits.planKey}</div>
            </div>
          </div>
        )}

        {availabilityResult && (
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <strong>Availability Check:</strong>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(availabilityResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 Hook polls every 30 seconds automatically.</p>
        <p>💡 Check Network tab to verify polling behavior.</p>
      </div>
    </div>
  );
}

/**
 * Test Component: Conditional Requests
 */
export function TestConditionalRequests() {
  const [lastModified, setLastModified] = useState<string | null>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseSize, setResponseSize] = useState<number | null>(null);

  const testConditionalRequest = async () => {
    try {
      // First request
      const response1 = await fetch('/api/user/usage-limits');
      const lastMod = response1.headers.get('Last-Modified');
      setLastModified(lastMod);

      // Conditional request
      const response2 = await fetch('/api/user/usage-limits', {
        headers: lastMod ? {
          'If-Modified-Since': lastMod
        } : {}
      });

      setResponseStatus(response2.status);
      
      if (response2.status === 304) {
        setResponseSize(0); // No body for 304
      } else {
        const text = await response2.text();
        setResponseSize(text.length);
      }
    } catch (error) {
      console.error('Conditional request test error:', error);
    }
  };

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-bold mb-4">Conditional Requests Test</h3>

      <button
        onClick={testConditionalRequest}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Conditional Request
      </button>

      <div className="space-y-2 text-sm">
        {lastModified && (
          <div>
            <strong>Last-Modified:</strong> {lastModified}
          </div>
        )}
        {responseStatus !== null && (
          <div>
            <strong>Response Status:</strong>{' '}
            <span className={responseStatus === 304 ? 'text-green-500' : 'text-blue-500'}>
              {responseStatus} {responseStatus === 304 ? '(Not Modified)' : '(Modified)'}
            </span>
          </div>
        )}
        {responseSize !== null && (
          <div>
            <strong>Response Size:</strong>{' '}
            {responseSize === 0 ? (
              <span className="text-green-500">0 bytes (304 response)</span>
            ) : (
              <span>{responseSize} bytes</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>💡 304 responses save bandwidth by not sending unchanged data.</p>
        <p>💡 Check Network tab to see response sizes.</p>
      </div>
    </div>
  );
}

/**
 * Main Test Page Component
 */
export function Phase2TestPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <h1 className="text-3xl font-bold mb-8">Phase 2 Testing Components</h1>
      
      <TestProviderHealth />
      <TestUsageLimitsPolling />
      <TestCreditsHook />
      <TestConditionalRequests />
    </div>
  );
}

