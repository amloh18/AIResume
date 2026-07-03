'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X, Minus } from 'lucide-react';

type CellValue = 'yes' | 'no' | 'partial';

interface Feature {
  category?: string;
  name: string;
  cvcircle: CellValue;
  zety: CellValue;
  resumeio: CellValue;
  kickresume: CellValue;
}

const features: Feature[] = [
  { category: 'Core Building',       name: 'ATS-Optimised Templates',          cvcircle: 'yes', zety: 'yes',     resumeio: 'yes',     kickresume: 'yes' },
  {                                   name: 'Custom ATS Templates',             cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'Unlimited CV & Cover Letter Edit',  cvcircle: 'yes', zety: 'partial', resumeio: 'partial', kickresume: 'partial' },
  {                                   name: 'Snippets (Reusable Blocks)',        cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  { category: 'AI & Intelligence',   name: 'Live ATS Scoring & Real-time Edit', cvcircle: 'yes', zety: 'partial', resumeio: 'no',      kickresume: 'partial' },
  {                                   name: 'AI Cover Letter Generator',         cvcircle: 'yes', zety: 'yes',     resumeio: 'yes',     kickresume: 'yes' },
  {                                   name: 'AI Interview Coach Simulator',      cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'LinkedIn Profile Enhancer',         cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'partial' },
  { category: 'Workflow',            name: 'Job Application Tracker',           cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'Auto Job Application Bot',          cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'Chrome Extension',                  cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'Permanent Career Vault',            cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  { category: 'Pricing & Support',   name: 'Transparent Flat Pricing',          cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'partial' },
  {                                   name: 'Free Plan (No Credit Card)',         cvcircle: 'yes', zety: 'no',      resumeio: 'no',      kickresume: 'no' },
  {                                   name: 'Priority / VIP Support',            cvcircle: 'yes', zety: 'partial', resumeio: 'partial', kickresume: 'partial' },
];

const competitors = [
  { key: 'cvcircle',   label: 'CVCircle',   highlight: true  },
  { key: 'zety',       label: 'Zety',       highlight: false },
  { key: 'resumeio',   label: 'Resume.io',  highlight: false },
  { key: 'kickresume', label: 'Kickresume', highlight: false },
] as const;

type CompetitorKey = (typeof competitors)[number]['key'];

// Group features by category
function groupFeatures(items: Feature[]) {
  const groups: { category: string | null; rows: Feature[] }[] = [];
  let current: { category: string | null; rows: Feature[] } | null = null;
  for (const f of items) {
    if (f.category !== undefined) {
      current = { category: f.category, rows: [] };
      groups.push(current);
    }
    if (!current) { current = { category: null, rows: [] }; groups.push(current); }
    current.rows.push(f);
  }
  return groups;
}

const CellIcon = ({ value, isHighlight }: { value: CellValue; isHighlight: boolean }) => {
  if (value === 'yes') return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${isHighlight ? 'bg-[#81ff00]/20' : 'bg-white/[0.06]'}`}>
      <Check className={`w-3.5 h-3.5 ${isHighlight ? 'text-[#81ff00]' : 'text-white/35'}`} strokeWidth={3} />
    </span>
  );
  if (value === 'partial') return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400/10">
      <Minus className="w-3 h-3 text-amber-400/60" strokeWidth={2.5} />
    </span>
  );
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/[0.04]">
      <X className="w-3 h-3 text-white/15" strokeWidth={2.5} />
    </span>
  );
};

const CompetitorComparison: React.FC = () => {
  const grouped = groupFeatures(features);
  const scores = Object.fromEntries(
    competitors.map(c => [c.key, features.filter(f => f[c.key as CompetitorKey] === 'yes').length])
  ) as Record<CompetitorKey, number>;

  return (
    <section className="relative pt-32 pb-20 bg-[#141810] overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-4 tablet:px-6 desktop:px-8">

        {/* ── Header ── */}
        <div className="mb-16">
          {/* Squiggle — same as other sections */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <svg width="48" height="24" viewBox="0 0 48 24" fill="none" className="text-[#81ff00]">
              <path
                d="M2 12C8 4 12 20 18 12C24 4 28 20 34 12C40 4 46 12 46 12"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>

          <motion.h2
            className="!text-[2rem] tablet:!text-[2.5rem] desktop:!text-[3rem] font-extrabold text-white mb-3 tracking-tighter !leading-[1.05]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-lime-400 to-lime-500">
              We go further
            </span>{' '}
            than the competition.
          </motion.h2>
          <motion.p
            className="text-h3 text-gray-400 max-w-2xl leading-relaxed text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            Most resume builders stop at templates — CVCircle gives you the full stack.
          </motion.p>
        </div>

        {/* ── Score summary cards ── */}
        <motion.div
          className="grid grid-cols-2 desktop:grid-cols-4 gap-4 mb-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {competitors.map((comp) => {
            const score = scores[comp.key];
            const pct = Math.round((score / features.length) * 100);
            return (
              <div
                key={comp.key}
                className={`relative rounded-2xl p-5 border transition-all ${
                  comp.highlight
                    ? 'bg-[#81ff00]/[0.07] border-[#81ff00]/25 shadow-lg shadow-[#81ff00]/5'
                    : 'bg-white/[0.03] border-white/[0.07]'
                }`}
              >
                {comp.highlight && (
                  <span className="absolute -top-2.5 left-4 text-[9px] font-extrabold uppercase tracking-widest bg-[#81ff00] text-black px-2 py-0.5 rounded-full">
                    Best
                  </span>
                )}
                <p className={`text-small font-semibold mb-2 ${comp.highlight ? 'text-[#81ff00]' : 'text-gray-400'}`}>
                  {comp.label}
                </p>
                <p className={`text-h1 font-extrabold leading-none ${comp.highlight ? 'text-[#81ff00]' : 'text-white/30'}`}>
                  {pct}<span className="text-small font-bold">%</span>
                </p>
                <div className="w-full h-1 rounded-full bg-white/10 mt-3">
                  <motion.div
                    className={`h-1 rounded-full ${comp.highlight ? 'bg-[#81ff00]' : 'bg-white/20'}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
                <p className="text-[10px] text-white/25 mt-1.5">{score} / {features.length} features</p>
              </div>
            );
          })}
        </motion.div>

        {/* ── Table ── */}
        <motion.div
          className="rounded-2xl border border-white/[0.08] overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[560px]">

              {/* thead */}
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.03]">
                  <th className="p-4 text-left w-[36%] sticky left-0 bg-[#1a2015] z-10 border-r border-white/[0.06]">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#81ff00]/70">Feature</span>
                  </th>
                  {competitors.map((comp) => (
                    <th
                      key={comp.key}
                      className={`p-4 text-center w-[16%] ${
                        comp.highlight ? 'bg-[#81ff00]/[0.05] border-x border-[#81ff00]/20' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        {comp.highlight && (
                          <span className="text-[8px] font-extrabold uppercase tracking-widest bg-[#81ff00] text-black px-1.5 py-0.5 rounded-full">
                            Us
                          </span>
                        )}
                        <span className={`text-small font-bold ${comp.highlight ? 'text-[#81ff00]' : 'text-white/40'}`}>
                          {comp.label}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* tbody */}
              <tbody>
                {grouped.map((group, gIdx) => (
                  <React.Fragment key={gIdx}>
                    {/* Category label row */}
                    {group.category && (
                      <tr className="border-b border-white/[0.06] bg-white/[0.015]">
                        <td
                          colSpan={5}
                          className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/25 sticky left-0 bg-[#1c2418] border-r border-white/[0.06]"
                        >
                          {group.category}
                        </td>
                      </tr>
                    )}

                    {/* Feature rows */}
                    {group.rows.map((feature, fIdx) => {
                      const isLast = fIdx === group.rows.length - 1;
                      return (
                        <motion.tr
                          key={feature.name}
                          className="group hover:bg-[#81ff00]/[0.02] transition-colors duration-150"
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.35, delay: 0.05 * fIdx + gIdx * 0.04, ease: 'easeOut' }}
                        >
                          {/* Feature name */}
                          <td
                            className={`px-4 py-3.5 text-small font-medium text-gray-300 sticky left-0 bg-[#141810] group-hover:bg-[#1a2015] transition-colors z-10 border-r border-white/[0.06] ${
                              isLast ? 'border-b border-white/[0.08]' : 'border-b border-white/[0.04]'
                            }`}
                          >
                            {feature.name}
                          </td>

                          {/* Value cells */}
                          {competitors.map((comp) => {
                            const val = feature[comp.key as CompetitorKey];
                            return (
                              <td
                                key={comp.key}
                                className={`px-4 py-3.5 text-center ${
                                  isLast ? 'border-b border-white/[0.08]' : 'border-b border-white/[0.04]'
                                } ${
                                  comp.highlight
                                    ? 'bg-[#81ff00]/[0.03] border-x border-[#81ff00]/[0.08] group-hover:bg-[#81ff00]/[0.06]'
                                    : 'group-hover:bg-white/[0.01]'
                                }`}
                              >
                                <div className="flex items-center justify-center">
                                  <CellIcon value={val} isHighlight={comp.highlight} />
                                </div>
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>

              {/* tfoot — totals */}
              <tfoot>
                <tr className="border-t border-white/[0.08] bg-white/[0.03]">
                  <td className="px-4 py-4 text-small font-bold text-white/60 sticky left-0 bg-[#1a2015] border-r border-white/[0.06]">
                    Features Covered
                  </td>
                  {competitors.map((comp) => {
                    const score = scores[comp.key];
                    const pct = Math.round((score / features.length) * 100);
                    return (
                      <td
                        key={comp.key}
                        className={`px-4 py-4 text-center ${
                          comp.highlight ? 'bg-[#81ff00]/[0.07] border-x border-[#81ff00]/20' : ''
                        }`}
                      >
                        <span className={`text-h3 font-extrabold ${comp.highlight ? 'text-[#81ff00]' : 'text-white/25'}`}>
                          {pct}%
                        </span>
                        <p className="text-[10px] text-white/25 mt-0.5">{score}/{features.length}</p>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </motion.div>

        {/* ── Legend ── */}
        <motion.div
          className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#81ff00]/20">
              <Check className="w-3 h-3 text-[#81ff00]" strokeWidth={3} />
            </span>
            <span className="text-[11px] text-gray-500">Fully supported</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-400/10">
              <Minus className="w-3 h-3 text-amber-400/60" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] text-gray-500">Partial / limited</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.04]">
              <X className="w-2.5 h-2.5 text-white/20" strokeWidth={2.5} />
            </span>
            <span className="text-[11px] text-gray-500">Not available</span>
          </div>
          <p className="text-[10px] text-white/20 tablet:ml-auto">
            *Based on publicly available information as of 2025.
          </p>
        </motion.div>

      </div>
    </section>
  );
};

export default CompetitorComparison;
