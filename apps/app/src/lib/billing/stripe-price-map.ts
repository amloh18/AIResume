/**
 * Canonical Server-Side Stripe Price Mapping for AIResume
 *
 * This file is the SINGLE SOURCE OF TRUTH for Stripe Price IDs.
 * Never accept arbitrary price IDs from the browser.
 * The frontend submits: plan + billingInterval + region.
 * The server resolves the actual Stripe Price ID here.
 */

export type PlanKey = 'free' | 'starter' | 'focused';
export type BillingInterval = 'monthly' | 'yearly';
export type Region = 'IN' | 'ROW';

// ─── Stripe Product ──────────────────────────────────────────────────────────

export const STRIPE_PRODUCT_ID = 'prod_VHuDHizAvH0fpW';

// ─── Canonical Price Map ─────────────────────────────────────────────────────
// region + plan + interval -> Stripe Price ID

interface PriceEntry {
  priceId: string;
  currency: string;
  amount: number; // in smallest currency unit (cents/paise)
  interval: BillingInterval;
}

export const STRIPE_PRICE_MAP: Record<Region, Record<PlanKey, Partial<Record<BillingInterval, PriceEntry>>>> = {
  IN: {
    free: {},
    starter: {
      monthly: {
        priceId: 'price_1UHKPEBNLqQlVWbO1PUCZCWu',
        currency: 'inr',
        amount: 19900,
        interval: 'monthly',
      },
      yearly: {
        priceId: 'price_1UHKPTBNLqQlVWbOTyJimgYg',
        currency: 'inr',
        amount: 149900,
        interval: 'yearly',
      },
    },
    focused: {
      monthly: {
        priceId: 'price_1UHKPiBNLqQlVWbOie9UrSbj',
        currency: 'inr',
        amount: 49900,
        interval: 'monthly',
      },
      yearly: {
        priceId: 'price_1UHKPxBNLqQlVWbO7yNW8upz',
        currency: 'inr',
        amount: 399900,
        interval: 'yearly',
      },
    },
  },
  ROW: {
    free: {},
    starter: {
      monthly: {
        priceId: 'price_1UHKP5BNLqQlVWbOboWThP4E',
        currency: 'usd',
        amount: 499,
        interval: 'monthly',
      },
      yearly: {
        priceId: 'price_1UHKPMBNLqQlVWbOc3kLvHTB',
        currency: 'usd',
        amount: 1999,
        interval: 'yearly',
      },
    },
    focused: {
      monthly: {
        priceId: 'price_1UHKPbBNLqQlVWbOAObmNtKV',
        currency: 'usd',
        amount: 999,
        interval: 'monthly',
      },
      yearly: {
        priceId: 'price_1UHKPpBNLqQlVWbOv3maW8Xg',
        currency: 'usd',
        amount: 7999,
        interval: 'yearly',
      },
    },
  },
};

// ─── Display Prices (for frontend) ───────────────────────────────────────────

export const DISPLAY_PRICES: Record<Region, Record<PlanKey, Partial<Record<BillingInterval, { price: string; period: string }>>>> = {
  IN: {
    free: {},
    starter: {
      monthly: { price: '₹199', period: '/month' },
      yearly: { price: '₹1,499', period: '/year' },
    },
    focused: {
      monthly: { price: '₹499', period: '/month' },
      yearly: { price: '₹3,999', period: '/year' },
    },
  },
  ROW: {
    free: {},
    starter: {
      monthly: { price: '$4.99', period: '/month' },
      yearly: { price: '$19.99', period: '/year' },
    },
    focused: {
      monthly: { price: '$9.99', period: '/month' },
      yearly: { price: '$79.99', period: '/year' },
    },
  },
};

// ─── Resolve Price ───────────────────────────────────────────────────────────

/**
 * Resolve the canonical Stripe Price ID from plan + interval + region.
 * NEVER trust priceId/currency/amount from the client.
 */
export function resolveStripePrice(
  plan: PlanKey,
  interval: BillingInterval,
  region: Region = 'ROW'
): PriceEntry | null {
  if (plan === 'free') return null;
  return STRIPE_PRICE_MAP[region]?.[plan]?.[interval] ?? null;
}

/**
 * Reverse-resolve a Stripe Price ID back to plan + interval.
 * Used by webhook handlers to identify which plan a subscription belongs to.
 */
export function resolvePriceToPlan(priceId: string): { plan: PlanKey; interval: BillingInterval } | null {
  for (const region of ['IN', 'ROW'] as Region[]) {
    for (const plan of ['starter', 'focused'] as PlanKey[]) {
      for (const interval of ['monthly', 'yearly'] as BillingInterval[]) {
        const entry = STRIPE_PRICE_MAP[region]?.[plan]?.[interval];
        if (entry?.priceId === priceId) {
          return { plan, interval };
        }
      }
    }
  }
  return null;
}

/**
 * Detect region from country code.
 * India = IN, everything else = ROW.
 */
export function detectRegion(countryCode?: string): Region {
  if (!countryCode) return 'ROW';
  return countryCode.toUpperCase() === 'IN' ? 'IN' : 'ROW';
}

// ─── Launch Trial ────────────────────────────────────────────────────────────
// Starter Monthly is FREE through December 31, 2026.
// Only applies to starter_monthly (USD and INR).

const LAUNCH_TRIAL_END_UTC = '2027-01-01T00:00:00Z';

/**
 * Check if the Starter Monthly launch trial is currently active.
 * Returns true only while the launch offer is valid (before 2027-01-01 UTC).
 */
export function isStarterMonthlyLaunchTrialActive(now: Date = new Date()): boolean {
  const cutoff = new Date(LAUNCH_TRIAL_END_UTC);
  return now < cutoff;
}

/**
 * Get the fixed trial_end timestamp for Starter Monthly launch trial.
 * Returns the Unix timestamp (seconds) for 2027-01-01T00:00:00Z.
 */
export function getLaunchTrialEndTimestamp(): number {
  return Math.floor(new Date(LAUNCH_TRIAL_END_UTC).getTime() / 1000);
}

/**
 * Get the fixed trial_end Date for Starter Monthly launch trial.
 */
export function getLaunchTrialEndDate(): Date {
  return new Date(LAUNCH_TRIAL_END_UTC);
}

/**
 * Determine if a subscription qualifies for the launch trial.
 * Only starter_monthly (USD or INR) qualifies.
 */
export function qualifiesForLaunchTrial(plan: PlanKey, interval: BillingInterval): boolean {
  return plan === 'starter' && interval === 'monthly' && isStarterMonthlyLaunchTrialActive();
}

/**
 * Get launch trial display message for the frontend.
 * Returns null if the trial is not active.
 */
export function getLaunchTrialMessage(region: Region): string | null {
  if (!isStarterMonthlyLaunchTrialActive()) return null;
  return 'Free through Dec 31, 2026';
}

// ─── Customer Portal ─────────────────────────────────────────────────────────

export const STRIPE_PORTAL_CONFIG_ID = 'bpc_1UHKQlBNLqQlVWbOtrGyO5L4';
export const PORTAL_RETURN_URL = 'https://resume.morigrid.com';

// ─── Webhook Endpoint ────────────────────────────────────────────────────────

export const STRIPE_WEBHOOK_ENDPOINT_ID = 'we_1UHKRCBNLqQlVWbOQhrl1kiP';
export const WEBHOOK_URL = 'https://resume.morigrid.com/api/webhooks/stripe';

// ─── Plan Key Mapping ────────────────────────────────────────────────────────
// Maps our internal plan keys to Stripe-friendly names

export function planKeyToStripe(plan: PlanKey, interval: BillingInterval): string {
  return `${plan}_${interval}`;
}

export function stripeToPlanKey(stripePlan: string): { plan: PlanKey; interval: BillingInterval } | null {
  const parts = stripePlan.split('_');
  if (parts.length < 2) return null;
  const interval = parts.pop() as BillingInterval;
  const plan = parts.join('_') as PlanKey;
  if (['free', 'starter', 'focused'].includes(plan) && ['monthly', 'yearly'].includes(interval)) {
    return { plan, interval };
  }
  return null;
}

// ─── Application Version ─────────────────────────────────────────────────────

export const APPLICATION_VERSION = 'airesume-v1';
