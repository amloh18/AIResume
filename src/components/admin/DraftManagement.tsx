// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Search, Filter, Eye, Trash2, User, Clock, CheckCircle, 
  AlertCircle, X, RefreshCw, Sparkles, ArrowUpRight, Shield, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DraftDetailModal from './DraftDetailModal';
import { DRAFT_STATUSES, DEFAULT_PAGE_SIZE } from '@/lib/config/adminConstants';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';

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
      }
    } catch (err) {
      console.error('Fetch error:', err);
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
    if (!confirm('Delete this draft permanently?')) return;
    try {
      const response = await fetch(`/api/admin/drafts/${draftId}`, { method: 'DELETE' });
      if (response.ok) {
        setDrafts(drafts.filter(d => d.id !== draftId));
      } else {
        console.error('Failed to delete draft');
      }
    } catch (err) {
      console.error('Delete error:', err);
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
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            CV <span className="text-emerald-500">Drafts</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            In-progress Resumes • {drafts.length} Active Drafts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search by ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 w-full sm:w-64 transition-all"
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="px-4 py-3 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase tracking-widest text-white/60 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Statuses: All</option>
            {DRAFT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <Button onClick={fetchDrafts} className="bg-white/5 hover:bg-white/10 text-white/60 border border-white/5 rounded-2xl p-6 transition-all">
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Drafts', val: drafts.length, icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Conversion', val: '24%', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Active', val: drafts.filter(d => d.status === 'linked').length, icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'AI Analyzed', val: drafts.filter(d => d.hasAiAnalysis).length, icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col justify-between h-32 group hover:bg-white/[0.08] transition-all shadow-xl">
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl ${m.bg} ${m.color}`}>
                <m.icon className="w-5 h-5" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-white/20 group-hover:text-white transition-colors" />
            </div>
            <div>
              <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{m.label}</p>
              <p className="text-2xl font-black text-white">{m.val.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Drafts Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">User</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Draft Name</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Step</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest text-xs italic">Loading Drafts...</td></tr>
              ) : drafts.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest text-xs italic">No drafts found</td></tr>
              ) : (
                drafts.map((draft) => (
                  <motion.tr key={draft.id} variants={item} className="group hover:bg-white/[0.03] transition-colors cursor-default">
                    <td className="px-8 py-6">
                      {draft.userEmail ? (
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-black text-sm">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{draft.userName || 'Unknown'}</div>
                            <div className="text-xs text-white/30 font-medium">{draft.userEmail}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4 opacity-40">
                          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-sm font-black text-white">Anonymous</div>
                            <div className="text-[10px] font-mono">{draft.sessionId.substring(0, 12)}...</div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-sm font-black text-white">{draft.cvDataPreview.name || 'Untitled Draft'}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{draft.cvDataPreview.workCount} Work / {draft.cvDataPreview.educationCount} Edu</span>
                        {draft.hasAiAnalysis && <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="px-3 py-1 bg-white/5 rounded-lg w-fit text-[10px] font-black uppercase tracking-widest text-white/40 border border-white/5">Step {draft.currentStep}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        draft.status === 'converted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        draft.status === 'linked' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {draft.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-black text-white/40">{new Date(draft.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleViewDetails(draft)} className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-all">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(draft.id)} className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-all">
                          <Trash2 className="w-4 h-4" />
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
          <div className="p-8 bg-white/2 border-t border-white/5 flex items-center justify-between">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/5 disabled:opacity-30">Previous</button>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest border border-white/5 disabled:opacity-30">Next</button>
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
