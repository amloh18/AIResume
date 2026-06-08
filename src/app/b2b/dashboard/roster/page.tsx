// @ts-nocheck
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, Eye, UploadCloud, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { AICVParser } from '@/lib/services/aiCVParser';
import { useUnifiedAuth } from '@/lib/hooks/useUnifiedAuth';
import { format } from 'date-fns';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

interface Candidate {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  score?: number;
  status: string;
  createdAt: string;
  cvData?: any;
}

export default function RosterPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [minScoreFilter, setMinScoreFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (minScoreFilter) params.append('minScore', minScoreFilter);
      if (skillFilter) params.append('skill', skillFilter);
      if (locationFilter) params.append('location', locationFilter);

      const response = await fetch(`/api/b2b/roster?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setCandidates(data.data);
        setTotal(data.pagination.total);
        setTotalPages(data.pagination.totalPages);
      } else {
        toast.error(data.error || 'Failed to fetch candidates');
      }
    } catch (error) {
      toast.error('An error occurred while fetching candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [page, statusFilter, minScoreFilter]); // Fetch when page or select filters change

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCandidates();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'reviewed': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'shortlisted': return 'bg-[#80FF00]/10 text-[#80FF00] border-[#80FF00]/20';
      case 'rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'hired': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    try {
      const res = await fetch(`/api/b2b/roster/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Candidate deleted successfully');
        fetchCandidates();
      } else {
        toast.error(data.error || 'Failed to delete candidate');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    setIsUploading(true);
    
    try {
      toast.loading(`Parsing ${files.length} CV(s)...`, { id: 'cv-upload' });
      
      const parsedResults = [];
      
      for (const file of files) {
        try {
          const result = await AICVParser.parseCV(file);
          if (result.success && result.data) {
            parsedResults.push(result.data);
          }
        } catch (err) {
          console.error('Error parsing file:', file.name, err);
        }
      }
      
      if (parsedResults.length === 0) {
        toast.error('Failed to parse any of the uploaded CVs', { id: 'cv-upload' });
        return;
      }
      
      toast.loading(`Saving ${parsedResults.length} candidates...`, { id: 'cv-upload' });
      
      const saveRes = await fetch('/api/b2b/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidates: parsedResults })
      });
      
      const saveData = await saveRes.json();
      if (saveData.success) {
        toast.success(`Successfully scanned and saved ${parsedResults.length} CVs!`, { id: 'cv-upload' });
        fetchCandidates();
      } else {
        toast.error(saveData.error || 'Failed to save candidates', { id: 'cv-upload' });
      }
      
    } catch (err) {
      console.error(err);
      toast.error('An error occurred during CV upload', { id: 'cv-upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12">
        <div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4 uppercase text-white">
            SMART <span className="text-[#80FF00]">ROSTER</span>
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-xl">
            Manage and filter your parsed candidates. View detailed analysis and match scores.
          </p>
        </div>
        <div className="flex gap-4">
          <input 
            type="file" 
            multiple 
            accept=".pdf,.doc,.docx" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isUploading}
            className="px-8 py-4 bg-[#80FF00] text-black font-black rounded-2xl flex items-center gap-2 hover:scale-105 transition-all text-xs tracking-widest uppercase"
          >
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            SCAN CVs
          </button>
        </div>
      </div>

      <div className="p-10 bg-white/5 border border-white/10 backdrop-blur-xl rounded-[40px] shadow-2xl">
        <div className="flex flex-col gap-8 mb-12">
          <form onSubmit={handleSearch} className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                placeholder="SEARCH ASSETS BY NAME OR EMAIL..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold tracking-widest uppercase focus:outline-none focus:border-[#80FF00] transition-all text-white"
              />
            </div>
            <button type="submit" className="px-8 bg-white/10 text-white font-black rounded-2xl hover:bg-white hover:text-black transition-all text-xs tracking-widest uppercase">
              FILTER
            </button>
          </form>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 mr-4">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Quick Params:</span>
            </div>
            <input
              placeholder="SKILL..."
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold tracking-widest uppercase focus:outline-none focus:border-[#80FF00] transition-all text-white"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              onBlur={fetchCandidates}
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-white h-12 rounded-xl text-[10px] font-bold tracking-widest uppercase">
                <SelectValue placeholder="STATUS" />
              </SelectTrigger>
              <SelectContent className="bg-[#0d1209] border-white/10 text-white">
                <SelectItem value="all">ALL STATUSES</SelectItem>
                <SelectItem value="new">NEW</SelectItem>
                <SelectItem value="reviewed">REVIEWED</SelectItem>
                <SelectItem value="shortlisted">SHORTLISTED</SelectItem>
                <SelectItem value="rejected">REJECTED</SelectItem>
                <SelectItem value="hired">HIRED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-white/5">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase">Candidate Asset</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-center">Match</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-center">Status</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-right">Added On</th>
                <th className="px-8 py-6 text-[10px] font-black tracking-widest text-gray-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-[#80FF00]" /></td></tr>
              ) : candidates.length === 0 ? (
                <tr><td colSpan={5} className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest">No Active Assets</td></tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center font-black text-xs text-[#80FF00] group-hover:bg-[#80FF00] group-hover:text-black transition-all">
                          {(candidate.firstName || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white uppercase tracking-tight">
                            {candidate.firstName || candidate.lastName
                              ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
                              : candidate.cvData?.basics?.name || 'UNKNOWN ASSET'}
                          </div>
                          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">
                            {candidate.email || 'NO EMAIL'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      {candidate.score !== undefined ? (
                        <span className="text-2xl font-black tracking-tighter text-white">{candidate.score}</span>
                      ) : <span className="text-gray-500">-</span>}
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        getStatusColor(candidate.status)
                      )}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right text-[10px] font-bold text-gray-500 uppercase">
                      {format(new Date(candidate.createdAt), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white hover:text-black transition-all"
                          onClick={() => router.push(`/b2b/dashboard/roster/${candidate._id}`)}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button 
                          className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                          onClick={() => handleDelete(candidate._id)}
                        >
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

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between mt-8">
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
            Showing {(page - 1) * 10 + 1} TO {Math.min(page * 10, total)} OF {total} ASSETS
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-30 transition-all hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-xs font-black tracking-widest uppercase">
              PAGE {page} / {totalPages}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-3 bg-white/5 border border-white/10 rounded-xl text-white disabled:opacity-30 transition-all hover:bg-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
