'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, XCircle, ExternalLink, CheckCircle } from 'lucide-react';

interface TriageItem {
  id: string;
  candidateName: string;
  roleTitle: string;
  companyName: string;
  platform: string;
  reason: string;
  failedAt: string;
}

export default function FailedApplicationsQueue() {
  const [items, setItems] = useState<TriageItem[]>([
    {
      id: 'app-912',
      candidateName: 'Alex Mercer',
      roleTitle: 'Staff Backend Engineer',
      companyName: 'Linear',
      platform: 'Ashby',
      reason: 'Custom Captcha verification prompted on submit step',
      failedAt: '12 mins ago',
    },
    {
      id: 'app-844',
      candidateName: 'Sarah Jenkins',
      roleTitle: 'Product Designer',
      companyName: 'Figma',
      platform: 'Lever',
      reason: 'Mandatory portfolio password field detected',
      failedAt: '45 mins ago',
    },
  ]);

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-400" />
          Review & Triage Queue
        </h2>
        <p className="text-sm text-white/50">
          Applications that halted automated submission due to unsupported fields, custom Captchas, or auth challenges.
        </p>
      </div>

      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
            <tr>
              <th className="py-3.5 px-4">Candidate</th>
              <th className="py-3.5 px-4">Role & Company</th>
              <th className="py-3.5 px-4">Platform</th>
              <th className="py-3.5 px-4">Halt Reason</th>
              <th className="py-3.5 px-4">Timestamp</th>
              <th className="py-3.5 px-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-white/40">
                  🎉 No failed or review-required applications in queue.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white">
                    {item.candidateName}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-white">{item.roleTitle}</div>
                    <div className="text-[11px] text-white/50">{item.companyName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-emerald-400">
                    {item.platform}
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 max-w-xs">
                    {item.reason}
                  </td>
                  <td className="py-3.5 px-4 text-white/50">
                    {item.failedAt}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs transition-all"
                      >
                        Resolved
                      </button>
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-xs transition-all"
                      >
                        Dismiss
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
