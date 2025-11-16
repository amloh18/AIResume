'use client';

/**
 * Test Components for Phase 4 Features
 * 
 * These components can be used to test Phase 4 implementations:
 * - Dashboard race condition fixes
 * - Studio conflict resolution
 * - Enhanced error boundaries
 */

import React, { useState, useEffect } from 'react';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Loader2 } from 'lucide-react';

/**
 * Test Component: Dashboard Loading States
 * 
 * Note: This component must be used within DashboardDataProvider
 */
export function TestDashboardLoadingStates() {
  const {
    cvs,
    coverLetters,
    jobs,
    analytics,
    criticalLoading,
    secondaryLoading,
    loading, // Legacy
    errors,
    error, // Legacy
    isReady,
    refreshCVs,
    refreshJobs,
    refreshAll
  } = useDashboardData();

  const [testResults, setTestResults] = useState<{
    criticalPath: boolean;
    parallelLoading: boolean;
    perCategoryErrors: boolean;
  }>({
    criticalPath: false,
    parallelLoading: false,
    perCategoryErrors: false
  });

  useEffect(() => {
    // Test critical path: isReady should be true when criticalLoading is false
    if (!criticalLoading && isReady) {
      setTestResults(prev => ({ ...prev, criticalPath: true }));
    }

    // Test parallel loading: multiple categories can load simultaneously
    const loadingCount = Object.values(secondaryLoading).filter(v => v).length;
    if (loadingCount > 1) {
      setTestResults(prev => ({ ...prev, parallelLoading: true }));
    }

    // Test per-category errors: errors object should track individual errors
    const hasErrors = Object.values(errors).some(e => e !== null && e !== undefined);
    if (hasErrors) {
      setTestResults(prev => ({ ...prev, perCategoryErrors: true }));
    }
  }, [criticalLoading, isReady, secondaryLoading, errors]);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Dashboard Loading States Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Critical Loading</h4>
            <Badge variant={criticalLoading ? 'destructive' : 'default'}>
              {criticalLoading ? 'Loading...' : 'Ready'}
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Ready State</h4>
            <Badge variant={isReady ? 'default' : 'secondary'}>
              {isReady ? 'Ready' : 'Not Ready'}
            </Badge>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Secondary Loading States</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>CVs:</span>
              {secondaryLoading.cvs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : errors.cvs ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Jobs:</span>
              {secondaryLoading.jobs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : errors.jobs ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Cover Letters:</span>
              {secondaryLoading.coverLetters ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : errors.coverLetters ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span>Analytics:</span>
              {secondaryLoading.analytics ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : errors.analytics ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        </div>

        {Object.keys(errors).some(key => errors[key as keyof typeof errors]) && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">Errors:</h4>
            <div className="space-y-1 text-sm">
              {errors.cvs && <div>CVs: {errors.cvs}</div>}
              {errors.jobs && <div>Jobs: {errors.jobs}</div>}
              {errors.coverLetters && <div>Cover Letters: {errors.coverLetters}</div>}
              {errors.analytics && <div>Analytics: {errors.analytics}</div>}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={refreshCVs} variant="outline" size="sm">
            Refresh CVs
          </Button>
          <Button onClick={refreshJobs} variant="outline" size="sm">
            Refresh Jobs
          </Button>
          <Button onClick={refreshAll} variant="outline" size="sm">
            Refresh All
          </Button>
        </div>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
          <h4 className="font-semibold mb-2">Test Results:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              {testResults.criticalPath ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Critical path loading works</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.parallelLoading ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Parallel loading detected</span>
            </div>
            <div className="flex items-center gap-2">
              {testResults.perCategoryErrors ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-gray-400" />
              )}
              <span>Per-category error handling</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500">
          <p>💡 Check Network tab to verify loading sequence</p>
          <p>💡 Critical data should load before secondary data</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Test Component: Error Boundary
 */
function ComponentThatThrows({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error for error boundary');
  }
  return <div>Component rendered successfully</div>;
}

export function TestErrorBoundary() {
  const [shouldThrow, setShouldThrow] = useState(false);
  const [context, setContext] = useState<'studio' | 'dashboard' | 'general'>('general');
  const [errorCaught, setErrorCaught] = useState(false);

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Error Boundary Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Context:</label>
          <select
            value={context}
            onChange={(e) => setContext(e.target.value as any)}
            className="w-full p-2 border rounded"
          >
            <option value="general">General</option>
            <option value="studio">Studio</option>
            <option value="dashboard">Dashboard</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => {
              setErrorCaught(false);
              setShouldThrow(true);
            }}
            variant="destructive"
          >
            Trigger Error
          </Button>
          <Button
            onClick={() => {
              setShouldThrow(false);
              setErrorCaught(false);
            }}
            variant="outline"
          >
            Reset
          </Button>
        </div>

        <div className="border rounded p-4 min-h-[200px]">
          <ErrorBoundary
            context={context}
            onError={() => setErrorCaught(true)}
            showDetails={true}
          >
            <ComponentThatThrows shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </div>

        {errorCaught && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
            <p className="text-sm text-green-900 dark:text-green-100">
              ✅ Error was caught by boundary
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>💡 Error boundary should show context-specific messages</p>
          <p>💡 Try different contexts to see different error messages</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Test Component: Conflict Resolution Simulation
 */
export function TestConflictResolution() {
  const [conflictScenario, setConflictScenario] = useState<'none' | 'simulated'>('none');
  const [testResult, setTestResult] = useState<string | null>(null);

  const simulateConflict = async () => {
    setConflictScenario('simulated');
    setTestResult(null);

    try {
      // Simulate: Fetch CV, then try to save with old updatedAt
      const response = await fetch('/api/cvs?limit=1');
      const data = await response.json();
      
      if (data.success && data.data?.cvs?.length > 0) {
        const cv = data.data.cvs[0];
        const oldUpdatedAt = new Date(Date.now() - 86400000).toISOString(); // 1 day ago

        // Try to update with old updatedAt (should cause conflict)
        const updateResponse = await fetch(`/api/cvs/${cv.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: cv.title,
            cvData: cv.cvData,
            updatedAt: oldUpdatedAt // Old timestamp
          })
        });

        if (updateResponse.status === 409) {
          const conflictData = await updateResponse.json();
          setTestResult(`✅ Conflict detected! Server version: ${conflictData.serverVersion.updatedAt}, Client version: ${conflictData.clientVersion.updatedAt}`);
        } else if (updateResponse.ok) {
          setTestResult('⚠️ No conflict detected (CV may not have been modified recently)');
        } else {
          setTestResult(`❌ Unexpected response: ${updateResponse.status}`);
        }
      } else {
        setTestResult('⚠️ No CVs found to test with');
      }
    } catch (error: any) {
      setTestResult(`❌ Error: ${error.message}`);
    }
  };

  return (
    <Card className="p-4">
      <CardHeader>
        <CardTitle>Conflict Resolution Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            This test simulates a conflict by trying to save a CV with an outdated updatedAt timestamp.
          </p>
          <Button onClick={simulateConflict} variant="outline">
            Simulate Conflict
          </Button>
        </div>

        {testResult && (
          <div className={`p-3 rounded ${
            testResult.includes('✅') 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : testResult.includes('⚠️')
              ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
          }`}>
            <p className="text-sm">{testResult}</p>
          </div>
        )}

        <div className="text-xs text-gray-500">
          <p>💡 For full conflict test, open same CV in two browser tabs</p>
          <p>💡 Make changes in Tab 2, save</p>
          <p>💡 Make changes in Tab 1, save - should see ConflictResolver</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Test Page Component
 */
export function Phase4TestPage() {
  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Phase 4 Testing Components</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive test components for Dashboard & Studio improvements
        </p>
      </div>

      <TestDashboardLoadingStates />
      <TestErrorBoundary />
      <TestConflictResolution />

      <Card className="p-4">
        <CardHeader>
          <CardTitle>Manual Testing Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Dashboard Race Condition Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open browser DevTools → Network tab</li>
              <li>Navigate to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">/dashboard</code></li>
              <li>Observe request order: Auth → User → (CVs, Jobs, Cover Letters, Analytics in parallel)</li>
              <li>Check that dashboard shows skeleton loaders during critical loading</li>
              <li>Verify content appears only after critical data is ready</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Studio Conflict Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Open a CV in Studio (Tab 1)</li>
              <li>Open the same CV in another tab (Tab 2)</li>
              <li>In Tab 2: Make changes and save</li>
              <li>In Tab 1: Make different changes and save</li>
              <li>Verify ConflictResolver dialog appears in Tab 1</li>
              <li>Test all three resolution options: Server, Client, Merge</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Error Boundary Test</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Use the Error Boundary test component above</li>
              <li>Try different contexts (studio, dashboard, general)</li>
              <li>Verify context-specific error messages</li>
              <li>Test retry functionality</li>
              <li>Test bug reporting</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

