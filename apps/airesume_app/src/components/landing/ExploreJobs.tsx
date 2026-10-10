'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  Search,
  Sliders,
  MapPin,
  Sparkles,
  Check,
  Bot,
  Send,
  Bookmark,
  Eye,
  Briefcase,
  Zap,
} from 'lucide-react';

/**
 * Landing section: job discovery + auto-apply.
 *
 * Two product pillars that sit either side of the authentication boundary, and
 * the copy says so on purpose:
 *
 *   - **Explore Jobs is public.** No account, no sign-in wall — the CTA goes
 *     straight to `/explore/jobs`.
 *   - **Auto-apply needs an account.** It consumes the application pipeline and
 *     plan quota, so the CTA routes to sign-up rather than pretending it is free.
 *
 * The visuals are mockups in the same idiom as the rest of the landing page
 * (`Features`, `HowItWorks`, `ChromeExtension`). Nothing here calls an API.
 */
export default function ExploreJobs() {
  const [typedText, setTypedText] = useState('');
  const fullText = 'Product Designer • Remote';

  // Typing animation for the search field — same treatment as the Features tile.
  useEffect(() => {
    let index = 0;
    let isDeleting = false;
    const interval = setInterval(() => {
      if (!isDeleting) {
        setTypedText(fullText.slice(0, index + 1));
        index++;
        if (index === fullText.length) {
          setTimeout(() => {
            isDeleting = true;
          }, 1800);
        }
      } else {
        setTypedText(fullText.slice(0, index - 1));
        index--;
        if (index === 0) isDeleting = false;
      }
    }, 90);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="explore-jobs" className="relative pt-28 pb-32 bg-[#0a0a0c] overflow-hidden">
      {/* Background ambient glows — matches the Features section. */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 15% 20%, rgba(1, 63, 46, 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 55% 45% at 85% 40%, rgba(20, 184, 166, 0.09) 0%, transparent 65%),
            radial-gradient(ellipse 70% 50% at 50% 90%, rgba(1, 63, 46, 0.2) 0%, transparent 65%),
            linear-gradient(180deg, #0a0a0c 0%, #0e1013 50%, #060708 100%)
          `,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">
        {/* ── Heading ─────────────────────────────────────────────────── */}
        <motion.div
          className="mb-14 lg:mb-16 flex flex-col items-start text-left"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 flex justify-start">
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] tracking-tighter max-w-5xl mb-6 text-left text-4xl! tracking-normal!">
            Discover jobs.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">
              Apply on autopilot.
            </span>
          </h2>

          <p className="text-lg sm:text-xl lg:text-2xl text-gray-300 font-normal max-w-3xl leading-relaxed text-left">
            Browse thousands of live roles for free — no account needed. When you&apos;re ready,
            AIResume tailors your CV and cover letter and submits the application for you.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/explore/jobs"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#36D39B] text-[#013f2e] text-sm font-extrabold hover:brightness-105 transition-all shadow-[0_0_25px_rgba(54,211,155,0.25)]"
            >
              <Search className="w-4 h-4" />
              Explore Jobs — free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-white/15 bg-white/[0.04] text-white text-sm font-bold hover:bg-white/[0.08] transition-colors"
            >
              <Zap className="w-4 h-4 text-[#36D39B]" />
              Start auto-applying
            </Link>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Browsing is public. Auto-apply needs a free account — it uses your application quota.
          </p>
        </motion.div>

        {/* ── Two panels ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* ============ LEFT: Explore Jobs (public) ============ */}
          <motion.div
            className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Eye className="w-3 h-3" /> No account needed
            </div>

            <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
              Explore Jobs
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Search by title, company, skills and location. Filter by remote, experience, employment
              type and posting date. Read every listing in full — then decide whether to apply.
            </p>

            {/* Search bar mock */}
            <div className="rounded-2xl bg-[#090a0d] border border-white/[0.06] p-4">
              <div className="relative flex items-center bg-[#13161c] border border-emerald-500/30 rounded-full px-4 py-3 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <Search className="w-4 h-4 text-emerald-400 shrink-0 mr-3" />
                <span className="text-xs text-white font-medium flex-1 truncate">
                  {typedText}
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-400 ml-0.5 animate-pulse" />
                </span>
                <Sliders className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="text-[10px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-medium">
                  Remote
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-medium">
                  Full-time
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-medium">
                  Past 7 days
                </span>
                <span className="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2.5 py-0.5 rounded-full font-medium">
                  Mid level
                </span>
              </div>
            </div>

            {/* Result cards mock */}
            <div className="mt-3 space-y-2">
              {[
                { company: 'Linear', role: 'Senior Product Designer', loc: 'Remote · EU', tag: 'Design', fresh: 'Just posted' },
                { company: 'Stripe', role: 'Frontend Engineer', loc: 'Berlin, Germany', tag: 'Engineering', fresh: '2h ago' },
                { company: 'Figma', role: 'Product Designer II', loc: 'London, UK', tag: 'Design', fresh: '1d ago' },
              ].map((job, i) => (
                <motion.div
                  key={job.company}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#13161c] border border-white/5 hover:border-emerald-500/30 transition-colors"
                  initial={{ opacity: 0, x: -12 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1d222e] border border-white/10 flex items-center justify-center text-[10px] font-bold text-emerald-400 shrink-0">
                      {job.company.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-white truncate">{job.role}</div>
                      <div className="text-[9px] text-gray-400 flex items-center gap-1 truncate">
                        <span className="truncate">{job.company}</span>
                        <span className="opacity-40">·</span>
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{job.loc}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="hidden sm:inline text-[9px] text-orange-400 font-semibold">{job.fresh}</span>
                    <span className="text-[9px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                      {job.tag}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>

            <Link
              href="/explore/jobs"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors"
            >
              Browse all open roles <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* ============ RIGHT: Auto-Apply (needs account) ============ */}
          <motion.div
            className="group relative rounded-3xl bg-[#111317]/80 border border-white/[0.08] hover:border-white/20 p-7 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(1,63,46,0.2)]"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-1.5 self-start px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider mb-3">
              <Bot className="w-3 h-3" /> Auto-Apply Worker
            </div>

            <h3 className="text-xl font-bold text-white mb-2 tracking-tight group-hover:text-emerald-400 transition-colors">
              Apply on autopilot
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Pick a role, approve the tailored CV and cover letter, and let the deterministic engine
              fill the ATS form and submit. You review; it does the typing.
            </p>

            {/* Pipeline mock */}
            <div className="rounded-2xl bg-[#090a0d] border border-white/[0.06] p-3.5 flex flex-col gap-2">
              <div className="flex items-center justify-between pb-2 border-b border-white/5 text-[10px]">
                <span className="flex items-center gap-1.5 font-medium text-white">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Application pipeline
                </span>
                <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                  3 in flight
                </span>
              </div>

              {[
                { c: 'Linear', r: 'Senior Product Designer', ats: 'Greenhouse ATS', state: 'Submitted' },
                { c: 'Stripe', r: 'Frontend Engineer', ats: 'Auto-filling form fields…', state: 'Applying' },
                { c: 'Figma', r: 'Product Designer II', ats: 'Lever ATS', state: 'Queued' },
              ].map((row, i) => {
                const isApplying = row.state === 'Applying';
                const isSubmitted = row.state === 'Submitted';
                return (
                  <div
                    key={row.c}
                    className={`relative flex items-center justify-between p-2 rounded-lg bg-[#13161c] text-[11px] overflow-hidden ${
                      isApplying ? 'border border-emerald-500/30' : 'border border-white/5'
                    }`}
                  >
                    {isApplying && (
                      <motion.div
                        className="absolute inset-y-0 left-0 bg-emerald-500/10 pointer-events-none"
                        animate={{ width: ['20%', '85%', '20%'] }}
                        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )}
                    <div className="flex items-center gap-2 min-w-0 relative z-10">
                      <div
                        className={`w-5 h-5 rounded-md bg-[#1d222e] border border-white/10 flex items-center justify-center text-[9px] font-bold shrink-0 ${
                          isSubmitted ? 'text-emerald-400' : isApplying ? 'text-teal-300' : 'text-gray-400'
                        }`}
                      >
                        {row.c.charAt(0)}
                      </div>
                      <div className="min-w-0 truncate">
                        <div className="font-semibold text-white truncate text-[11px]">
                          {row.c} • {row.r}
                        </div>
                        <div className="text-[9px] text-gray-400 truncate">{row.ats}</div>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 relative z-10 ${
                        isSubmitted
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                          : isApplying
                            ? 'text-teal-300 bg-teal-500/10 border border-teal-500/30'
                            : 'text-gray-400 bg-white/5 border border-white/10'
                      }`}
                    >
                      {isSubmitted && <Check className="w-2.5 h-2.5" />}
                      {isApplying && <span className="w-1.5 h-1.5 rounded-full bg-teal-300 animate-ping" />}
                      {row.state}
                    </span>
                  </div>
                );
              })}

              <div className="mt-1 pt-2.5 border-t border-white/5 flex items-center justify-between text-[10px]">
                <span className="text-gray-400 flex items-center gap-1.5">
                  <Send className="w-3 h-3 text-emerald-400" />
                  Quota used this month
                </span>
                <span className="text-emerald-400 font-mono font-bold">7 / 50</span>
              </div>
            </div>

            {/* Mini benefit strip */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
              {[
                { icon: <Bookmark className="w-3 h-3" />, label: 'Saved & tracked' },
                { icon: <Sparkles className="w-3 h-3" />, label: 'Tailored CV + letter' },
                { icon: <Briefcase className="w-3 h-3" />, label: 'ATS field autofill' },
                { icon: <Check className="w-3 h-3" />, label: 'Approval before submit' },
              ].map((b) => (
                <span
                  key={b.label}
                  className="flex items-center gap-1.5 text-gray-300 bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-2"
                >
                  <span className="text-emerald-400 shrink-0">{b.icon}</span>
                  {b.label}
                </span>
              ))}
            </div>

            <Link
              href="/sign-up"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-300 group-hover:text-emerald-400 transition-colors"
            >
              Create a free account to apply <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
