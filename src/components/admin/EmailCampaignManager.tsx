'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  X,
  FileText,
  Target,
  Loader2,
  AlertTriangle,
  Archive
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
  const [metrics, setMetrics] = useState({ totalUsers: 0 });
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchMetrics();
  }, [statusFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/email-campaigns?status=${statusFilter}&limit=50`
      );

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();

      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
      toast({
        title: "Error",
        description: "Failed to fetch campaigns",
        variant: "destructive"
      });
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/metrics');
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setMetrics({
            totalUsers: data.totalUsers || 0
          });
        }
      }
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
  };

  const handleSyncUsers = async () => {
    if (syncing) return;

    setSyncing(true);
    try {
      const response = await fetch('/api/admin/users/sync', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sync users API error:', response.status, errorText);
        toast({
          title: "Sync Failed",
          description: `Failed to sync users: ${response.statusText}`,
          variant: "destructive"
        });
        return;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        toast({
          title: "Error",
          description: "Invalid response from server",
          variant: "destructive"
        });
        return;
      }

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Sync Completed",
          description: `Synced: ${data.stats.syncedCount}, New: ${data.stats.newUsers}, Updated: ${data.stats.updatedUsers}`,
        });
        fetchMetrics(); // Refresh metrics after sync
      } else {
        toast({
          title: "Sync Failed",
          description: data.error || 'Unknown error',
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Failed to sync users:', error);
      toast({
        title: "Sync Failed",
        description: error.message || 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateCampaign = () => {
    setSelectedCampaign(null);
    setShowEditor(true);
  };

  const handleEditCampaign = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowEditor(true);
  };

  const handleDeleteClick = (campaign: Campaign) => {
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Campaign deleted successfully",
        });
        fetchCampaigns();
      } else {
        const data = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: data.error || "Failed to delete campaign",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete campaign",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
  };

  const handleCampaignSaved = () => {
    setShowEditor(false);
    setSelectedCampaign(null);
    fetchCampaigns();
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
        toast({
          title: "Success",
          description: "Campaign archived successfully",
          variant: "success"
        });
        fetchCampaigns();
      } else {
        const data = await response.json().catch(() => ({}));
        toast({
          title: "Error",
          description: data.error || "Failed to archive campaign",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive campaign",
        variant: "destructive"
      });
      console.error(error);
    } finally {
      setIsArchiving(false);
      setArchiveDialogOpen(false);
      setCampaignToArchive(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: ADMIN_THEME.badge.draft,
      scheduled: ADMIN_THEME.badge.scheduled,
      sent: ADMIN_THEME.badge.sent,
      cancelled: ADMIN_THEME.badge.cancelled,
      recurring: 'bg-purple-50 text-purple-700 border border-purple-200',
      archived: 'bg-slate-50 text-slate-600 border border-slate-200',
    } as const;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (openRate: number) => {
    if (openRate > 30) {
      return (
        <span className="flex items-center gap-1 text-orange-400">
          <span className="text-lg">🔥</span> High
        </span>
      );
    } else if (openRate > 15) {
      return (
        <span className="flex items-center gap-1 text-yellow-400">
          <span className="text-lg">⚡</span> Medium
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-gray-400">
        <span className="text-lg">📊</span> Low
      </span>
    );
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (showEditor) {
    return (
      <CampaignEditor
        campaign={selectedCampaign}
        onClose={() => setShowEditor(false)}
        onSave={handleCampaignSaved}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-6">
        {/* Campaign Detail View */}
        <AnimatePresence>
          {viewingCampaign && (
            <CampaignDetailView
              campaign={viewingCampaign}
              onClose={() => setViewingCampaign(null)}
            />
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Email Campaigns</h1>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-sm font-medium rounded-full mb-2 border border-emerald-200">
                Total Users: {metrics.totalUsers.toLocaleString()}
              </span>
            </div>
            <p className="text-slate-600">Create and manage marketing campaigns</p>
          </div>

          {/* Search, Filters, and Action Buttons inline */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 bg-white border border-slate-200 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
            >
              <option value="all">All Status</option>
              {CAMPAIGN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            {/* Sync Button */}
            <Button
              variant="outline"
              onClick={handleSyncUsers}
              disabled={syncing}
              className="flex items-center gap-2 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
            >
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
              {syncing ? 'Syncing...' : 'Sync Users'}
            </Button>

            {/* Create Campaign Button */}
            <Button
              onClick={handleCreateCampaign}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 mb-2">No campaigns found</p>
            <button
              onClick={handleCreateCampaign}
              className="text-emerald-700 hover:text-emerald-800 text-sm font-medium"
            >
              Create your first campaign
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">CAMPAIGN NAME</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">SUBJECT</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">DATE</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">STATUS</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">PERFORMANCE</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map((campaign) => {
                const openRate = campaign.sentCount > 0
                  ? Math.round((campaign.openedCount / campaign.sentCount) * 100)
                  : 0;

                return (
                  <tr
                    key={campaign._id}
                    className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => {
                      if (['sent', 'sending', 'cancelled', 'archived'].includes(campaign.status)) {
                        setViewingCampaign(campaign);
                      } else {
                        handleEditCampaign(campaign);
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{campaign.campaignName}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        {campaign.targetedUserCount} users
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      {campaign.subject}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {campaign.sentAt
                        ? formatDate(campaign.sentAt)
                        : campaign.scheduledAt
                          ? formatDate(campaign.scheduledAt)
                          : formatDate(campaign.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(campaign.status)}
                    </td>
                    <td className="px-6 py-4">
                      {campaign.status === 'sent' ? (
                        getPriorityBadge(openRate)
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!['sent', 'sending', 'archived'].includes(campaign.status) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCampaign(campaign);
                            }}
                            className="text-emerald-700 hover:text-emerald-800 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        {['sent', 'sending', 'recurring'].includes(campaign.status) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchiveClick(campaign);
                            }}
                            className="text-amber-700 hover:text-amber-800 transition-colors"
                            title="Archive"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(campaign);
                            }}
                            className="text-red-600 hover:text-red-700 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              Delete Campaign
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Are you sure you want to delete "{campaignToDelete?.campaignName}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setDeleteDialogOpen(false)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Archive className="w-5 h-5" />
              Archive Campaign
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Are you sure you want to archive "{campaignToArchive?.campaignName}"? It will be moved to the archived list but statistics will be preserved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() => setArchiveDialogOpen(false)}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmArchive}
              disabled={isArchiving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isArchiving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Archiving...
                </>
              ) : (
                'Archive Campaign'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
