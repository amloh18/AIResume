'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, Eye, UploadCloud } from 'lucide-react';
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
      case 'new': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'reviewed': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'shortlisted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'hired': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
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
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Smart Roster
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Manage and filter your parsed candidates. View detailed analysis and match scores.
          </p>
        </div>
      </div>

      <Card className={glassCard}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Candidate Database</CardTitle>
              <CardDescription>
                Showing {total} total candidates
              </CardDescription>
            </div>
            <div>
              <input 
                type="file" 
                multiple 
                accept=".pdf,.doc,.docx" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploading}
                className="flex items-center gap-2"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                Scan CVs
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary">Search</Button>
            </form>
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Input
                placeholder="Skill (e.g. React)"
                className="w-[140px]"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                onBlur={fetchCandidates}
                onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
              />
              <Input
                placeholder="Location"
                className="w-[140px]"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                onBlur={fetchCandidates}
                onKeyDown={(e) => e.key === 'Enter' && fetchCandidates()}
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="shortlisted">Shortlisted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="hired">Hired</SelectItem>
                </SelectContent>
              </Select>
              <Select value={minScoreFilter} onValueChange={setMinScoreFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Min Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Score</SelectItem>
                  <SelectItem value="50">50+</SelectItem>
                  <SelectItem value="70">70+</SelectItem>
                  <SelectItem value="85">85+</SelectItem>
                  <SelectItem value="90">90+</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Candidate</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Match Score</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Added</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </td>
                  </tr>
                ) : candidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No candidates found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  candidates.map((candidate) => (
                    <tr key={candidate._id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        {candidate.firstName || candidate.lastName
                          ? `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim()
                          : candidate.cvData?.basics?.name || 'Unknown Candidate'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {candidate.email || candidate.cvData?.basics?.email || 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        {candidate.score !== undefined ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  candidate.score >= 80 ? 'bg-green-500' :
                                  candidate.score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${candidate.score}%` }}
                              />
                            </div>
                            <span className="font-medium">{candidate.score}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={getStatusColor(candidate.status)}>
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => router.push(`/b2b/dashboard/roster/${candidate._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, total)} of {total} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm font-medium px-2">
                  Page {page} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
