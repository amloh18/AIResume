'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, Filter, ExternalLink, MapPin, Building, DollarSign, X, CheckCircle, RefreshCw } from 'lucide-react';

export default function LiveJobsBrowser() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/job-intelligence?view=jobs&page=${page}&limit=20&q=${encodeURIComponent(
          search
        )}&status=${status}`
      );
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error('Fetch live jobs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [page, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            Live Jobs Explorer
          </h2>
          <p className="text-sm text-white/50">
            Browse, search, and inspect all normalized catalog jobs across all sources.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search title, company, skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-500 transition-all"
          >
            <option value="active" className="bg-[#121212]">Active</option>
            <option value="stale" className="bg-[#121212]">Stale</option>
            <option value="expired" className="bg-[#121212]">Expired</option>
            <option value="all" className="bg-[#121212]">All</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold transition-all"
          >
            Search
          </button>
        </form>
      </div>

      {/* Jobs Table */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-white/50 uppercase tracking-wider font-bold border-b border-white/5">
              <tr>
                <th className="py-3.5 px-4">Role Title</th>
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Location</th>
                <th className="py-3.5 px-4">Primary Source</th>
                <th className="py-3.5 px-4">Salary</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-white/40">
                    {loading ? 'Querying jobs catalog...' : 'No jobs found matching your criteria.'}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.canonicalId} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white max-w-[240px] truncate">
                      {job.title}
                    </td>
                    <td className="py-3.5 px-4 text-white/80 font-medium">
                      {job.company?.name}
                    </td>
                    <td className="py-3.5 px-4 text-white/60">
                      {job.location?.city || 'Remote'}, {job.location?.countryCode}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-white/70 uppercase">
                      {job.source?.primary}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-400">
                      {job.salary?.min ? `${job.salary.currency || '$'}${job.salary.min.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          job.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 text-xs font-semibold transition-all"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side Inspector Drawer */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              className="w-full max-w-xl bg-[#0e0e0e] border-l border-white/10 p-6 lg:p-8 overflow-y-auto flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      {selectedJob.source?.primary?.toUpperCase()}
                    </span>
                    <h3 className="text-xl font-bold text-white mt-2">
                      {selectedJob.title}
                    </h3>
                    <p className="text-sm text-white/60">
                      {selectedJob.company?.name} · {selectedJob.location?.city}, {selectedJob.location?.country}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedJob(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Fingerprint Info */}
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs mb-6 font-mono">
                  <div className="text-white/40 uppercase text-[10px]">Canonical SHA-256</div>
                  <div className="text-emerald-400 break-all text-[11px] mt-0.5">
                    {selectedJob.canonicalId}
                  </div>
                </div>

                {/* Skills */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-white/50 mb-2">
                    Normalized Indexed Skills ({selectedJob.skills?.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedJob.skills || []).map((s: string) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-white/5 text-white/80 text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Description Preview */}
                <div className="mb-6">
                  <h4 className="text-xs uppercase font-bold text-white/50 mb-2">
                    Sanitized Description
                  </h4>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 max-h-60 overflow-y-auto leading-relaxed">
                    {selectedJob.descriptionText || 'No description available.'}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                <a
                  href={selectedJob.source?.sourceUrl || selectedJob.source?.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2 transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Open Source URL
                </a>

                <button
                  onClick={() => setSelectedJob(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
