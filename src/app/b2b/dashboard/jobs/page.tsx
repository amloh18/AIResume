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
    <div className="space-y-8 pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Jobs & Requisitions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Manage your open positions and use them as scoring rubrics for incoming candidates.
          </p>
        </div>
      </div>

      <Card className={glassCard}>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Active Requisitions</CardTitle>
              <CardDescription>You have {jobs.length} total jobs.</CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search jobs..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button onClick={fetchJobs} variant="outline" size="icon">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button onClick={handleOpenCreate} className="gap-2">
                <Plus className="h-4 w-4" /> Create Job
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[800px]">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Job Title</th>
                  <th className="px-4 py-3 font-medium">Company</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No jobs found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 font-medium flex items-center gap-2">
                        <Briefcase className="h-4 w-4 text-primary" />
                        {job.jobTitle}
                      </td>
                      <td className="px-4 py-3">{job.company}</td>
                      <td className="px-4 py-3 text-muted-foreground flex items-center gap-1">
                        {job.location && <MapPin className="h-3 w-3" />}
                        {job.location || 'Remote'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={job.status === 'created' ? 'default' : 'secondary'} className="capitalize">
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(job)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(job._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
