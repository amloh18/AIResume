// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Search, Plus, Filter, MoreVertical, Edit, Power, CheckCircle, AlertCircle, RefreshCw 
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Tenant {
  _id: string;
  name: string;
  contactEmail: string;
  subscriptionTier: string;
  isActive: boolean;
  rateLimit: number;
  apiUsageCount: number;
  createdAt: string;
}

export default function BusinessManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactEmail: '',
    subscriptionTier: 'free',
    rateLimit: 60
  });

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/b2b/tenants');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants);
      }
    } catch (error) {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/b2b/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Business account created successfully');
        setShowCreateModal(false);
        setFormData({ name: '', contactEmail: '', subscriptionTier: 'free', rateLimit: 60 });
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to create account');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    try {
      const res = await fetch(`/api/admin/b2b/tenants/${selectedTenant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionTier: formData.subscriptionTier,
          rateLimit: formData.rateLimit,
          isActive: formData.isActive
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Business account updated');
        setShowEditModal(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to update account');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    if (!confirm(`Are you sure you want to ${tenant.isActive ? 'suspend' : 'activate'} ${tenant.name}?`)) return;

    try {
      const res = await fetch(`/api/admin/b2b/tenants/${tenant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Account ${tenant.isActive ? 'suspended' : 'activated'}`);
        fetchTenants();
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.contactEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Businesses (B2B)</h2>
          <p className="text-muted-foreground text-sm mt-1">Manage B2B tenants, API quotas, and subscriptions.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Business
        </button>
      </div>

      <div className="bg-white dark:bg-black/40 border dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b dark:border-gray-800 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search businesses..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border dark:border-gray-800 rounded-md text-sm"
            />
          </div>
          <button onClick={fetchTenants} className="p-2 border dark:border-gray-800 rounded-md hover:bg-gray-50 dark:hover:bg-gray-900">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-muted-foreground border-b dark:border-gray-800">
              <tr>
                <th className="px-6 py-3 font-medium">Business Name</th>
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">API Usage</th>
                <th className="px-6 py-3 font-medium">Rate Limit</th>
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">Loading businesses...</td></tr>
              ) : filteredTenants.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">No businesses found.</td></tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant._id} className="hover:bg-gray-50/50 dark:hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{tenant.name}</div>
                      <div className="text-xs text-muted-foreground">{tenant.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        tenant.subscriptionTier === 'enterprise' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                        tenant.subscriptionTier === 'pro' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                      }`}>
                        {tenant.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-medium ${tenant.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {tenant.isActive ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {tenant.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{tenant.apiUsageCount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">Total calls</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{tenant.rateLimit}</div>
                      <div className="text-xs text-muted-foreground">req / min</div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setFormData({ ...formData, subscriptionTier: tenant.subscriptionTier, rateLimit: tenant.rateLimit, isActive: tenant.isActive } as any);
                            setShowEditModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="Edit Settings"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(tenant)}
                          className={`p-1.5 rounded ${tenant.isActive ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30'}`}
                          title={tenant.isActive ? 'Suspend' : 'Activate'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b dark:border-gray-800">
              <h3 className="text-lg font-bold">Create New Business (B2B)</h3>
              <p className="text-sm text-muted-foreground mt-1">This will create a new tenant and assign the email as the B2B admin.</p>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Company Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent" placeholder="Acme Corp" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Admin Email</label>
                <input required type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent" placeholder="admin@acmecorp.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select value={formData.subscriptionTier} onChange={e => setFormData({...formData, subscriptionTier: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                  <input type="number" value={formData.rateLimit} onChange={e => setFormData({...formData, rateLimit: parseInt(e.target.value)})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent" />
                </div>
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md">Create Business</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b dark:border-gray-800">
              <h3 className="text-lg font-bold">Edit Settings: {selectedTenant.name}</h3>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Plan</label>
                  <select value={formData.subscriptionTier} onChange={e => setFormData({...formData, subscriptionTier: e.target.value})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                  <input type="number" value={formData.rateLimit} onChange={e => setFormData({...formData, rateLimit: parseInt(e.target.value)})} className="w-full px-3 py-2 border dark:border-gray-800 rounded-md bg-transparent" />
                </div>
              </div>
              <div className="pt-4 flex gap-3 justify-end">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-md">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
