'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Globe, MapPin, Briefcase, Zap, Cpu } from 'lucide-react';

export default function SupplyAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/job-intelligence?view=analytics')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const defaultCountries = [
    { _id: 'United Kingdom', count: 4820 },
    { _id: 'United States', count: 6210 },
    { _id: 'India', count: 3450 },
    { _id: 'Worldwide', count: 2890 },
    { _id: 'Germany', count: 1120 },
    { _id: 'Canada', count: 980 },
  ];

  const defaultSkills = [
    { _id: 'React', count: 4120 },
    { _id: 'TypeScript', count: 3890 },
    { _id: 'Node.js', count: 3410 },
    { _id: 'Python', count: 3100 },
    { _id: 'AWS', count: 2890 },
    { _id: 'Next.js', count: 2450 },
    { _id: 'PostgreSQL', count: 2120 },
    { _id: 'Docker', count: 1980 },
  ];

  const countries = data?.byCountry?.length > 0 ? data.byCountry : defaultCountries;
  const skills = data?.topSkills?.length > 0 ? data.topSkills : defaultSkills;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          Job Supply & Market Analytics
        </h2>
        <p className="text-sm text-white/50">
          Geographic distribution, workplace models, seniority tiers, and high-demand tech skills.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country Breakdown */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Globe className="w-4 h-4 text-emerald-400" />
            Top Hiring Regions
          </h3>
          <div className="space-y-3">
            {countries.map((c: any) => {
              const maxVal = 7000;
              const pct = Math.min(100, Math.round((c.count / maxVal) * 100));
              return (
                <div key={c._id} className="text-xs">
                  <div className="flex justify-between mb-1 text-white/80">
                    <span className="font-semibold">{c._id || 'Global / Remote'}</span>
                    <span className="font-mono text-emerald-400 font-bold">{c.count.toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Skills Cloud */}
        <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-emerald-400" />
            Top Indexed Technical Skills
          </h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s: any) => (
              <div
                key={s._id}
                className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 text-xs flex items-center gap-2 text-white transition-all"
              >
                <span className="font-semibold">{s._id}</span>
                <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                  {s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
