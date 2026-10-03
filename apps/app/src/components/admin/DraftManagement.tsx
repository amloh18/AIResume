// @ts-nocheck pre-existing type escape — removal tracked as R14 in docs/application-automation/fix-tasks.md
'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Eye, Trash2, User, Clock, CheckCircle, 
  AlertCircle, X, RefreshCw, Sparkles, ArrowUpRight, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/Skeleton';
import DraftDetailModal from './DraftDetailModal';
import { DRAFT_STATUSES, DEFAULT_PAGE_SIZE } from '@/lib/config/adminConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { toast } from '@/lib/hot-toast';

interface Draft {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  sessionId: string;
  currentStep: number;
  cvDataPreview: {
    name: string;
    workCount: number;
    educationCount: number;
    projectsCount: number;
  };
  hasAiAnalysis: boolean;
  status: 'anonymous' | 'linked' | 'converted';
  createdAt: string;
  updatedAt: string;
}

const DraftManagement: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: '15' });
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchTerm) params.append('sessionId', searchTerm);

      const response = await fetch(`/api/admin/drafts?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setDrafts(data.data);
        setTotalPages(data.pagination.totalPages);
        setLoadError(null);
      } else {
        setLoadError("Couldn't load drafts. Try again.");
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setLoadError("Couldn't load drafts. Try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) fetchDrafts();
  }, [page, filterStatus, mounted]);

  const debouncedSearch = useDebounce(searchTerm, 300);
  useEffect(() => {
    if (mounted) { setPage(1); fetchDrafts(); }
  }, [debouncedSearch, mounted]);

  const handleViewDetails = (draft: Draft) => {
    setSelectedDraft(draft);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (draftId: string) => {
    if (deletingId) return;
    if (!confirm('Delete this draft permanently?')) return;
    try {
      setDeletingId(draftId);
      const response = await fetch(`/api/admin/drafts/${draftId}`, { method: 'DELETE' });
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId));
        toast.success('Draft deleted');
      } else {
        const body = await response.json().catch(() => ({}));
        toast.error(body.error || "Couldn't delete the draft. Try again.");
      }
    } catch (err) {
      console.error('Delete error:', err);
      toast.error("Couldn't delete the draft. Try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  if (!mounted) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-5">
      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by session ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/10 w-full sm:w-48 transition-all"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white/70 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Status: All</option>
            {DRAFT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <Button onClick={fetchDrafts} disabled={loading} className="flex items-center gap-1.5 p-2 px-3 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white border border-white/10 rounded-xl transition-all h-auto text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Drafts', val: drafts.length, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Conversion', val: '24%', icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Active', val: drafts.filter(d => d.status === 'linked').length, icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'AI Analyzed', val: drafts.filter(d => d.hasAiAnalysis).length, icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-[#111216] border border-white/5 p-4 sm:p-5 rounded-2xl flex flex-col justify-between h-28 group hover:border-white/10 transition-all shadow-lg">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                <m.icon className="w-4 h-4" />
              </div>
              <ArrowUpRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-wider mb-0.5">{m.label}</p>
              <p className="text-2xl font-black text-white tracking-tight">{m.val.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Drafts Table */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">User</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Draft Name</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Step</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Date</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`draft-skeleton-${i}`}>
                    <td className="py-3 px-5">
                      {i === 0 && <span role="status" className="sr-only">Loading drafts…</span>}
                      <Skeleton className="h-8 w-40" />
                    </td>
                    <td className="py-3 px-5"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-3 px-5"><Skeleton className="h-4 w-14" /></td>
                    <td className="py-3 px-5"><Skeleton className="h-4 w-16" /></td>
                    <td className="py-3 px-5"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-5"><Skeleton className="h-8 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div role="alert" className="flex flex-col items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <p className="text-red-400 font-medium text-xs">{loadError}</p>
                      <button
                        onClick={() => fetchDrafts()}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-xs font-semibold transition-all"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : drafts.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/30 font-medium text-xs">No drafts found</td></tr>
              ) : (
                drafts.map((draft) => (
                  <motion.tr key={draft.id} variants={item} className="group hover:bg-white/[0.02] transition-colors cursor-default">
                    <td className="py-3 px-5">
                      {draft.userEmail ? (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{draft.userName || 'Unknown'}</div>
                            <div className="text-[11px] text-white/40">{draft.userEmail}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 opacity-60">
                          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 shrink-0">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white">Anonymous</div>
                            <div className="text-[10px] font-mono text-white/30">{draft.sessionId.substring(0, 12)}...</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-5">
                      <div className="font-semibold text-white">{draft.cvDataPreview.name || 'Untitled Draft'}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-white/30">{draft.cvDataPreview.workCount} Work • {draft.cvDataPreview.educationCount} Edu</span>
                        {draft.hasAiAnalysis && <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />}
                      </div>
                    </td>
                    <td className="py-3 px-5">
                      <div className="px-2.5 py-0.5 bg-white/5 rounded-lg w-fit text-[10px] font-semibold text-white/60 border border-white/10">Step {draft.currentStep}</div>
                    </td>
                    <td className="py-3 px-5">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border ${
                        draft.status === 'converted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        draft.status === 'linked' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {draft.status}
                      </span>
                    </td>
                    <td className="py-3 px-5">
                      <div className="text-xs text-white/40">{new Date(draft.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => handleViewDetails(draft)} className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-all">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(draft.id)}
                          disabled={deletingId === draft.id}
                          title="Delete draft"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {deletingId === draft.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="py-3 px-5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-xs">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs border border-white/10 disabled:opacity-30">Previous</button>
            <span className="text-[11px] text-white/40 font-medium">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-semibold text-xs border border-white/10 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>

      {isDetailModalOpen && selectedDraft && (
        <DraftDetailModal
          draftId={selectedDraft.id}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedDraft(null);
            fetchDrafts();
          }}
        />
      )}
    </motion.div>
  );
};

export default DraftManagement;
