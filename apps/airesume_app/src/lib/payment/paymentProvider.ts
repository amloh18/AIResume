import PaymentProviderSettings, { type ActivePaymentProvider, type IPaymentProviderSettings } from '@/models/PaymentProviderSettings';
import type { IPaymentProvider } from './providers/types';

let cachedProvider: IPaymentProvider | null = null;
let cachedProviderName: ActivePaymentProvider | null = null;
let cachedVersion: number = 0;
let lastCacheCheck = 0;
const CACHE_TTL_MS = 2500; // Check DB every 2.5 seconds to ensure near-instant runtime propagation across multiple instances

/**
 * Invalidate the in-memory provider cache.
 * Called immediately when configuration is changed.
 */
export function invalidatePaymentProviderCache(): void {
  cachedProvider = null;
  cachedProviderName = null;
  cachedVersion = 0;
  lastCacheCheck = 0;
}

/**
 * Gets the active payment provider based on runtime admin settings.
 * Defaults to 'stripe' if no settings document exists.
 * Automatically refreshes from database across instances within CACHE_TTL_MS.
 */
export async function getActivePaymentProvider(): Promise<IPaymentProvider> {
  const activeProvider = await getActiveProviderName();

  if (cachedProvider && cachedProviderName === activeProvider) {
    return cachedProvider;
  }

  let provider: IPaymentProvider;

  if (activeProvider === 'stripe') {
    const { StripeProvider } = await import('./providers/stripe');
    provider = new StripeProvider();
  } else if (activeProvider === 'cashfree') {
    const { CashfreeProvider } = await import('./providers/cashfree');
    provider = new CashfreeProvider();
  } else {
    const { RazorpayProvider } = await import('./providers/razorpay');
    provider = new RazorpayProvider();
  }

  cachedProvider = provider;
  cachedProviderName = activeProvider;

  return provider;
}

/**
 * Reads the active provider name from the database with short-TTL caching.
 * Falls back to 'stripe' if no settings document exists.
 */
export async function getActiveProviderName(): Promise<ActivePaymentProvider> {
  const now = Date.now();
  if (cachedProviderName && now - lastCacheCheck < CACHE_TTL_MS) {
    return cachedProviderName;
  }

  try {
    const { getConnection } = await import('@/lib/database');
    await getConnection();

    const settings = await PaymentProviderSettings.findOne().lean() as any;
    const provider = (settings?.activeProvider || 'stripe') as ActivePaymentProvider;
    const version = settings?.configurationVersion || 1;

    // If version changed, invalidate cached provider instance
    if (version !== cachedVersion) {
      cachedProvider = null;
      cachedVersion = version;
    }

    cachedProviderName = provider;
    lastCacheCheck = now;
    return provider;
  } catch (error) {
    // If DB read fails, safely return current cached provider or default to 'stripe'
    return cachedProviderName || 'stripe';
  }
}

/**
 * Admin: Update the active payment provider and increment configuration version.
 * Takes effect immediately across all instances without restart.
 */
export async function setActiveProvider(
  provider: ActivePaymentProvider,
  updatedBy?: string
): Promise<IPaymentProviderSettings> {
  const { getConnection } = await import('@/lib/database');
  await getConnection();

  const updatedSettings = await PaymentProviderSettings.findOneAndUpdate(
    {},
    {
      $set: {
        activeProvider: provider,
        updatedBy: updatedBy || 'admin',
        updatedAt: new Date(),
      },
      $inc: { configurationVersion: 1 },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Invalidate local in-memory cache immediately
  invalidatePaymentProviderCache();

  return updatedSettings;
}

/**
 * Check health and connectivity of configured providers.
 */
export async function checkProviderHealth(): Promise<Record<ActivePaymentProvider, boolean>> {
  const results: Record<ActivePaymentProvider, boolean> = {
    stripe: false,
    cashfree: false,
    razorpay: false,
  };

  try {
    const { StripeProvider } = await import('./providers/stripe');
    const stripe = new StripeProvider();
    results.stripe = await stripe.isHealthy();
  } catch {
    results.stripe = false;
  }

  try {
    const { CashfreeProvider } = await import('./providers/cashfree');
    const cashfree = new CashfreeProvider();
    results.cashfree = await cashfree.isHealthy();
  } catch {
    results.cashfree = false;
  }

  try {
    const { RazorpayProvider } = await import('./providers/razorpay');
    const razorpay = new RazorpayProvider();
    results.razorpay = await razorpay.isHealthy();
  } catch {
    results.razorpay = false;
  }

  return results;
}
