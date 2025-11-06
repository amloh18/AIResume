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
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CampaignEditor from './CampaignEditor';
import CampaignFilters from './CampaignFilters';
import { formatDate } from '@/lib/utils';

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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showEditor, setShowEditor] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetchSyncStatus();
  }, [statusFilter]);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/email-campaigns?status=${statusFilter}&limit=50`
      );
      const data = await response.json();
      
      if (data.success) {
        setCampaigns(data.campaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/users/sync');
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to fetch sync status:', response.status, errorText);
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Non-JSON response from sync status:', errorText);
        return;
      }

      const data = await response.json();
      if (data.success) {
        setSyncStatus(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  };

  const handleSyncUsers = async () => {
    if (syncing) return;
    
    setSyncing(true);
    try {
      const response = await fetch('/api/admin/users/sync', {
        method: 'POST',
      });

      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Sync users API error:', response.status, errorText);
        alert(`Failed to sync users: ${response.status} ${response.statusText}`);
        setSyncing(false);
        return;
      }

      // Check content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        console.error('Non-JSON response from sync users:', errorText);
        alert('Invalid response from server. Please check the console for details.');
        setSyncing(false);
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        alert(`User sync completed!\n- Synced: ${data.stats.syncedCount}\n- New: ${data.stats.newUsers}\n- Updated: ${data.stats.updatedUsers}`);
        fetchSyncStatus();
      } else {
        alert('User sync failed: ' + (data.error || 'Unknown error'));
        if (data.details) {
          console.error('Sync error details:', data.details);
        }
      }
    } catch (error: any) {
      console.error('Failed to sync users:', error);
      alert('Failed to sync users: ' + (error.message || 'Unknown error'));
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

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCampaigns();
      } else {
        const data = await response.json();
        alert('Failed to delete campaign: ' + data.error);
      }
    } catch (error) {
      alert('Failed to delete campaign');
      console.error(error);
    }
  };

  const handleCampaignSaved = () => {
    setShowEditor(false);
    setSelectedCampaign(null);
    fetchCampaigns();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      sent: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles] || styles.draft}`}>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Email Campaigns</h1>
            <p className="text-gray-300">Create and manage marketing campaigns</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Sync Status */}
            {syncStatus && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2">
                <div className="text-xs text-gray-400 mb-1">Total Users</div>
                <div className="text-lg font-bold text-white">{syncStatus.totalUsers}</div>
              </div>
            )}
            
            {/* Sync Button */}
            <button
              onClick={handleSyncUsers}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-400 rounded-lg transition-all disabled:opacity-50"
            >
              <Users className="w-4 h-4" />
              {syncing ? 'Syncing...' : 'Sync Users'}
            </button>

            {/* Create Campaign Button */}
            <button
              onClick={handleCreateCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by campaign, subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-lime-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading campaigns...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No campaigns found</p>
            <button
              onClick={handleCreateCampaign}
              className="text-lime-400 hover:text-lime-300 text-sm"
            >
              Create your first campaign
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">CAMPAIGN NAME</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">SUBJECT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">DATE</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">STATUS</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">PERFORMANCE</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">ACTIONS</th>
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
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{campaign.campaignName}</div>
                      <div className="text-xs text-gray-400 mt-1">
                        <Users className="w-3 h-3 inline mr-1" />
                        {campaign.targetedUserCount} users
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {campaign.subject}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
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
                        <span className="text-gray-500 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditCampaign(campaign)}
                          className="text-lime-400 hover:text-lime-300 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCampaign(campaign._id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
