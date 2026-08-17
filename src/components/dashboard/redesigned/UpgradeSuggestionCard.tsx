'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import posthog from 'posthog-js';
import {
  Sparkles,
  X,
  ArrowRight,
  Zap,
  Rocket,
  Crown,
  Bot,
  CheckCircle2,
} from 'lucide-react';
import { useMembership } from '@/lib/hooks/useMembership';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import { usePaymentModal } from '@/contexts/PaymentModalContext';

/* ------------------------------------------------------------------ */
/* Plan ladder + suggestion content                                    */
/* ------------------------------------------------------------------ */

/**
 * Tier ordering from lowest to highest plan. Used to figure out the next
 * logical upgrade for a user's current plan.
 */
const PLAN_TIER: Record<string, number> = {
  free: 0,
  starter_monthly: 0,
  starter_yearly: 1,
  focused_monthly: 2,
  focused_yearly: 2,
  smart_quarterly: 3,
  smart_yearly: 3,
  pro_monthly: 4,
  pro_quarterly: 5,
  pro_yearly: 6,
  pro_lifetime: 7,
};

const TOP_TIER = 7; // pro_lifetime — nothing above it to suggest

interface UsageSignals {
  jobCount: number;
  cvCount: number;
  coverLetterCount: number;
}

interface Suggestion {
  planKey: string;
  planName: string;
  tier: number;
  eyebrow: string;
  headline: string;
  description: string;
  features: string[];
  cta: string;
  usage: UsageSignals;
}

function buildSuggestion(planKey: string, usage: UsageSignals): Suggestion | null {
  const tier = PLAN_TIER[planKey] ?? 0;
  if (tier >= TOP_TIER) return null;

  const { jobCount, cvCount, coverLetterCount } = usage;

  if (tier === 0) {
    // Free / Starter Monthly → Focused
    const freeTrackerCap = 3;
    if (jobCount >= freeTrackerCap) {
      return {
        planKey: 'focused_monthly',
        planName: 'Focused',
        tier,
        eyebrow: 'You’re outgrowing the free plan',
        headline: `You’re tracking ${jobCount} jobs — the free plan caps at ${freeTrackerCap}`,
        description:
          'Focused unlocks unlimited job tracking, AI cover letters, full ATS optimisation and the interview coach. Keep your whole search in one place.',
        features: ['Unlimited job tracking', 'AI cover letter engine', 'Interview coach'],
        cta: 'Upgrade to Focused',
        usage,
      };
    }
    if (coverLetterCount > 0) {
      return {
        planKey: 'focused_monthly',
        planName: 'Focused',
        tier,
        eyebrow: 'Recommended for you',
        headline:
          `You've written ${coverLetterCount} cover letter${coverLetterCount === 1 ? '' : 's'} — unlock them on Focused`,
        description:
          'On the free plan your AI cover letters stay locked. Focused includes unlimited AI cover letters, full ATS optimisation and unlimited tracking.',
        features: ['Unlimited AI cover letters', 'Live ATS scoring', 'Unlimited job tracking'],
        cta: 'Upgrade to Focused',
        usage,
      };
    }
    if (cvCount > 0) {
      return {
        planKey: 'focused_monthly',
        planName: 'Focused',
        tier,
        eyebrow: 'Your CV deserves better',
        headline: 'Turn your CV into an application machine',
        description:
          'Focused unlocks full ATS optimisation, unlimited tailoring, AI cover letters and the interview coach — so every version of your CV is built to get past recruiters.',
        features: ['Full ATS optimisation', 'Unlimited AI tailoring', 'Interview coach'],
        cta: 'Upgrade to Focused',
        usage,
      };
    }
    return {
      planKey: 'focused_monthly',
      planName: 'Focused',
      tier,
      eyebrow: 'Unlock your full potential',
      headline: 'Stop searching. Start landing interviews.',
      description:
        'Focused gives you unlimited job tracking, AI cover letters, full ATS optimisation and interview coaching — everything you need to move your search forward.',
      features: ['Unlimited job tracking', 'AI cover letter engine', 'Interview coach'],
      cta: 'Upgrade to Focused',
      usage,
    };
  }

  if (tier === 1) {
    // Starter Yearly → Focused (adds tracker + interview coach)
    return {
      planKey: 'focused_monthly',
      planName: 'Focused',
      tier,
      eyebrow: 'Complete your toolkit',
      headline: 'Add the job tracker to your starter toolkit',
      description:
        'Starter covers AI documents — Focused adds unlimited job tracking, interview coaching and priority support so you can manage the whole search end to end.',
      features: ['Unlimited job tracking', 'Interview coach', 'Priority support'],
      cta: 'Upgrade to Focused',
      usage,
    };
  }

  if (tier === 2) {
    // Focused → Smart (auto-apply bot)
    if (jobCount >= 8) {
      return {
        planKey: 'smart_quarterly',
        planName: 'Smart',
        tier,
        eyebrow: 'Your search is heating up',
        headline: `You're tracking ${jobCount} roles — let Smart apply for you`,
        description:
          'Smart’s autonomous application bot finds, tailors and applies to matching roles for you around the clock, while you focus on interviews.',
        features: ['AI autonomous application bot', 'Priority application queue', 'Behavioral AI insights'],
        cta: 'Activate Smart',
        usage,
      };
    }
    return {
      planKey: 'smart_quarterly',
      planName: 'Smart',
      tier,
      eyebrow: 'Put your search on autopilot',
      headline: 'From tracking jobs to landing them',
      description:
        'Smart’s autonomous bot applies to matching roles for you 24/7 with high match accuracy — you focus on interviews, not spreadsheets.',
      features: ['AI autonomous application bot', 'Priority application queue', 'Behavioral AI insights'],
      cta: 'Activate Smart',
      usage,
    };
  }

  if (tier === 3) {
    // Smart → Pro (career vault + priority)
    return {
      planKey: 'pro_yearly',
      planName: 'Pro',
      tier,
      eyebrow: 'Own your career archive',
      headline: 'Preserve everything you’ve built with Pro',
      description:
        'Pro adds the permanent Career Vault — every CV, cover letter and document stored forever — plus priority support and advanced analytics on top of Smart’s autopilot.',
      features: ['Permanent Career Vault', 'Priority support', 'Advanced analytics'],
      cta: 'Upgrade to Pro',
      usage,
    };
  }

  if (tier === 4) {
    // Pro Monthly → Pro Yearly
    return {
      planKey: 'pro_yearly',
      planName: 'Pro Yearly',
      tier,
      eyebrow: 'You’re on Pro Monthly',
      headline: 'Go yearly and keep more of your budget',
      description:
        'Switch to Pro Yearly and save on the same full Pro suite — Career Vault, priority support and advanced analytics, billed once a year.',
      features: ['Save vs. monthly billing', 'Permanent Career Vault', 'Priority support'],
      cta: 'Switch to Yearly',
      usage,
    };
  }

  if (tier === 5) {
    // Pro Quarterly → Pro Yearly
    return {
      planKey: 'pro_yearly',
      planName: 'Pro Yearly',
      tier,
      eyebrow: 'A smarter billing rhythm',
      headline: 'Lock in yearly pricing and save',
      description:
        'Move from quarterly to yearly billing and save while keeping the full Pro suite — Career Vault, priority support and advanced analytics.',
      features: ['Save vs. quarterly billing', 'Permanent Career Vault', 'Priority support'],
      cta: 'Switch to Yearly',
      usage,
    };
  }

  // Pro Yearly → Pro Lifetime
  return {
    planKey: 'pro_lifetime',
    planName: 'Pro Lifetime',
    tier,
    eyebrow: 'One-time payment. Lifetime access.',
    headline: 'Own Pro forever with a single payment',
    description:
      'Pro Lifetime locks in every current and future feature for life — including the permanent Career Vault — with no renewals, ever.',
    features: ['Lifetime access, no renewals', 'All future features included', 'Permanent Career Vault'],
    cta: 'Go Lifetime',
    usage,
  };
}

/* ------------------------------------------------------------------ */
/* A/B variants                                                        */
/* ------------------------------------------------------------------ */

type VariantId = 'control' | 'urgency' | 'value';

interface CardVariant {
  id: VariantId;
  label: string;
  gradient: string;
  border: string;
  glowA: string;
  glowB: string;
  hairline: string;
  chip: string;
  check: string;
  ctaBtn: string;
  /** Badge/kicker line */
  eyebrow: (s: Suggestion) => string;
  /** Main headline */
  headline: (s: Suggestion) => string;
  /** Primary CTA label */
  cta: (s: Suggestion) => string;
}

const VARIANTS: Record<VariantId, CardVariant> = {
  control: {
    id: 'control',
    label: 'Control — smart message',
    gradient: 'bg-gradient-to-br from-[#101b12] via-[#142114] to-[#0c140e]',
    border: 'border-lime-500/25 shadow-lime-500/[0.07]',
    glowA: 'bg-lime-400/15',
    glowB: 'bg-emerald-500/10',
    hairline: 'via-lime-400/50',
    chip: 'bg-lime-400/15 text-lime-300 border-lime-400/25',
    check: 'text-lime-400',
    ctaBtn: 'bg-[#80FF00] text-slate-950 hover:shadow-lime-400/20',
    eyebrow: (s) => s.eyebrow,
    headline: (s) => s.headline,
    cta: (s) => s.cta,
  },
  urgency: {
    id: 'urgency',
    label: 'Urgency — don’t fall behind',
    gradient: 'bg-gradient-to-br from-[#1d1026] via-[#251435] to-[#120a1a]',
    border: 'border-violet-500/30 shadow-violet-500/[0.10]',
    glowA: 'bg-violet-400/15',
    glowB: 'bg-fuchsia-500/10',
    hairline: 'via-violet-400/50',
    chip: 'bg-violet-400/15 text-violet-300 border-violet-400/25',
    check: 'text-violet-400',
    ctaBtn: 'bg-violet-500 text-white hover:shadow-violet-400/30',
    eyebrow: () => 'Don’t fall behind',
    headline: (s) =>
      ({
        0: 'Every day on the free plan is a day your search stalls',
        1: 'Don’t lose track of the roles you’re chasing',
        2: 'While you sleep, others are applying',
        3: 'Your career archive could vanish — lock it in',
        4: 'You’re overpaying month after month',
        5: 'Quarters add up — switch before your next renewal',
        6: 'Renewals forever? Own it and move on',
      })[s.tier] ?? s.headline,
    cta: (s) =>
      ({
        0: 'Unlock Focused now',
        1: 'Unlock Focused now',
        2: 'Start Smart today',
        3: 'Go Pro today',
        4: 'Lock in yearly savings',
        5: 'Lock in yearly savings',
        6: 'Go Lifetime now',
      })[s.tier] ?? s.cta,
  },
  value: {
    id: 'value',
    label: 'Value — worth it',
    gradient: 'bg-gradient-to-br from-[#0a211d] via-[#0f2d26] to-[#081714]',
    border: 'border-emerald-500/30 shadow-emerald-500/[0.10]',
    glowA: 'bg-emerald-400/15',
    glowB: 'bg-teal-500/10',
    hairline: 'via-emerald-400/50',
    chip: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
    check: 'text-emerald-400',
    ctaBtn: 'bg-emerald-400 text-emerald-950 hover:shadow-emerald-400/30',
    eyebrow: () => 'The smart choice',
    headline: (s) =>
      ({
        0: 'Everything you need to land interviews — in one plan',
        1: 'Complete your toolkit and track every application',
        2: 'Reclaim hours every week with autopilot',
        3: 'Keep your whole career history, forever',
        4: 'Same Pro suite. Better annual value.',
        5: 'The smart money move: yearly pricing',
        6: 'Pay once. Keep everything. Best value we offer.',
      })[s.tier] ?? s.headline,
    cta: (s) =>
      ({
        0: 'Try Focused risk-free',
        1: 'Try Focused risk-free',
        2: 'Get Smart value',
        3: 'Get Pro — keep it all',
        4: 'Switch & save',
        5: 'Switch & save',
        6: 'One payment. Lifetime value.',
      })[s.tier] ?? s.cta,
  },
};

const VARIANT_IDS: VariantId[] = ['control', 'urgency', 'value'];

/** djb2 string hash → stable variant index per user id */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * Deterministically assign a user to a variant:
 * - logged-in users: hash of their user id (stable across devices)
 * - anonymous: one random pick persisted to localStorage (stable per browser)
 */
function resolveVariant(userId?: string | null): VariantId {
  if (userId) return VARIANT_IDS[hashString(userId) % VARIANT_IDS.length];
  if (typeof window === 'undefined') return 'control';
  const KEY = 'fb_upgrade_card_variant';
  try {
    const stored = window.localStorage.getItem(KEY);
    if (stored && (VARIANT_IDS as string[]).includes(stored)) return stored as VariantId;
    const assigned = VARIANT_IDS[Math.floor(Math.random() * VARIANT_IDS.length)];
    window.localStorage.setItem(KEY, assigned);
    return assigned;
  } catch {
    return VARIANT_IDS[Math.floor(Math.random() * VARIANT_IDS.length)];
  }
}

/** Analytics must never break the UI. */
function track(event: string, props: Record<string, unknown>) {
  try {
    posthog.capture(event, props);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/* Frequency capping ("show occasionally")                             */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const DISMISS_COOLDOWN_DAYS = 7; // hidden for a week after dismissing
const SHOW_INTERVAL_DAYS = 2; // at most once every 2 days when not dismissed

const STORAGE_KEYS = {
  dismissedAt: 'fb_home_upgrade_dismissed_at',
  lastSeenAt: 'fb_home_upgrade_last_seen_at',
} as const;

function readStored(key: string): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(key);
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value > 0 ? value : null;
}

function shouldShow(): boolean {
  const now = Date.now();
  const dismissedAt = readStored(STORAGE_KEYS.dismissedAt);
  if (dismissedAt && now - dismissedAt < DISMISS_COOLDOWN_DAYS * DAY_MS) return false;
  const lastSeenAt = readStored(STORAGE_KEYS.lastSeenAt);
  if (lastSeenAt && now - lastSeenAt < SHOW_INTERVAL_DAYS * DAY_MS) return false;
  return true;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function UpgradeSuggestionCard() {
  const router = useRouter();
  const { data: session } = useSession();
  const { membership, loading: membershipLoading } = useMembership();
  const { jobs, cvs, coverLetters } = useDashboardData();
  const { openPaymentModal } = usePaymentModal();
  const [visible, setVisible] = useState(false);
  const [gateResolved, setGateResolved] = useState(false);
  const impressionLoggedRef = useRef(false);

  const suggestion = useMemo<Suggestion | null>(() => {
    if (!membership) return null;
    return buildSuggestion(membership.planKey, {
      jobCount: jobs?.length ?? 0,
      cvCount: cvs?.length ?? 0,
      coverLetterCount: coverLetters?.length ?? 0,
    });
  }, [membership, jobs, cvs, coverLetters]);

  // Stable per-user A/B variant. Membership only resolves once authenticated,
  // so by the time the card is visible the user id (and thus variant) is final.
  const variant = useMemo<VariantId>(
    () => resolveVariant(session?.user?.id ?? null),
    [session?.user?.id]
  );

  const config = VARIANTS[variant];

  // Render-time gate (React's documented "adjust state during render" pattern):
  // waits for membership so the plan is known, applies the frequency cap, and
  // flips the card visible exactly once per mount. Running it at render time —
  // not in an effect — avoids the set-state-in-effect lint rule and the
  // flash-then-vanish behaviour if dashboard data arrives afterwards.
  if (!gateResolved && !membershipLoading && suggestion && shouldShow()) {
    setGateResolved(true);
    setVisible(true);
  }

  // Record the "last seen" timestamp so the card only appears occasionally,
  // not on every visit. Purely an external side effect (localStorage).
  useEffect(() => {
    if (!visible) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.lastSeenAt, String(Date.now()));
    } catch {
      // Storage unavailable (private mode etc.) — still show.
    }
  }, [visible]);

  // Log the impression exactly once per show for A/B measurement.
  useEffect(() => {
    if (!visible || impressionLoggedRef.current) return;
    impressionLoggedRef.current = true;
    track('upgrade_card_impression', {
      variant: variant,
      current_plan: membership?.planKey ?? null,
      suggested_plan: suggestion?.planKey ?? null,
      trigger: 'dashboard_home',
    });
  }, [visible, variant, membership?.planKey, suggestion?.planKey]);

  // Hides the card and applies the weekly dismissal cooldown. Only a true
  // dismiss (X) logs a dismissal event — upgrades log their own conversion.
  const hideCard = (reason: 'dismiss' | 'upgrade') => {
    setVisible(false);
    if (reason === 'dismiss') {
      track('upgrade_card_dismissed', {
        variant,
        current_plan: membership?.planKey ?? null,
        suggested_plan: suggestion?.planKey ?? null,
        trigger: 'dashboard_home',
      });
    }
    try {
      window.localStorage.setItem(STORAGE_KEYS.dismissedAt, String(Date.now()));
    } catch {
      // ignore
    }
  };

  const handleUpgrade = () => {
    if (!suggestion) return;
    // Conversion signal — feeds the impression → CTA → checkout funnel.
    track('upgrade_card_cta_clicked', {
      variant,
      current_plan: membership?.planKey ?? null,
      suggested_plan: suggestion.planKey,
      trigger: 'dashboard_home',
    });
    openPaymentModal({
      preselectedPlanKey: suggestion.planKey,
      // Variant travels through trigger_context on the payment_modal_opened
      // event too, so the impression → modal → checkout funnel stays joinable.
      triggerContext: `dashboard_home_upgrade_card:${variant}`,
      returnUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    });
    hideCard('upgrade');
  };

  const handleCompare = () => {
    router.push('/pricing');
  };

  if (!suggestion || !visible) return null;

  const Icon =
    suggestion.tier === 0 || suggestion.tier === 1
      ? Rocket
      : suggestion.tier === 2
        ? Zap
        : suggestion.tier === 3
          ? Bot
          : Crown;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="upgrade-suggestion-card"
          initial={{ opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }}
          className={`relative overflow-hidden rounded-xl border shadow-lg ${config.border}`}
          role="region"
          aria-label="Upgrade suggestion"
          data-testid="upgrade-suggestion-card"
          data-variant={variant}
        >
          {/* Dark gradient shell — self-contained so it pops in both themes */}
          <div className={`relative ${config.gradient} p-5 sm:p-6`}>
            {/* Glow ornaments */}
            <div className={`pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full blur-2xl ${config.glowA}`} />
            <div className={`pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full blur-2xl ${config.glowB}`} />
            <div className={`pointer-events-none absolute top-0 right-6 h-px w-24 bg-gradient-to-r from-transparent to-transparent ${config.hairline}`} />

            <div className="relative">
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${config.chip}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.chip}`}>
                      <Sparkles size={11} />
                      {config.eyebrow(suggestion)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => hideCard('dismiss')}
                  className="-m-1 shrink-0 rounded-md p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss upgrade suggestion"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Headline — the whole pitch, no prose paragraph */}
              <h3 className="mt-3 text-base font-semibold leading-snug text-white">
                {config.headline(suggestion)}
              </h3>

              {/* Feature ticks — compact vertical list */}
              <ul className="mt-3 space-y-1.5">
                {suggestion.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-medium text-white/80">
                    <CheckCircle2 size={14} className={`shrink-0 ${config.check}`} />
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Actions */}
              <div className="mt-4 flex items-center gap-2.5">
                <button
                  onClick={handleUpgrade}
                  className={`group inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all hover:brightness-110 hover:shadow-md ${config.ctaBtn}`}
                >
                  {config.cta(suggestion)}
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={handleCompare}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Compare plans
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
