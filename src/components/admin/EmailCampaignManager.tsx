'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail, Send, Eye, Edit, Trash2, Plus, Filter, Search, Calendar, Users, 
  CheckCircle, Clock, X, FileText, Target, Loader2, AlertTriangle, Archive,
  ArrowUpRight, BarChart3, Zap, Bell, Sparkles, TrendingUp, Globe, Activity
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import CampaignDetailView from './CampaignDetailView';
import CampaignEditor from './CampaignEditor';
import CampaignFilters from './CampaignFilters';
import { formatDate } from '@/lib/utils';
import { CAMPAIGN_STATUSES } from '@/lib/config/adminConstants';
import { useToast } from '@/hooks/use-toast';
import { ADMIN_THEME } from '@/lib/config/adminTheme';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Campaign {
  _id: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  targetFilters: any;
  targetedUserCount: number;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  createdByName: string;
  tags?: string[];
}

export default function EmailCampaignManager() {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState({ totalUsers: 0, totalCampaigns: 0, activeRecipients: 0 });
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [mounted, setMounted] = useState(false);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchCampaigns();
    fetchMetrics();
  }, [statusFilter, mounted]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/email-campaigns?status=${statusFilter}&limit=50`
      );
      const data = await response.json();
      if (data.success) {
        setCampaigns(data.campaigns);
        setMetrics(prev => ({ ...prev, totalCampaigns: data.campaigns.length }));
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(prev => ({
          ...prev,
          totalUsers: data.totalUsers || 0,
          activeRecipients: typeof data.activeUsers === 'number' ? data.activeUsers : 0
        }));
      }
    } catch (error) {}
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEditor(true);
  };

  const handleSyncUsers = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/users/sync', { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        toast({ title: "Nexus Synced", description: "All identity nodes have been updated." });
        fetchMetrics();
      }
    } catch (error) {
      toast({ title: "Sync Failed", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignToDelete._id}`, { method: 'DELETE' });
      if (response.ok) {
        toast({ title: "Campaign Erased" });
        fetchCampaigns();
      }
    } catch (error) {
      toast({ title: "Error Erasing Campaign", variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  // Archive State
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [campaignToArchive, setCampaignToArchive] = useState<Campaign | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleArchiveClick = (campaign: Campaign) => {
    setCampaignToArchive(campaign);
    setArchiveDialogOpen(true);
  };

  const confirmArchive = async () => {
    if (!campaignToArchive) return;
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignToArchive._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' }),
      });
      if (response.ok) {
        toast({ title: "Campaign Archived" });
        fetchCampaigns();
      }
    } catch (error) {
      toast({ title: "Archive Failed", variant: "destructive" });
    } finally {
      setIsArchiving(false);
      setArchiveDialogOpen(false);
      setCampaignToArchive(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-white/5 text-white/40 border-white/10',
      scheduled: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      sent: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
      recurring: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
      archived: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    } as const;

    return (
      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status}
      </span>
    );
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const item = {
    hidden: { opacity: 0, x: -10 },
    show: { opacity: 1, x: 0 }
  };

  if (!mounted) return null;

  if (showEditor) {
    return (
      <CampaignEditor
        campaign={selectedCampaign}
        onClose={() => setShowEditor(false)}
        onSave={() => {
          setShowEditor(false);
          setSelectedCampaign(null);
          fetchCampaigns();
        }}
      />
    );
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <AnimatePresence>
        {viewingCampaign && (
          <CampaignDetailView
            campaign={viewingCampaign}
            onClose={() => setViewingCampaign(null)}
          />
        )}
      </AnimatePresence>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 focus:bg-white/10 w-full sm:w-48 transition-all"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-white/70 focus:outline-none hover:bg-white/10 transition-all appearance-none cursor-pointer"
          >
            <option value="all">Status: All</option>
            {CAMPAIGN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleSyncUsers}
            disabled={syncing}
            className="bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-xl px-3.5 py-1.5 text-xs font-semibold h-auto"
          >
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Users className="w-3.5 h-3.5 mr-1.5" />}
            Sync
          </Button>

          <Button
            onClick={() => { setSelectedCampaign(null); setShowEditor(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl px-3.5 py-1.5 text-xs h-auto shadow-md"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Campaign
          </Button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Network Reach', val: metrics.totalUsers, icon: Globe, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Active Signals', val: metrics.totalCampaigns, icon: Zap, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Engaged Nodes', val: metrics.activeRecipients, icon: Activity, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Success Velocity', val: '92.4%', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
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

      {/* Campaigns Table */}
      <div className="bg-[#111216] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Campaign Name</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Subject</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Status</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Reach</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider">Telemetry</th>
                <th className="py-3 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/30 font-medium text-xs">Loading Campaigns...</td></tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-white/30 font-medium text-xs">No active campaigns found</td></tr>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const openRate = campaign.sentCount > 0 ? Math.round((campaign.openedCount / campaign.sentCount) * 100) : 0;
                  return (
                    <motion.tr
                      key={campaign._id}
                      variants={item}
                      onClick={() => ['sent', 'sending', 'cancelled', 'archived'].includes(campaign.status) ? setViewingCampaign(campaign) : handleEditCampaign(campaign)}
                      className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-white/40 group-hover:text-emerald-400 group-hover:bg-emerald-500/10 transition-all shrink-0`}>
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-semibold text-white group-hover:text-emerald-400 transition-colors">{campaign.campaignName}</div>
                            <div className="text-[10px] text-white/30 font-medium mt-0.5">Created {formatDate(campaign.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        <div className="text-white/60 font-medium max-w-[200px] truncate">{campaign.subject}</div>
                      </td>
                      <td className="py-3 px-5">
                        {getStatusBadge(campaign.status)}
                      </td>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-1.5 text-white/60">
                          <Users className="w-3.5 h-3.5 text-white/30" />
                          <span className="font-medium">{campaign.targetedUserCount.toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="py-3 px-5">
                        {campaign.status === 'sent' ? (
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-white">{openRate}%</span>
                            <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${openRate}%` }} />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-white/30 font-medium">Pending send</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {!['sent', 'sending', 'archived'].includes(campaign.status) && (
                            <button onClick={() => handleEditCampaign(campaign)} className="p-1.5 rounded-lg bg-white/5 hover:bg-emerald-500/10 text-white/40 hover:text-emerald-400 transition-all">
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {['sent', 'sending', 'recurring'].includes(campaign.status) ? (
                            <button onClick={() => handleArchiveClick(campaign)} className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/10 text-white/40 hover:text-amber-400 transition-all">
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleDeleteClick(campaign)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/10 text-white/40 hover:text-red-400 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals - Standard shadcn style but with dark mode forced if needed, though they already should look okay in dark mode. I'll make sure they match. */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              ERASE SIGNAL
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Are you sure you want to permanently erase &quot;{campaignToDelete?.campaignName}&quot;? This action cannot be reversed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="ghost" onClick={() => setDeleteDialogOpen(false)} className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">Abort</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl">
              {isDeleting ? 'Erasing...' : 'Confirm Erase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="bg-[#111111] border-white/10 text-white rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Archive className="w-5 h-5" />
              ARCHIVE SIGNAL
            </DialogTitle>
            <DialogDescription className="text-white/40">
              Move &quot;{campaignToArchive?.campaignName}&quot; to long-term storage? Telemetry data will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 gap-2">
            <Button variant="ghost" onClick={() => setArchiveDialogOpen(false)} className="text-white/40 hover:text-white hover:bg-white/5 rounded-xl">Abort</Button>
            <Button onClick={confirmArchive} disabled={isArchiving} className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl">
              {isArchiving ? 'Archiving...' : 'Confirm Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
