'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Zap,
  Save,
  ArrowRight,
  ExternalLink,
  Lock,
  Clock,
  History,
  Activity,
} from 'lucide-react';

interface ProviderDetails {
  enabled: boolean;
  environment: 'sandbox' | 'production';
  publishableKey?: string;
  appId?: string;
  hasSecretKey: boolean;
  maskedSecretKey: string;
  status: 'configured' | 'missing' | 'invalid';
  isHealthy: boolean;
  validationError?: string;
  lastVerification?: {
    status: boolean;
    verifiedAt: string;
    message?: string;
  };
}

interface AuditLog {
  _id: string;
  adminEmail: string;
  previousProvider: string;
  newProvider: string;
  configurationVersion: number;
  action: string;
  status: string;
  reason?: string;
  createdAt: string;
}

export default function AdminPaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingStripe, setTestingStripe] = useState(false);
  const [testingCashfree, setTestingCashfree] = useState(false);
  const [switching, setSwitching] = useState(false);

  const [activeProvider, setActiveProvider] = useState<'stripe' | 'cashfree'>('stripe');
  const [configurationVersion, setConfigurationVersion] = useState<number>(1);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  const [stripeInfo, setStripeInfo] = useState<ProviderDetails | null>(null);
  const [cashfreeInfo, setCashfreeInfo] = useState<ProviderDetails | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Editable fields for Cashfree
  const [cfAppId, setCfAppId] = useState('');
  const [cfSecretKey, setCfSecretKey] = useState('');
  const [cfEnvironment, setCfEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [cfWebhookSecret, setCfWebhookSecret] = useState('');

  // Editable fields for Stripe
  const [stPublishableKey, setStPublishableKey] = useState('');
  const [stSecretKey, setStSecretKey] = useState('');
  const [stEnvironment, setStEnvironment] = useState<'sandbox' | 'production'>('production');

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/payment/settings');
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Access denied. Administrator privileges required.');
        }
        throw new Error('Failed to load payment settings.');
      }

      const data = await res.json();
      setActiveProvider(data.activeProvider || 'stripe');
      setConfigurationVersion(data.configurationVersion || 1);
      setUpdatedAt(data.updatedAt);
      setUpdatedBy(data.updatedBy);

      setStripeInfo(data.stripe);
      setCashfreeInfo(data.cashfree);
      setAuditLogs(data.recentAuditLogs || []);

      // Populate form state
      if (data.cashfree?.appId) setCfAppId(data.cashfree.appId);
      if (data.cashfree?.environment) setCfEnvironment(data.cashfree.environment);
      if (data.stripe?.publishableKey) setStPublishableKey(data.stripe.publishableKey);
      if (data.stripe?.environment) setStEnvironment(data.stripe.environment);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error loading payment configuration' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestConnection = async (provider: 'stripe' | 'cashfree') => {
    try {
      if (provider === 'stripe') setTestingStripe(true);
      if (provider === 'cashfree') setTestingCashfree(true);

      const res = await fetch('/api/admin/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          provider,
          cashfree: provider === 'cashfree' ? {
            appId: cfAppId,
            secretKey: cfSecretKey || undefined,
            environment: cfEnvironment,
          } : undefined,
          stripe: provider === 'stripe' ? {
            publishableKey: stPublishableKey,
            secretKey: stSecretKey || undefined,
            environment: stEnvironment,
          } : undefined,
        }),
      });

      const data = await res.json();
      if (data.healthy) {
        setFeedback({ type: 'success', message: `${provider.toUpperCase()} connection test succeeded! Gateway is operational.` });
      } else {
        setFeedback({ type: 'error', message: `${provider.toUpperCase()} connection test failed: ${data.message || 'Check credentials'}` });
      }
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', message: `Test failed: ${err.message}` });
    } finally {
      setTestingStripe(false);
      setTestingCashfree(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setSaving(true);
      setFeedback(null);

      const res = await fetch('/api/admin/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_config',
          expectedVersion: configurationVersion,
          cashfree: {
            appId: cfAppId,
            secretKey: cfSecretKey || undefined,
            environment: cfEnvironment,
            webhookSecret: cfWebhookSecret || undefined,
          },
          stripe: {
            publishableKey: stPublishableKey,
            secretKey: stSecretKey || undefined,
            environment: stEnvironment,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      setFeedback({ type: 'success', message: 'Payment settings saved successfully.' });
      setCfSecretKey('');
      setStSecretKey('');
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchProvider = async (target: 'stripe' | 'cashfree') => {
    if (target === activeProvider) return;

    const confirmMsg = `Switch active runtime payment provider to ${target.toUpperCase()}?\n\nSubsequent checkout requests across all application instances will immediately use ${target.toUpperCase()}. Existing subscriptions will remain with their original provider.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setSwitching(true);
      setFeedback(null);

      const res = await fetch('/api/admin/payment/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_provider',
          activeProvider: target,
          expectedVersion: configurationVersion,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Switch failed');
      }

      setFeedback({
        type: 'success',
        message: data.message || `Switched active provider to ${target.toUpperCase()} successfully!`,
      });
      fetchSettings();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e0b] p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          <span>Loading admin payment settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
              <Shield className="w-4 h-4" />
              <span>Admin Management</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Payment Gateway Controls</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Configure and dynamically switch the active payment processor (Stripe &amp; Cashfree) without redeploying.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              className="px-3.5 py-2 text-xs font-medium bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition flex items-center gap-2 shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
            <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-mono">
              v{configurationVersion}
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl text-sm flex items-start gap-3 border ${
              feedback.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                : feedback.type === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
            )}
            <div className="flex-1 font-medium">{feedback.message}</div>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
              Dismiss
            </button>
          </div>
        )}

        {/* Runtime Active Switcher Card */}
        <div className="bg-white dark:bg-[#141810] border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-white text-[11px] font-bold uppercase tracking-wider rounded-bl-xl flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current" />
            Runtime Hot-Switching
          </div>

          <div className="max-w-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span>Active Payment Provider</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200">
                Live: {activeProvider.toUpperCase()}
              </span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">
              Select which gateway handles incoming paywall checkout requests. Changes apply immediately across all application instances without code deploys or server restarts.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Stripe Option */}
              <div
                onClick={() => handleSwitchProvider('stripe')}
                className={`cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                  activeProvider === 'stripe'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-indigo-500" />
                      Stripe
                    </span>
                    <input
                      type="radio"
                      name="activeProviderRadio"
                      checked={activeProvider === 'stripe'}
                      onChange={() => handleSwitchProvider('stripe')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Primary international payment processor with global card coverage and native billing portal.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="font-semibold flex items-center gap-1.5">
                    {stripeInfo?.isHealthy ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                      </span>
                    ) : (
                      <span className="text-red-500 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Unhealthy
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {/* Cashfree Option */}
              <div
                onClick={() => handleSwitchProvider('cashfree')}
                className={`cursor-pointer rounded-xl p-5 border-2 transition-all flex flex-col justify-between ${
                  activeProvider === 'cashfree'
                    ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-gray-50/50 dark:bg-white/5'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-base font-bold flex items-center gap-2">
                      <Zap className="w-5 h-5 text-amber-500" />
                      Cashfree Payments
                    </span>
                    <input
                      type="radio"
                      name="activeProviderRadio"
                      checked={activeProvider === 'cashfree'}
                      onChange={() => handleSwitchProvider('cashfree')}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Indian &amp; regional payment gateway supporting UPI, NetBanking, Cards, and Wallets.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-white/10 flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Status:</span>
                  <span className="font-semibold flex items-center gap-1.5">
                    {cashfreeInfo?.isHealthy ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Operational
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Not Verified
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {switching && (
              <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validating provider credentials and switching runtime state...</span>
              </div>
            )}
          </div>
        </div>

        {/* Provider Details & Settings Form */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cashfree Settings Card */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center font-bold">
                    CF
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Cashfree Payments</h3>
                    <p className="text-xs text-gray-400">PG REST API v2023-08-01</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={testingCashfree}
                  onClick={() => handleTestConnection('cashfree')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${testingCashfree ? 'animate-spin' : ''}`} />
                  <span>{testingCashfree ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Environment
                  </label>
                  <select
                    value={cfEnvironment}
                    onChange={(e) => setCfEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Client ID / App ID
                  </label>
                  <input
                    type="text"
                    value={cfAppId}
                    onChange={(e) => setCfAppId(e.target.value)}
                    placeholder="e.g. CF123456TEST..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={cfSecretKey}
                    onChange={(e) => setCfSecretKey(e.target.value)}
                    placeholder={cashfreeInfo?.hasSecretKey ? '•••••••• (Stored securely on server)' : 'Enter Cashfree Secret Key'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Secret keys are never exposed in UI responses once stored.</p>
                </div>

                <div className="pt-2">
                  <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Webhook URL</span>
                  <div className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 font-mono text-[11px] break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/cashfree` : '/api/webhooks/cashfree'}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Configure this URL in Cashfree Merchant Dashboard &gt; Developers &gt; Webhooks.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Credentials: {cashfreeInfo?.hasSecretKey ? 'Configured' : 'Missing'}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveConfig}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>

          {/* Stripe Settings Card */}
          <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4 mb-5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center font-bold">
                    ST
                  </div>
                  <div>
                    <h3 className="font-bold text-base">Stripe</h3>
                    <p className="text-xs text-gray-400">Checkout Sessions &amp; Customer Portal</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={testingStripe}
                  onClick={() => handleTestConnection('stripe')}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 ${testingStripe ? 'animate-spin' : ''}`} />
                  <span>{testingStripe ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Environment
                  </label>
                  <select
                    value={stEnvironment}
                    onChange={(e) => setStEnvironment(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100"
                  >
                    <option value="production">Production (Live)</option>
                    <option value="sandbox">Sandbox / Test</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Publishable Key
                  </label>
                  <input
                    type="text"
                    value={stPublishableKey}
                    onChange={(e) => setStPublishableKey(e.target.value)}
                    placeholder="pk_live_... or pk_test_..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Secret Key
                  </label>
                  <input
                    type="password"
                    value={stSecretKey}
                    onChange={(e) => setStSecretKey(e.target.value)}
                    placeholder={stripeInfo?.hasSecretKey ? '•••••••• (Stored securely on server)' : 'sk_live_...'}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-white/10 bg-white dark:bg-[#0c0e0b] text-gray-900 dark:text-gray-100 font-mono text-xs"
                  />
                  <p className="text-[11px] text-gray-400 mt-0.5">Stored securely on server.</p>
                </div>

                <div className="pt-2">
                  <span className="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Webhook URL</span>
                  <div className="p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/5 font-mono text-[11px] break-all select-all">
                    {typeof window !== 'undefined' ? `${window.location.origin}/api/webhooks/stripe` : '/api/webhooks/stripe'}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Configured in Stripe Dashboard &gt; Developers &gt; Webhooks.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Credentials: {stripeInfo?.hasSecretKey ? 'Configured' : 'Missing'}
              </span>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveConfig}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Configuration</span>
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Section */}
        <div className="bg-white dark:bg-[#141810] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span>Payment Configuration Audit History</span>
            </h3>
            <span className="text-xs text-gray-400">Last 10 events</span>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
              No configuration changes recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-500">
                    <th className="py-2.5 font-semibold">Timestamp</th>
                    <th className="py-2.5 font-semibold">Administrator</th>
                    <th className="py-2.5 font-semibold">Action</th>
                    <th className="py-2.5 font-semibold">Transition</th>
                    <th className="py-2.5 font-semibold">Version</th>
                    <th className="py-2.5 font-semibold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/50 dark:hover:bg-white/5">
                      <td className="py-2.5 text-gray-400 font-mono">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-medium">{log.adminEmail}</td>
                      <td className="py-2.5 font-mono capitalize">{log.action.replace('_', ' ')}</td>
                      <td className="py-2.5">
                        <span className="inline-flex items-center gap-1 font-mono uppercase text-[11px]">
                          <span>{log.previousProvider}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{log.newProvider}</span>
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-gray-400">v{log.configurationVersion}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.status === 'success'
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                              : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
