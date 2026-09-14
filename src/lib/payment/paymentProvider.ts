import PaymentProviderSettings, { type ActivePaymentProvider } from '@/models/PaymentProviderSettings';
import type { IPaymentProvider } from './providers/types';

let cachedProvider: IPaymentProvider | null = null;
let cachedProviderName: ActivePaymentProvider | null = null;

/**
 * Gets the active payment provider based on admin settings.
 * Defaults to 'razorpay' if no settings exist.
 * Caches the provider instance for the lifetime of the process.
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
  } else {
    const { RazorpayProvider } = await import('./providers/razorpay');
    provider = new RazorpayProvider();
  }

  cachedProvider = provider;
  cachedProviderName = activeProvider;

  return provider;
}

/**
 * Reads the active provider name from the database.
 * Falls back to 'razorpay' if no settings document exists.
 */
export async function getActiveProviderName(): Promise<ActivePaymentProvider> {
  try {
    const settings = await PaymentProviderSettings.findOne().lean() as any;
    return settings?.activeProvider || 'razorpay';
  } catch {
    return 'razorpay';
  }
}

/**
 * Admin: Update the active payment provider.
 */
export async function setActiveProvider(
  provider: ActivePaymentProvider,
  updatedBy?: string
): Promise<void> {
  await PaymentProviderSettings.findOneAndUpdate(
    {},
    { activeProvider: provider, updatedBy },
    { upsert: true, new: true }
  );
  // Invalidate cache
  cachedProvider = null;
  cachedProviderName = null;
}

/**
 * Check health of both providers (for admin dashboard).
 */
export async function checkProviderHealth(): Promise<Record<ActivePaymentProvider, boolean>> {
  const results: Record<ActivePaymentProvider, boolean> = {
    stripe: false,
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
    const { RazorpayProvider } = await import('./providers/razorpay');
    const razorpay = new RazorpayProvider();
    results.razorpay = await razorpay.isHealthy();
  } catch {
    results.razorpay = false;
  }

  return results;
}
