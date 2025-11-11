'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Eye, 
  Trash2,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DraftDetailModal from './DraftDetailModal';
import { DRAFT_STATUSES, DEFAULT_PAGE_SIZE } from '@/lib/config/adminConstants';
import { ADMIN_THEME } from '@/lib/config/adminTheme';

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
  convertedAt: string | null;
  convertedBy: {
    id: string;
    email: string;
    name: string;
  } | null;
  conversionMethod: 'user' | 'admin' | 'auto' | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastAccessedAt: string;
}

const DraftManagement: React.FC = () => {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: DEFAULT_PAGE_SIZE.toString()
      });

      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }

      if (searchTerm) {
        // Search by session ID (email search can be added later if needed)
        params.append('sessionId', searchTerm);
      }

      const response = await fetch(`/api/admin/drafts?${params.toString()}`);
      
      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();

      if (data.success) {
        setDrafts(data.data);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.error || 'Failed to fetch drafts');
      }
    } catch (err: any) {
      console.error('Error fetching drafts:', err);
      setError(err.message || 'Failed to fetch drafts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [page, filterStatus]);

  const handleViewDetails = (draft: Draft) => {
    setSelectedDraft(draft);
    setIsDetailModalOpen(true);
  };

  const handleDelete = async (draftId: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/drafts/${draftId}`, {
        method: 'DELETE'
      });

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();

      if (data.success) {
        setDrafts(drafts.filter(d => d.id !== draftId));
      } else {
        alert(data.error || 'Failed to delete draft');
      }
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft');
    }
  };

  const getStatusBadge = (status: string) => {
    if (!DRAFT_STATUSES.includes(status as any)) {
      return <Badge className={ADMIN_THEME.badge.info}>{status}</Badge>;
    }
    
    switch (status) {
      case 'converted':
        return <Badge className={ADMIN_THEME.badge.success}><CheckCircle className="w-3 h-3 mr-1" />Converted</Badge>;
      case 'linked':
        return <Badge className={ADMIN_THEME.badge.info}><User className="w-3 h-3 mr-1" />Linked</Badge>;
      case 'anonymous':
        return <Badge className={ADMIN_THEME.badge.inactive}><AlertCircle className="w-3 h-3 mr-1" />Anonymous</Badge>;
      default:
        return <Badge className={ADMIN_THEME.badge.inactive}>{status}</Badge>;
    }
  };

  if (loading && drafts.length === 0) {
    return (
      <Card className={ADMIN_THEME.card.base}>
        <CardHeader>
          <CardTitle className={ADMIN_THEME.text.primary}>CV Draft Management</CardTitle>
          <CardDescription className={ADMIN_THEME.text.secondary}>Loading drafts...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className={ADMIN_THEME.card.base}>
        <CardHeader className={ADMIN_THEME.card.header}>
          <CardTitle className={`flex items-center gap-2 ${ADMIN_THEME.text.primary}`}>
            <FileText className="w-5 h-5" />
            CV Draft Management
          </CardTitle>
          <CardDescription className={ADMIN_THEME.text.secondary}>
            Manage temporary CV drafts from AI Career Report flow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by email or session ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchDrafts();
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className={`px-4 py-2 ${ADMIN_THEME.input.base} ${ADMIN_THEME.border.primary} rounded-md ${ADMIN_THEME.input.focus}`}
            >
              <option value="all">All Status</option>
              {DRAFT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>
            <Button onClick={fetchDrafts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {error && (
            <div className={`mb-4 p-3 ${ADMIN_THEME.badge.error} border ${ADMIN_THEME.border.primary} rounded`}>
              {error}
            </div>
          )}

          {/* Drafts Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${ADMIN_THEME.border.primary}`}>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>User</th>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>CV Preview</th>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>Step</th>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>Status</th>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>Created</th>
                  <th className={`text-left p-3 ${ADMIN_THEME.text.secondary}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => (
                  <tr key={draft.id} className={`${ADMIN_THEME.table.row} border-b ${ADMIN_THEME.border.primary}`}>
                    <td className="p-3">
                      {draft.userEmail ? (
                        <div>
                          <div className={ADMIN_THEME.text.primary}>{draft.userName || draft.userEmail}</div>
                          <div className={`text-sm ${ADMIN_THEME.text.tertiary}`}>{draft.userEmail}</div>
                        </div>
                      ) : (
                        <div className={ADMIN_THEME.text.tertiary}>
                          <div>Anonymous</div>
                          <div className={`text-xs ${ADMIN_THEME.text.muted}`}>{draft.sessionId.substring(0, 8)}...</div>
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <div className={ADMIN_THEME.text.primary}>{draft.cvDataPreview.name}</div>
                      <div className={`text-sm ${ADMIN_THEME.text.tertiary}`}>
                        {draft.cvDataPreview.workCount} work, {draft.cvDataPreview.educationCount} edu
                        {draft.hasAiAnalysis && <span className="ml-2 text-blue-400">• AI Analysis</span>}
                      </div>
                    </td>
                    <td className={`p-3 ${ADMIN_THEME.text.secondary}`}>Step {draft.currentStep}</td>
                    <td className="p-3">{getStatusBadge(draft.status)}</td>
                    <td className={`p-3 ${ADMIN_THEME.text.tertiary} text-sm`}>
                      {new Date(draft.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(draft)}
                          className={ADMIN_THEME.button.ghost}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(draft.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-gray-400">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          {drafts.length === 0 && !loading && (
            <div className={`text-center py-8 ${ADMIN_THEME.text.tertiary}`}>
              No drafts found
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
};

export default DraftManagement;

