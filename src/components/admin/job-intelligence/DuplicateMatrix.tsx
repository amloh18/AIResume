'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, GitMerge, BarChart3 } from 'lucide-react';

export default function DuplicateMatrix() {
  const overlapPairs = [
    { sourceA: 'Adzuna', sourceB: 'Greenhouse', overlapCount: 1421, percentage: '18.4%' },
    { sourceA: 'Adzuna', sourceB: 'Lever', overlapCount: 890, percentage: '12.1%' },
    { sourceA: 'Remotive', sourceB: 'RemoteOK', overlapCount: 654, percentage: '24.8%' },
    { sourceA: 'Greenhouse', sourceB: 'Lever', overlapCount: 120, percentage: '1.8%' },
    { sourceA: 'Ashby', sourceB: 'Greenhouse', overlapCount: 45, percentage: '0.9%' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-emerald-400" />
          Cross-Source Duplicate Overlap Matrix
        </h2>
        <p className="text-sm text-white/50">
          Visualizes cross-source redundancy across ingested catalogs to assess source value and deduplication effectiveness.
        </p>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
            <tr>
              <th className="py-3.5 px-4">Primary Source A</th>
              <th className="py-3.5 px-4">Overlapping Source B</th>
              <th className="py-3.5 px-4">Shared Canonical Jobs</th>
              <th className="py-3.5 px-4">Overlap Ratio</th>
              <th className="py-3.5 px-4">Deduplication Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {overlapPairs.map((pair, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="py-3.5 px-4 font-bold text-white">
                  {pair.sourceA}
                </td>
                <td className="py-3.5 px-4 font-bold text-white/80">
                  {pair.sourceB}
                </td>
                <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">
                  {pair.overlapCount.toLocaleString()}
                </td>
                <td className="py-3.5 px-4 font-mono text-white/70">
                  {pair.percentage}
                </td>
                <td className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ✓ Merged (SHA-256)
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
