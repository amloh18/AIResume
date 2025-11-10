'use client';

import { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Users, 
  TrendingUp, 
  Eye, 
  Clock, 
  CheckCircle, 
  XCircle,
  Plus,
  Filter,
  Search,
  X
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  type: 'verification' | 'welcome' | 'password_reset' | 'membership_reminder' | 'limit_exhausted' | 'special_offers' | 'account_deletion' | 'custom';
  subject: string;
  description: string;
  category: 'system' | 'marketing' | 'transactional';
  lastUsed?: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  previewHtml: string;
  variables: string[];
}

interface EmailCampaign {
  id: string;
  name: string;
  template: string;
  recipients: number;
  sent: number;
  opened: number;
  clicked: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  createdAt: string;
}

export default function EmailManagementPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showPreview, setShowPreview] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchCampaigns();
  }, [categoryFilter, typeFilter, searchTerm]);

  const fetchTemplates = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/admin/email-templates?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch templates: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchCampaigns = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/email-campaigns');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      } else {
        const errorData = await response.json();
        setError(`Failed to fetch campaigns: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewTemplate = async (template: EmailTemplate) => {
    try {
      const response = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template.id,
          variables: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            code: '1234',
            link: 'https://cvcircle.com/example',
            couponCode: 'SAVE30',
            expirationDate: 'December 31, 2024',
            usageLimit: 5,
            currentUsage: 5,
            planName: 'Free Plan'
          }
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreviewTemplate(data.template);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Error previewing template:', error);
    }
  };

  const filteredTemplates = templates;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-lime-400 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading email management data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Data</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchTemplates();
              fetchCampaigns();
            }}
            className="px-4 py-2 bg-lime-500 text-white rounded-lg hover:bg-lime-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const totalEmailsSent = templates.reduce((sum, template) => sum + template.sentCount, 0);
  const averageOpenRate = templates.length > 0 ? templates.reduce((sum, template) => sum + template.openRate, 0) / templates.length : 0;
  const averageClickRate = templates.length > 0 ? templates.reduce((sum, template) => sum + template.clickRate, 0) / templates.length : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Management</h1>
          <p className="text-gray-600">Manage email templates, campaigns, and track performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Mail className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Emails</p>
                <p className="text-2xl font-bold text-gray-900">{totalEmailsSent.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Rate</p>
                <p className="text-2xl font-bold text-gray-900">{averageOpenRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Click Rate</p>
                <p className="text-2xl font-bold text-gray-900">{averageClickRate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Templates Section */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Email Templates</h2>
              <button
                onClick={() => setShowCreateTemplate(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Template
              </button>
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                <option value="system">System</option>
                <option value="marketing">Marketing</option>
                <option value="transactional">Transactional</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="verification">Verification</option>
                <option value="welcome">Welcome</option>
                <option value="password_reset">Password Reset</option>
                <option value="limit_exhausted">Limit Exhausted</option>
                <option value="special_offers">Special Offers</option>
                <option value="account_deletion">Account Deletion</option>
                <option value="membership_reminder">Membership Reminder</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{template.subject}</p>
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.type === 'verification' ? 'bg-blue-100 text-blue-800' :
                        template.type === 'welcome' ? 'bg-green-100 text-green-800' :
                        template.type === 'password_reset' ? 'bg-red-100 text-red-800' :
                        template.type === 'limit_exhausted' ? 'bg-orange-100 text-orange-800' :
                        template.type === 'special_offers' ? 'bg-purple-100 text-purple-800' :
                        template.type === 'account_deletion' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {template.type.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        template.category === 'system' ? 'bg-gray-100 text-gray-800' :
                        template.category === 'marketing' ? 'bg-pink-100 text-pink-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {template.category}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sent:</span>
                      <span className="font-medium">{template.sentCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Open Rate:</span>
                      <span className="font-medium text-green-600">{template.openRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Click Rate:</span>
                      <span className="font-medium text-blue-600">{template.clickRate}%</span>
                    </div>
                    {template.lastUsed && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Last Used:</span>
                        <span className="font-medium">{template.lastUsed}</span>
                      </div>
                    )}
                  </div>

                  {template.variables && template.variables.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Variables:</p>
                      <div className="flex flex-wrap gap-1">
                        {template.variables.map((variable) => (
                          <span key={variable} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {variable}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 transition-colors">
                      Edit
                    </button>
                    <button 
                      onClick={() => handlePreviewTemplate(template)}
                      className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 transition-colors"
                    >
                      Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Email Campaigns Section */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Email Campaigns</h2>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Campaign</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Template</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Recipients</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Opened</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Clicked</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{campaign.name}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{campaign.template}</td>
                      <td className="py-3 px-4 text-gray-600">{campaign.recipients.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{campaign.opened}</span>
                          <span className="text-sm text-green-600">
                            ({((campaign.opened / campaign.sent) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{campaign.clicked}</span>
                          <span className="text-sm text-blue-600">
                            ({((campaign.clicked / campaign.sent) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                          campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                          campaign.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{campaign.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Send className="w-5 h-5 text-green-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Send Test Email</p>
                <p className="text-sm text-gray-600">Test email templates</p>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <Users className="w-5 h-5 text-blue-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">Create Campaign</p>
                <p className="text-sm text-gray-600">Launch email campaign</p>
              </div>
            </button>
            
            <button className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div className="text-left">
                <p className="font-medium text-gray-900">View Analytics</p>
                <p className="text-sm text-gray-600">Detailed email analytics</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Template Preview Modal */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                Preview: {previewTemplate.name}
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Subject:</strong> {previewTemplate.subject}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Category:</strong> {previewTemplate.category} | 
                  <strong> Type:</strong> {previewTemplate.type.replace('_', ' ')}
                </p>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <div 
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: previewTemplate.previewHtml }}
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              <button
                onClick={() => {
                  // TODO: Implement use in campaign
                  setShowPreview(false);
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Use in Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
