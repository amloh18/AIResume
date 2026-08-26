'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  Check, 
  Sparkles, 
  Bot, 
  Mail, 
  Search, 
  FileText, 
  CheckCircle2, 
  Calendar,
  Send,
  Trophy,
  ExternalLink
} from 'lucide-react';
import { MorphGrid, ShapeKey } from '@/components/landing/MorphGrid';

interface StoryCardProps {
  stepNumber: string;
  badge: string;
  title: string;
  subtitle: string;
  shape: ShapeKey;
  ctaText: string;
  ctaHref: string;
  secondaryCtaText?: string;
  secondaryCtaHref?: string;
  theme?: 'dark' | 'emerald' | 'gradient' | 'glass';
  metrics?: { label: string; value: string };
  tags?: string[];
  renderCustomVisual?: () => React.ReactNode;
}

// Stage 1 Custom Visual: Live Job Board Sourcing Radar
const SourcingVisual = () => {
  const sources = [
    { name: 'LinkedIn', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    { name: 'Indeed', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { name: 'Greenhouse', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Workday', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  ];

  return (
    <div className="w-full flex flex-col gap-2.5 p-3 rounded-2xl bg-[#080d0a] border border-emerald-500/20 shadow-inner">
      <div className="flex items-center justify-between text-[10px] text-gray-400 pb-1 border-b border-white/5">
        <span className="flex items-center gap-1 text-emerald-400 font-mono">
          <Search className="w-3 h-3" /> Auto-Detect Active
        </span>
        <span className="text-[9px] bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 px-1.5 py-0.2 rounded-full font-bold">
          1-Click Sync
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {sources.map((src, i) => (
          <motion.div
            key={src.name}
            initial={{ opacity: 0.7 }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3, delay: i * 0.5, repeat: Infinity }}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${src.color}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="truncate">{src.name}</span>
          </motion.div>
        ))}
      </div>
      <div className="text-[10px] text-gray-400 text-center font-mono">
        +100 Job Boards &amp; Careers Pages Supported
      </div>
    </div>
  );
};

// Stage 2 Custom Visual: Instant Tracker Pipeline
const TrackerVisual = () => {
  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-[#080d0a] border border-emerald-500/20 shadow-inner">
      <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-white/5 font-mono">
        <span className="text-gray-300 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Event: User Clicked Apply
        </span>
        <span className="text-emerald-400 font-bold">Auto-Logged</span>
      </div>
      <div className="space-y-1.5 text-[10px]">
        <div className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-white/5 text-gray-300">
          <span className="font-semibold text-white">Senior Full-Stack Lead</span>
          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/40">
            Parsed
          </span>
        </div>
        <div className="flex items-center justify-between p-1.5 rounded bg-white/5 border border-white/5 text-gray-300">
          <span className="text-gray-400">Deadline &amp; Recruiter Info</span>
          <span className="text-emerald-400 font-mono text-[9px]">Captured ✓</span>
        </div>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1">
        <motion.div
          className="h-full bg-gradient-to-r from-emerald-500 to-teal-300"
          animate={{ width: ['0%', '100%'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </div>
  );
};

// Stage 3 Custom Visual: Tailored Document Match Matrix
const TailoredDocsVisual = () => {
  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-[#080d0a] border border-emerald-500/20 shadow-inner">
      <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-white/5">
        <span className="flex items-center gap-1 font-bold text-white">
          <FileText className="w-3 h-3 text-emerald-400" /> Tailored CV &amp; Cover Letter
        </span>
        <span className="text-emerald-400 font-mono font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40">
          98.4% Match
        </span>
      </div>
      <div className="space-y-1 text-[10px]">
        <div className="flex items-center justify-between text-gray-300">
          <span>Target Keywords Calibrated</span>
          <span className="text-emerald-400 font-mono font-bold">14/14</span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span>STAR Impact Metrics Added</span>
          <span className="text-teal-300 font-mono font-bold">100%</span>
        </div>
        <div className="flex items-center justify-between text-gray-300">
          <span>ATS Formatting Traps</span>
          <span className="text-emerald-400 font-mono font-bold">0 Detected</span>
        </div>
      </div>
      <div className="mt-1 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-gray-400">
        <span>Ready for 1-Click Submission</span>
        <span className="text-white font-bold">PDF &amp; DOCX</span>
      </div>
    </div>
  );
};

// Stage 4 Custom Visual: Linked Email AI Agent Simulator
const EmailAgentVisual = () => {
  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl bg-[#080d0a] border border-emerald-500/20 shadow-inner">
      <div className="flex items-center justify-between text-[10px] pb-1.5 border-b border-white/5">
        <span className="flex items-center gap-1 text-emerald-400 font-bold">
          <Bot className="w-3.5 h-3.5 text-emerald-400" /> AI Career Agent
        </span>
        <span className="text-[9px] bg-blue-950/60 border border-blue-800/40 text-blue-300 px-1.5 py-0.5 rounded-full font-mono">
          Inbox Linked
        </span>
      </div>
      <div className="space-y-2 text-[10px]">
        {/* Recruiter Message */}
        <div className="p-2 rounded-lg bg-white/5 border border-white/5 text-gray-300">
          <p className="text-[9px] text-gray-400 font-semibold mb-0.5 flex items-center gap-1">
            <Mail className="w-2.5 h-2.5 text-blue-400" /> Recruiter: &quot;Interview Invitation&quot;
          </p>
          <p className="text-[10px] text-white/90 truncate">&quot;We loved your tailored CV! Free for 30m?&quot;</p>
        </div>
        {/* Agent Response */}
        <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/30 text-emerald-200">
          <p className="text-[9px] text-emerald-400 font-semibold mb-0.5 flex items-center gap-1">
            <Send className="w-2.5 h-2.5" /> AI Agent: Auto-Followup
          </p>
          <p className="text-[10px] text-emerald-300 truncate">&quot;Slot confirmed for Thursday at 2:00 PM.&quot;</p>
        </div>
      </div>
    </div>
  );
};

// Stage 5 Custom Visual: Accepted Offer Celebration
const OfferAcceptedVisual = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4 rounded-2xl bg-gradient-to-br from-[#0c2419] to-[#06140e] border border-emerald-400/30 shadow-inner text-center">
      <div className="w-8 h-8 rounded-full bg-emerald-400/20 border border-emerald-400/40 flex items-center justify-center mb-2">
        <Trophy className="w-4 h-4 text-emerald-300" />
      </div>
      <div className="text-xs font-black text-white uppercase tracking-wider mb-0.5">
        Offer Letter Accepted!
      </div>
      <p className="text-[11px] text-emerald-300 font-mono font-bold mb-2">
        Senior Full-Stack Engineer • £95,000
      </p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400 text-black text-[10px] font-extrabold shadow-lg">
        <CheckCircle2 className="w-3 h-3 stroke-[3]" /> Status: Hired
      </div>
    </div>
  );
};

export const FeatureStoryCard: React.FC<StoryCardProps> = ({
  stepNumber,
  badge,
  title,
  subtitle,
  shape,
  ctaText,
  ctaHref,
  secondaryCtaText,
  secondaryCtaHref,
  theme = 'dark',
  metrics,
  tags,
  renderCustomVisual,
}) => {
  const cardBg = {
    dark: 'bg-[#0b120e] border-emerald-500/20 hover:border-emerald-400/40 text-white',
    emerald: 'bg-gradient-to-b from-[#013f2e] to-[#04261c] border-emerald-400/30 text-white',
    gradient: 'bg-gradient-to-br from-[#0e2118] via-[#09150f] to-[#050d09] border-emerald-500/25 text-white',
    glass: 'bg-[#0e1612]/90 backdrop-blur-xl border-white/10 hover:border-emerald-400/30 text-white',
  }[theme];

  return (
    <motion.div
      whileHover={{ y: -8, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`relative w-[290px] sm:w-[335px] h-[520px] sm:h-[550px] rounded-3xl p-6 sm:p-7 flex flex-col justify-between overflow-hidden shadow-2xl border shrink-0 transition-shadow duration-300 hover:shadow-[0_12px_40px_rgba(1,63,46,0.4)] ${cardBg}`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold tracking-tight text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {stepNumber} • {badge}
          </span>
          {metrics && (
            <div className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-[11px] font-mono font-bold text-emerald-300">
              {metrics.value}
            </div>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug mb-2.5">
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-gray-300/85 leading-relaxed">
          {subtitle}
        </p>

        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-emerald-300 font-medium">
                <Check className="w-2.5 h-2.5 text-emerald-400" /> {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Middle Visual Element: Custom Animated Stage Visual + MorphGrid */}
      <div className="my-auto flex flex-col items-center justify-center py-2 w-full">
        {renderCustomVisual ? (
          renderCustomVisual()
        ) : (
          <MorphGrid activeShape={shape} size="sm" />
        )}
      </div>

      {/* Bottom Actions */}
      <div className="pt-2 flex flex-col gap-2">
        {ctaText && ctaHref && (
          <Link
            href={ctaHref}
            className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#013f2e] hover:bg-[#025c43] text-white font-bold text-xs tracking-wide transition-colors duration-200 shadow-md"
          >
            <span>{ctaText}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {secondaryCtaText && secondaryCtaHref && (
          <Link
            href={secondaryCtaHref}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 font-semibold text-xs transition-colors duration-200"
          >
            <span>{secondaryCtaText}</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </motion.div>
  );
};

export const FeatureReel: React.FC = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const stages: StoryCardProps[] = [
    {
      stepNumber: 'Stage 01',
      badge: 'Source & Discover',
      title: 'Search Job Boards or Import from LinkedIn',
      subtitle: 'Discover verified roles across LinkedIn, Indeed, Greenhouse, or your target company portal and pull job specs in 1 click.',
      shape: 'nodesHub',
      ctaText: 'Search Job Openings',
      ctaHref: '/dashboard/jobs',
      theme: 'emerald',
      metrics: { label: 'Supported', value: '100+ Boards' },
      tags: ['1-Click Extractor', 'Visa Tagging', 'Live Specs'],
      renderCustomVisual: () => <SourcingVisual />,
    },
    {
      stepNumber: 'Stage 02',
      badge: 'Instant Tracking',
      title: "1-Click 'Apply' Auto-Tracks Everything",
      subtitle: 'The moment you click Apply, our tracker automatically logs company details, salary data, recruiter info, and submission deadlines.',
      shape: 'growthArrow',
      ctaText: 'Explore Application Tracker',
      ctaHref: '/dashboard',
      theme: 'dark',
      metrics: { label: 'Time Saved', value: 'Zero Manual Entry' },
      tags: ['Auto-Sync', 'Deadline Alerts', 'Status Board'],
      renderCustomVisual: () => <TrackerVisual />,
    },
    {
      stepNumber: 'Stage 03',
      badge: 'Tailored Docs',
      title: 'Generate Tailored CV & Cover Letter',
      subtitle: 'Transform your master profile into hyper-targeted documents calibrated with semantic keywords, STAR metrics, and 98%+ ATS scoring.',
      shape: 'verifiedShield',
      ctaText: 'Build Tailored CV',
      ctaHref: '/ai-resume-builder',
      theme: 'gradient',
      metrics: { label: 'ATS Score', value: '98.4% ATS' },
      tags: ['Exact Keywords', 'STAR Bullets', 'No Traps'],
      renderCustomVisual: () => <TailoredDocsVisual />,
    },
    {
      stepNumber: 'Stage 04',
      badge: 'Email Agent',
      title: 'Link Email — AI Agent Runs Communication',
      subtitle: 'Connect your email so our autonomous career agent drafts recruiter replies, handles follow-ups, and schedules interview slots for you.',
      shape: 'stepChart',
      ctaText: 'Explore AI Agent',
      ctaHref: '/features',
      theme: 'glass',
      metrics: { label: 'Agent Sync', value: '24/7 Autopilot' },
      tags: ['Interview Scheduler', 'Follow-up Bot', 'Inbox Sync'],
      renderCustomVisual: () => <EmailAgentVisual />,
    },
    {
      stepNumber: 'Stage 05',
      badge: 'Offer Stage',
      title: 'From Application to Accepted Offer',
      subtitle: 'Seamlessly transition from application submission to final offer acceptance. Land dream interviews with an unfair advantage.',
      shape: 'happyFace',
      ctaText: 'Start Free Application',
      ctaHref: '/sign-up',
      secondaryCtaText: 'View All Plans',
      secondaryCtaHref: '/#pricing',
      theme: 'emerald',
      metrics: { label: 'Success Rate', value: '3x Callbacks' },
      tags: ['Offer Review', 'Salary Advice', '100% Free Start'],
      renderCustomVisual: () => <OfferAcceptedVisual />,
    },
  ];

  return (
    <section className="relative py-24 bg-[#0a0a0c] overflow-hidden">
      {/* Background ambient glow */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 40% at 50% 50%, rgba(1, 63, 46, 0.25) 0%, transparent 70%)'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-6"
        >
          <div>
            {/* Decorative Squiggle */}
            <div className="mb-4">
              <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#36D39B]">
                <path
                  d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 inline mr-1" /> Complete Application Pipeline
              </span>
            </div>

            <h2 className="tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-[#F5F7F7] tracking-tighter text-4xl!">
              Engineered for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#36D39B] via-[#4DDCB0] to-[#86E8D1]">every stage</span>.
            </h2>
          </div>

          <p className="text-sm sm:text-base text-gray-300 max-w-lg leading-relaxed">
            From initial job discovery and 1-click tracking to tailored ATS documents and automated email communication — manage your entire application lifecycle until your offer is accepted.
          </p>
        </motion.div>
      </div>

      {/* Horizontal Story Reel Strip */}
      <div 
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto no-scrollbar px-4 tablet:px-8 desktop:px-12 py-6 cursor-grab active:cursor-grabbing scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {stages.map((stage, idx) => (
          <div key={idx} style={{ scrollSnapAlign: 'start' }}>
            <FeatureStoryCard {...stage} />
          </div>
        ))}
      </div>
    </section>
  );
};
