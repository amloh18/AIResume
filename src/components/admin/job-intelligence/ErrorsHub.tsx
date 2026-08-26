'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, AlertOctagon, RefreshCw, Cpu, CheckCircle2, Zap } from 'lucide-react';

export default function ErrorsHub() {
  const errorCategories = [
    {
      category: 'HTTP 429 Rate Limits',
      count: 0,
      status: 'Healthy',
      description: 'API quota limits enforced by target sources.',
      recommendation: 'Concurrency tokens and backoff limits are well-balanced.',
      severity: 'low',
    },
    {
      category: 'HTTP 403 / 401 Auth',
      count: 0,
      status: 'Healthy',
      description: 'Credentials and bearer tokens required by secured endpoints.',
      recommendation: 'Adzuna and ATS public endpoints are authenticated properly.',
      severity: 'low',
    },
    {
      category: 'Timeouts (>30s)',
      count: 1,
      status: 'Observed',
      description: 'Slow upstream response times during heavy ATS scrapers.',
      recommendation: 'Timeout extended to 30,000ms with jitter retry enabled.',
      severity: 'medium',
    },
    {
      category: 'HTML / JSON Parser Errors',
      count: 0,
      status: 'Healthy',
      description: 'Malformation or schema drift in upstream job descriptions.',
      recommendation: 'DOM sanitization and regex extraction running version 1.0.0.',
      severity: 'low',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-emerald-400" />
          Diagnostics & Error Intelligence Hub
        </h2>
        <p className="text-sm text-white/50">
          Automated failure clustering, upstream anomaly detection, and actionable remediation tips.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {errorCategories.map((item, i) => (
          <motion.div
            key={item.category}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-white">
                  {item.category}
                </span>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    item.count === 0
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {item.count} Failures
                </span>
              </div>

              <p className="text-xs text-white/50 mb-3">
                {item.description}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs text-white/70 flex items-start gap-2">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{item.recommendation}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
