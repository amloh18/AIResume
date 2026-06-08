'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Search, Briefcase, MapPin, MoreVertical, Edit, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Job {
  _id: string;
  jobTitle: string;
  company: string;
  location: string;
  status: string;
  createdAt: string;
  jobDescription?: string;
}

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default function B2BJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    jobTitle: '',
    company: '',
    location: '',
    status: 'created',
    jobDescription: ''
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/b2b/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.data);
      }
    } catch (error) {
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleOpenCreate = () => {
    setIsEditing(false);
    setSelectedJob(null);
    setFormData({
      jobTitle: '',
      company: '',
      location: '',
      status: 'created',
      jobDescription: ''
    });
    setShowModal(true);
  };

  const handleOpenEdit = (job: Job) => {
    setIsEditing(true);
    setSelectedJob(job);
    setFormData({
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location || '',
      status: job.status,
      jobDescription: job.jobDescription || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing && selectedJob ? `/api/b2b/jobs/${selectedJob._id}` : '/api/b2b/jobs';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(isEditing ? 'Job updated successfully' : 'Job created successfully');
        setShowModal(false);
        fetchJobs();
      } else {
        toast.error(data.error || 'Failed to save job');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job requisition?')) return;
    try {
      const res = await fetch(`/api/b2b/jobs/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Job deleted');
        fetchJobs();
      } else {
        toast.error(data.error || 'Failed to delete job');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const filteredJobs = jobs.filter(j => 
    j.jobTitle.toLowerCase().includes(searchTerm.toLowerCase()) || 
    j.company.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase text-white">
            JOBS & <span className="text-[#80FF00]">REQUISITIONS</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-xl">
            Manage your open positions and use them as scoring rubrics for incoming candidates.
          </p>
        </div>
      </div>

      <div className="p-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[40px] shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-8 mb-12">
          <div>
            <h2 className="text-2xl font-black tracking-tight uppercase text-white">Active Positions</h2>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mt-1">Found {jobs.length} requisitions</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                placeholder="SEARCH POSITIONS..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-[#80FF00] transition-all w-full md:w-64 text-white"
              />
            </div>
            <button onClick={fetchJobs} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-[#80FF00]">
              <RefreshCw className="h-5 w-5" />
            </button>
            <button onClick={handleOpenCreate} className="px-8 py-4 bg-[#80FF00] text-black font-black rounded-2xl flex items-center gap-2 hover:scale-105 transition-all text-xs tracking-widest uppercase">
              <Plus className="h-4 w-4" /> NEW JOB
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/5">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Position Title</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Department</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Location</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#80FF00]" />
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">
                    No active requisitions
                  </td>
                </tr>
              ) : (
                filteredJobs.map(job => (
                  <tr key={job._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#80FF00]">
                          <Briefcase className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-white uppercase tracking-tight">{job.jobTitle}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-400 uppercase tracking-tighter">{job.company}</td>
                    <td className="px-8 py-6 text-sm font-bold text-gray-500 uppercase tracking-widest">
                      {job.location || 'REMOTE'}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10 ${
                        job.status === 'created' ? "bg-[#80FF00]/10 text-[#80FF00]" : "bg-white/5 text-gray-500"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white hover:text-black transition-all" onClick={() => handleOpenEdit(job)}>
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all" onClick={() => handleDelete(job._id)}>
                          <Trash2 className="h-4 w-4" />
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-background z-10">
              <h3 className="text-lg font-bold">{isEditing ? 'Edit Job Requisition' : 'Create New Job Requisition'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Job Title *</label>
                  <Input required value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} placeholder="e.g. Senior Frontend Engineer" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Company / Department *</label>
                  <Input required value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} placeholder="e.g. Acme Corp" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="e.g. London, UK or Remote" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={formData.status} onValueChange={(v) => setFormData({...formData, status: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="created">Active / Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Description (Used for AI Scoring)</label>
                <Textarea 
                  className="min-h-[200px]" 
                  value={formData.jobDescription} 
                  onChange={e => setFormData({...formData, jobDescription: e.target.value})} 
                  placeholder="Paste the full job description here. The AI will use this to accurately score candidates against this specific role..."
                />
              </div>
              <div className="pt-4 flex gap-3 justify-end border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">{isEditing ? 'Save Changes' : 'Create Job'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
