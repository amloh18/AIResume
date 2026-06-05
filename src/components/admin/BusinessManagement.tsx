// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Briefcase, Search, Plus, Filter, MoreVertical, Edit, Power, CheckCircle, 
  AlertCircle, RefreshCw, Globe, Zap, Shield, TrendingUp, ArrowUpRight, X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [mounted, setMounted] = useState(false);
  
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchTenants = async () => {
    if (!mounted) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/b2b/tenants');
      if (!res.ok) throw new Error('API request failed');
      const data = await res.json();
      if (data.success) {
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Loading Failed');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, [mounted]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/b2b/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Creation failed');
      const data = await res.json();
      if (data.success) {
        toast.success('Business Added');
        setShowCreateModal(false);
        setFormData({ name: '', contactEmail: '', subscriptionTier: 'free', rateLimit: 60 });
        fetchTenants();
      } else {
        toast.error(data.error || 'Failed to add business');
      }
    } catch (error) {
      toast.error('Connection Error');
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
      if (!res.ok) throw new Error('Update failed');
      const data = await res.json();
      if (data.success) {
        toast.success('Business Updated');
        setShowEditModal(false);
        setSelectedTenant(null);
        fetchTenants();
      } else {
        toast.error(data.error || 'Update Failed');
      }
    } catch (error) {
      toast.error('Connection Error');
    }
  };

  const toggleStatus = async (tenant: Tenant) => {
    if (!confirm(`Confirm ${tenant.isActive ? 'suspension' : 'activation'} of ${tenant.name}?`)) return;

    try {
      const res = await fetch(`/api/admin/b2b/tenants/${tenant._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive })
      });
      if (!res.ok) throw new Error('Status update failed');
      const data = await res.json();
      if (data.success) {
        toast.success(`${tenant.name} ${tenant.isActive ? 'suspended' : 'activated'}`);
        fetchTenants();
      }
    } catch (error) {
      toast.error('Connection Error');
    }
  };

  const filteredTenants = (tenants || []).filter(t => 
    (t.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (t.contactEmail || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-10">
      {/* Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
            Business <span className="text-emerald-500">Accounts</span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] mt-2">
            Manage Organizations • {tenants.length} Active Businesses
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-emerald-400 transition-colors" />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white/5 border border-white/5 rounded-2xl text-sm text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white/10 w-full sm:w-64 transition-all"
            />
          </div>
          
          <button onClick={fetchTenants} className="p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-white/40 hover:text-white">
            <RefreshCw className="w-5 h-5" />
          </button>

          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-black font-black rounded-2xl px-8 py-4 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex items-center gap-2 text-xs uppercase tracking-widest"
          >
            <Plus className="w-5 h-5" /> Add Business
          </button>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Businesses', val: tenants.length, icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Total Usage', val: '2.4M', icon: Zap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Active', val: tenants.filter(t => t.isActive).length, icon: Shield, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Growth', val: '+14%', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((m, i) => (
          <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-[2rem] flex flex-col justify-between h-32 group hover:bg-white/[0.08] transition-all">
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

      {/* Tenants Table */}
      <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Organization</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Plan</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Usage</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Speed Limit</th>
                <th className="px-8 py-5 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest text-xs italic">Loading Accounts...</td></tr>
              ) : filteredTenants.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-white/20 font-black uppercase tracking-widest text-xs italic">No businesses found</td></tr>
              ) : (
                filteredTenants.map(tenant => (
                  <motion.tr key={tenant._id} variants={item} className="group hover:bg-white/[0.03] transition-colors cursor-default">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center text-white font-black text-sm group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                          {(tenant.name || 'B').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors">{tenant.name || 'Unknown'}</div>
                          <div className="text-xs text-white/30 font-medium">{tenant.contactEmail || 'No Email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                        tenant.subscriptionTier === 'enterprise' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        tenant.subscriptionTier === 'pro' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-white/5 text-white/40 border-white/10'
                      }`}>
                        {tenant.subscriptionTier}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${tenant.isActive ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
                        <span className={`text-xs font-bold ${tenant.isActive ? 'text-emerald-400' : 'text-red-400'} capitalize`}>{tenant.isActive ? 'Active' : 'Suspended'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-black text-white">{tenant.apiUsageCount.toLocaleString()}</div>
                      <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Calls</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="text-xs font-black text-white">{tenant.rateLimit}</div>
                      <div className="text-[10px] text-white/20 font-bold uppercase tracking-widest">RPM</div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setSelectedTenant(tenant);
                            setFormData({ ...formData, subscriptionTier: tenant.subscriptionTier, rateLimit: tenant.rateLimit, isActive: tenant.isActive } as any);
                            setShowEditModal(true);
                          }}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 transition-all border border-transparent hover:border-emerald-500/20"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => toggleStatus(tenant)}
                          className={`p-2.5 rounded-xl bg-white/5 transition-all border border-transparent ${tenant.isActive ? 'hover:bg-red-500/10 text-white/30 hover:text-red-400 hover:border-red-500/20' : 'hover:bg-emerald-500/10 text-white/30 hover:text-emerald-400 hover:border-emerald-500/20'}`}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {(showCreateModal || (showEditModal && selectedTenant)) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-[#111111] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="p-8 border-b border-white/5 bg-white/2 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">
                    {showCreateModal ? 'Add Business' : 'Edit Business'}
                  </h3>
                  <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Management Panel</p>
                </div>
                <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={showCreateModal ? handleCreate : handleUpdate} className="p-10 space-y-8">
                {showCreateModal && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Company Name</label>
                      <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-2xl text-white transition-all" placeholder="Enter company name" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Contact Email</label>
                      <input required type="email" value={formData.contactEmail} onChange={e => setFormData({...formData, contactEmail: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-2xl text-white transition-all" placeholder="admin@company.com" />
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tier Allocation</label>
                    <select value={formData.subscriptionTier} onChange={e => setFormData({...formData, subscriptionTier: e.target.value})} className="w-full px-6 py-4 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-2xl text-white transition-all appearance-none">
                      <option value="free">Standard</option>
                      <option value="pro">Advanced</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Speed Limit (RPM)</label>
                    <input type="number" value={formData.rateLimit} onChange={e => setFormData({...formData, rateLimit: parseInt(e.target.value)})} className="w-full px-6 py-4 bg-black/40 border border-white/5 focus:border-emerald-500/50 rounded-2xl text-white transition-all" />
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="flex-1 px-8 py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all">Cancel</button>
                  <button type="submit" className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 transition-all">
                    {showCreateModal ? 'Add Business' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
