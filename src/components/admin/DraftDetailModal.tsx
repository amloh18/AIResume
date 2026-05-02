// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { X, User, FileText, Sparkles, Calendar, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DraftDetail {
  id: string;
  userId: string | null;
  user: {
    id: string;
    email: string;
    name: string;
  } | null;
  sessionId: string;
  cvData: any;
  aiAnalysis: any;
  currentStep: number;
  jobId: string | null;
  jobData: any;
  completedSteps: number[];
  activeSection: string | null;
  availableSections: string[];
  convertedAt: string | null;
  convertedBy: {
    id: string;
    email: string;
    name: string;
  } | null;
  conversionMethod: 'user' | 'admin' | 'auto' | null;
  adminNotes: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  lastAccessedAt: string;
}

interface DraftDetailModalProps {
  draftId: string;
  isOpen: boolean;
  onClose: () => void;
}

const DraftDetailModal: React.FC<DraftDetailModalProps> = ({ draftId, isOpen, onClose }) => {
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    if (isOpen && draftId) {
      fetchDraftDetails();
    }
  }, [isOpen, draftId]);

  const fetchDraftDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/drafts/${draftId}`);
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }
      
      const data = await response.json();

      if (data.success) {
        setDraft(data.data);
      } else {
        setError(data.error || 'Failed to fetch draft details');
      }
    } catch (err: any) {
      console.error('Error fetching draft details:', err);
      setError(err.message || 'Failed to fetch draft details');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!confirm('Are you sure you want to convert this draft to a Master CV?')) {
      return;
    }

    try {
      setConverting(true);
      const response = await fetch(`/api/admin/drafts/${draftId}`, {
        method: 'POST'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();

      if (data.success) {
        alert('Master CV created/updated successfully!');
        onClose();
      } else {
        alert(data.error || 'Failed to convert draft');
      }
    } catch (err: any) {
      console.error('Error converting draft:', err);
      alert('Failed to convert draft');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/drafts/${draftId}`, {
        method: 'DELETE'
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format from server');
      }

      const data = await response.json();

      if (data.success) {
        alert('Draft deleted successfully!');
        onClose();
      } else {
        alert(data.error || 'Failed to delete draft');
      }
    } catch (err: any) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${ADMIN_THEME.modal.overlay}`}>
      <div className={`w-full max-w-4xl max-h-[90vh] overflow-y-auto ${ADMIN_THEME.modal.container} shadow-xl`}>
        <div className={`flex justify-between items-center p-6 sticky top-0 ${ADMIN_THEME.modal.header}`}>
          <h2 className={`text-2xl font-bold ${ADMIN_THEME.text.primary}`}>Draft Details</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className={ADMIN_THEME.text.secondary}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className={`p-6 space-y-6 ${ADMIN_THEME.background.primary}`}>
          {loading && (
            <div className={`text-center py-8 ${ADMIN_THEME.text.muted}`}>Loading...</div>
          )}

          {error && (
            <div className={`p-4 ${ADMIN_THEME.badge.error} border ${ADMIN_THEME.border.primary} rounded`}>
              {error}
            </div>
          )}

          {draft && (
            <>
              {/* User Information */}
              <Card className={`border ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                <CardHeader>
                  <CardTitle className={`${ADMIN_THEME.text.primary} flex items-center gap-2`}>
                    <User className="w-5 h-5" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {draft.user ? (
                    <div className="space-y-2">
                      <div>
                        <span className={ADMIN_THEME.text.muted}>Name:</span>{' '}
                        <span className={ADMIN_THEME.text.primary}>{draft.user.name}</span>
                      </div>
                      <div>
                        <span className={ADMIN_THEME.text.muted}>Email:</span>{' '}
                        <span className={ADMIN_THEME.text.primary}>{draft.user.email}</span>
                      </div>
                      <div>
                        <span className={ADMIN_THEME.text.muted}>User ID:</span>{' '}
                        <span className={`${ADMIN_THEME.text.primary} font-mono text-sm`}>{draft.user.id}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className={ADMIN_THEME.text.muted}>Status:</span>{' '}
                        <Badge className={ADMIN_THEME.badge.inactive}>Anonymous</Badge>
                      </div>
                      <div>
                        <span className={ADMIN_THEME.text.muted}>Session ID:</span>{' '}
                        <span className={`${ADMIN_THEME.text.primary} font-mono text-sm`}>{draft.sessionId}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Draft Information */}
              <Card className={`border ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                <CardHeader>
                  <CardTitle className={`${ADMIN_THEME.text.primary} flex items-center gap-2`}>
                    <FileText className="w-5 h-5" />
                    Draft Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Current Step:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>Step {draft.currentStep}</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Status:</span>{' '}
                      {draft.convertedAt ? (
                        <Badge className={ADMIN_THEME.badge.success}>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Converted
                        </Badge>
                      ) : (
                        <Badge className={draft.userId ? ADMIN_THEME.badge.active : ADMIN_THEME.badge.inactive}>
                          {draft.userId ? 'Linked' : 'Anonymous'}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Created:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{new Date(draft.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Last Updated:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{new Date(draft.updatedAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Expires:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{new Date(draft.expiresAt).toLocaleString()}</span>
                    </div>
                    {draft.convertedAt && (
                      <div>
                        <span className={ADMIN_THEME.text.muted}>Converted:</span>{' '}
                        <span className={ADMIN_THEME.text.primary}>{new Date(draft.convertedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {draft.convertedBy && (
                    <div className={`pt-2 border-t ${ADMIN_THEME.border.primary}`}>
                      <span className={ADMIN_THEME.text.muted}>Converted by:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{draft.convertedBy.name} ({draft.convertedBy.email})</span>
                      {draft.conversionMethod && (
                        <Badge className="ml-2">{draft.conversionMethod}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV Data Preview */}
              <Card className={`border ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                <CardHeader>
                  <CardTitle className={ADMIN_THEME.text.primary}>CV Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Name:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{draft.cvData?.basics?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Work Experience:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{draft.cvData?.work?.length || 0} entries</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Education:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{draft.cvData?.education?.length || 0} entries</span>
                    </div>
                    <div>
                      <span className={ADMIN_THEME.text.muted}>Projects:</span>{' '}
                      <span className={ADMIN_THEME.text.primary}>{draft.cvData?.projects?.length || 0} entries</span>
                    </div>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-600 hover:text-blue-500">
                      View Full CV Data (JSON)
                    </summary>
                    <pre className={`mt-2 p-4 ${ADMIN_THEME.background.primary} rounded text-xs overflow-auto max-h-96 ${ADMIN_THEME.text.secondary}`}>
                      {JSON.stringify(draft.cvData, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              {draft.aiAnalysis && (
                <Card className={`border ${ADMIN_THEME.border.primary} ${ADMIN_THEME.background.tertiary}`}>
                  <CardHeader>
                    <CardTitle className={`${ADMIN_THEME.text.primary} flex items-center gap-2`}>
                      <Sparkles className="w-5 h-5" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <details>
                      <summary className="cursor-pointer text-blue-600 hover:text-blue-500">
                        View AI Analysis (JSON)
                      </summary>
                      <pre className={`mt-2 p-4 ${ADMIN_THEME.background.primary} rounded text-xs overflow-auto max-h-96 ${ADMIN_THEME.text.secondary}`}>
                        {JSON.stringify(draft.aiAnalysis, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className={`flex gap-4 pt-4 border-t ${ADMIN_THEME.border.primary}`}>
                {!draft.convertedAt && draft.userId && (
                  <Button
                    onClick={handleConvert}
                    disabled={converting}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {converting ? 'Converting...' : 'Convert to Master CV'}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Draft
                </Button>
                <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DraftDetailModal;

