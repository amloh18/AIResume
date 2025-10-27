'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Eye, Send, Calendar, Target, Mail, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import CampaignFilters from './CampaignFilters';

interface Campaign {
  _id?: string;
  campaignName: string;
  subject: string;
  htmlContent: string;
  plainTextContent?: string;
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  targetFilters: any;
  targetedUserCount?: number;
  scheduledAt?: string;
  tags?: string[];
  notes?: string;
}

interface Props {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: () => void;
}

export default function CampaignEditor({ campaign, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Campaign>({
    campaignName: '',
    subject: '',
    htmlContent: '',
    plainTextContent: '',
    status: 'draft',
    targetFilters: {},
    tags: [],
    notes: '',
  });
  
  const [activeTab, setActiveTab] = useState<'details' | 'content' | 'targeting'>('details');
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [targetedCount, setTargetedCount] = useState(0);
  const [previewingTargets, setPreviewingTargets] = useState(false);

  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
      if (campaign.targetedUserCount) {
        setTargetedCount(campaign.targetedUserCount);
      }
    }
  }, [campaign]);

  const handleInputChange = (field: keyof Campaign, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePreviewTargets = async () => {
    setPreviewingTargets(true);
    try {
      const response = await fetch('/api/admin/email-campaigns/preview-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFilters: formData.targetFilters, limit: 10 }),
      });

      const data = await response.json();
      if (data.success) {
        setTargetedCount(data.totalCount);
        alert(`Total targeted users: ${data.totalCount}\n\nPreview (first 10):\n${data.users.map((u: any) => `${u.firstName} ${u.lastName} (${u.email}) - ${u.currentPlanKey}`).join('\n')}`);
      }
    } catch (error) {
      console.error('Failed to preview targets:', error);
      alert('Failed to preview targets');
    } finally {
      setPreviewingTargets(false);
    }
  };

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!formData.campaignName || !formData.subject || !formData.htmlContent) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const url = campaign?._id
        ? `/api/admin/email-campaigns/${campaign._id}`
        : '/api/admin/email-campaigns';
      
      const method = campaign?._id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, status }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Campaign saved successfully!');
        onSave();
      } else {
        alert('Failed to save campaign: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
      alert('Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto"
    >
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {campaign ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <p className="text-gray-400 text-sm mt-1">
                Create engaging email campaigns for your users
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/10 px-6">
            {['details', 'content', 'targeting'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-4 py-3 font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-lime-400 border-b-2 border-lime-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab === 'details' && <FileText className="w-4 h-4 inline mr-2" />}
                {tab === 'content' && <Mail className="w-4 h-4 inline mr-2" />}
                {tab === 'targeting' && <Target className="w-4 h-4 inline mr-2" />}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'details' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    value={formData.campaignName}
                    onChange={(e) => handleInputChange('campaignName', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    placeholder="e.g., Summer Promotion 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    placeholder="e.g., Get 50% off your premium subscription!"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={formData.tags?.join(', ')}
                    onChange={(e) => handleInputChange('tags', (e.target.value || '').split(',').map(t => t.trim()))}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    placeholder="e.g., promotion, summer, premium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                    placeholder="Internal notes about this campaign..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Schedule Send (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt || ''}
                    onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                  />
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Email Content</h3>
                  <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {previewMode ? 'Edit' : 'Preview'}
                  </button>
                </div>

                {previewMode ? (
                  <div
                    className="w-full min-h-[400px] p-6 bg-white border border-white/10 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: formData.htmlContent }}
                  />
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        HTML Content *
                      </label>
                      <textarea
                        value={formData.htmlContent}
                        onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                        rows={15}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50 font-mono text-sm"
                        placeholder="<html>&#10;<body>&#10;  <h1>Your email content here</h1>&#10;</body>&#10;</html>"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Plain Text Version (Optional)
                      </label>
                      <textarea
                        value={formData.plainTextContent}
                        onChange={(e) => handleInputChange('plainTextContent', e.target.value)}
                        rows={6}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-lime-400/50"
                        placeholder="Plain text version for email clients that don't support HTML..."
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'targeting' && (
              <div>
                <CampaignFilters
                  filters={formData.targetFilters}
                  onChange={(filters) => handleInputChange('targetFilters', filters)}
                />

                <div className="mt-6 p-4 bg-lime-500/10 border border-lime-500/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Targeted Users</div>
                      <div className="text-2xl font-bold text-lime-400">{targetedCount}</div>
                    </div>
                    <button
                      onClick={handlePreviewTargets}
                      disabled={previewingTargets}
                      className="flex items-center gap-2 px-4 py-2 bg-lime-500/20 hover:bg-lime-500/30 border border-lime-500/30 text-lime-400 rounded-lg transition-all disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      {previewingTargets ? 'Loading...' : 'Preview Users'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleSave('draft')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-lg transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Save as Draft
              </button>
              <button
                onClick={() => handleSave('scheduled')}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-lime-500 hover:bg-lime-600 text-black font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {formData.scheduledAt ? 'Schedule' : 'Save & Ready'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

