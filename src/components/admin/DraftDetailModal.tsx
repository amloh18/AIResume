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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Draft Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {loading && (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          )}

          {error && (
            <div className="p-4 bg-red-900 border border-red-700 rounded text-red-200">
              {error}
            </div>
          )}

          {draft && (
            <>
              {/* User Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <User className="w-5 h-5" />
                    User Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {draft.user ? (
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Name:</span>{' '}
                        <span className="text-white">{draft.user.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Email:</span>{' '}
                        <span className="text-white">{draft.user.email}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">User ID:</span>{' '}
                        <span className="text-white font-mono text-sm">{draft.user.id}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <span className="text-gray-400">Status:</span>{' '}
                        <Badge className="bg-gray-600">Anonymous</Badge>
                      </div>
                      <div>
                        <span className="text-gray-400">Session ID:</span>{' '}
                        <span className="text-white font-mono text-sm">{draft.sessionId}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Draft Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Draft Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-gray-400">Current Step:</span>{' '}
                      <span className="text-white">Step {draft.currentStep}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Status:</span>{' '}
                      {draft.convertedAt ? (
                        <Badge className="bg-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Converted
                        </Badge>
                      ) : (
                        <Badge className={draft.userId ? 'bg-blue-600' : 'bg-gray-600'}>
                          {draft.userId ? 'Linked' : 'Anonymous'}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>{' '}
                      <span className="text-white">{new Date(draft.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Last Updated:</span>{' '}
                      <span className="text-white">{new Date(draft.updatedAt).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Expires:</span>{' '}
                      <span className="text-white">{new Date(draft.expiresAt).toLocaleString()}</span>
                    </div>
                    {draft.convertedAt && (
                      <div>
                        <span className="text-gray-400">Converted:</span>{' '}
                        <span className="text-white">{new Date(draft.convertedAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {draft.convertedBy && (
                    <div className="pt-2 border-t border-gray-700">
                      <span className="text-gray-400">Converted by:</span>{' '}
                      <span className="text-white">{draft.convertedBy.name} ({draft.convertedBy.email})</span>
                      {draft.conversionMethod && (
                        <Badge className="ml-2">{draft.conversionMethod}</Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV Data Preview */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">CV Data Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <span className="text-gray-400">Name:</span>{' '}
                      <span className="text-white">{draft.cvData?.basics?.name || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Work Experience:</span>{' '}
                      <span className="text-white">{draft.cvData?.work?.length || 0} entries</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Education:</span>{' '}
                      <span className="text-white">{draft.cvData?.education?.length || 0} entries</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Projects:</span>{' '}
                      <span className="text-white">{draft.cvData?.projects?.length || 0} entries</span>
                    </div>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                      View Full CV Data (JSON)
                    </summary>
                    <pre className="mt-2 p-4 bg-gray-900 rounded text-xs overflow-auto max-h-96 text-gray-300">
                      {JSON.stringify(draft.cvData, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>

              {/* AI Analysis */}
              {draft.aiAnalysis && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <details>
                      <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                        View AI Analysis (JSON)
                      </summary>
                      <pre className="mt-2 p-4 bg-gray-900 rounded text-xs overflow-auto max-h-96 text-gray-300">
                        {JSON.stringify(draft.aiAnalysis, null, 2)}
                      </pre>
                    </details>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t border-gray-700">
                {!draft.convertedAt && draft.userId && (
                  <Button
                    onClick={handleConvert}
                    disabled={converting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {converting ? 'Converting...' : 'Convert to Master CV'}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Draft
                </Button>
                <Button variant="outline" onClick={onClose}>
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

