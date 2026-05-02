// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, FileText, CheckCircle, XCircle, FileQuestion, Calendar, Trash2, Share2, Star, MessageSquare, Send, Banknote } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import CVPreviewContent from '@/components/cv-preview/CVPreviewContent';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default function CandidateDetailPage() {
  const router = useRouter();
  const params = useParams();
  const candidateId = params.id as string;

  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'preview' | 'interview' | 'scorecard' | 'communication' | 'offer'>('preview');

  const [generatingGuide, setGeneratingGuide] = useState(false);
  
  // New States
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  
  // Scorecard State
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [savingScorecard, setSavingScorecard] = useState(false);

  // Communication State
  const [message, setMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Offer State
  const [offerSalary, setOfferSalary] = useState('');
  const [offerStartDate, setOfferStartDate] = useState('');
  const [savingOffer, setSavingOffer] = useState(false);

  const fetchCandidate = async () => {
    try {
      const response = await fetch(`/api/b2b/roster/${candidateId}`);
      const data = await response.json();

      if (data.success) {
        setCandidate(data.data);
        if (data.data.metadata?.humanScorecard) {
          setRating(data.data.metadata.humanScorecard.rating || 0);
          setNotes(data.data.metadata.humanScorecard.notes || '');
        }
        if (data.data.metadata?.offerDetails) {
          setOfferSalary(data.data.metadata.offerDetails.salary || '');
          setOfferStartDate(data.data.metadata.offerDetails.startDate || '');
        }
      } else {
        toast.error(data.error || 'Failed to fetch candidate');
        router.push('/b2b/dashboard/roster');
      }
    } catch (error) {
      toast.error('An error occurred while fetching candidate');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (candidateId) {
      fetchCandidate();
    }
  }, [candidateId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      setUpdating(true);
      const response = await fetch(`/api/b2b/roster/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await response.json();

      if (data.success) {
        setCandidate(data.data);
        toast.success('Status updated successfully');
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (error) {
      toast.error('An error occurred while updating status');
    } finally {
      setUpdating(false);
    }
  };

  const handleGenerateInterviewGuide = async () => {
    if (!candidate.metadata?.jobDescription) {
      toast.error('A Job Description must be attached to generate an interview guide');
      return;
    }
    
    setGeneratingGuide(true);
    try {
      const response = await fetch('/api/v1/b2b/interview-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateId: candidate._id,
          jobTitle: candidate.metadata.jobTitle,
          jobDescription: candidate.metadata.jobDescription
        })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success('Interview guide generated successfully!');
        fetchCandidate(); // Refresh candidate data to get the new guide
      } else {
        toast.error(data.error || 'Failed to generate guide');
      }
    } catch (error) {
      toast.error('An error occurred while generating the interview guide');
    } finally {
      setGeneratingGuide(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this candidate?')) return;
    
    try {
      const res = await fetch(`/api/b2b/roster/${candidateId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Candidate deleted successfully');
        router.push('/b2b/dashboard/roster');
      } else {
        toast.error(data.error || 'Failed to delete candidate');
      }
    } catch (err) {
      toast.error('An error occurred');
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const res = await fetch(`/api/b2b/roster/${candidateId}/share`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        const url = `${window.location.origin}/shared/candidate/${data.data.token}`;
        setShareUrl(url);
        navigator.clipboard.writeText(url);
        toast.success('Share link copied to clipboard!');
      } else {
        toast.error(data.error || 'Failed to generate link');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setSharing(false);
    }
  };

  const handleSaveScorecard = async () => {
    setSavingScorecard(true);
    try {
      const res = await fetch(`/api/b2b/roster/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { humanScorecard: { rating, notes } } })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Scorecard saved successfully');
        setCandidate(data.data);
      }
    } catch (err) {
      toast.error('Failed to save scorecard');
    } finally {
      setSavingScorecard(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    setSendingMsg(true);
    try {
      const newComm = {
        id: Date.now().toString(),
        type: 'email',
        message,
        date: new Date(),
        sentBy: 'HR Team'
      };
      const existingComms = candidate.metadata?.communications || [];
      const res = await fetch(`/api/b2b/roster/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { communications: [newComm, ...existingComms] } })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Message sent & logged');
        setCandidate(data.data);
        setMessage('');
      }
    } catch (err) {
      toast.error('Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleGenerateOffer = async () => {
    setSavingOffer(true);
    try {
      const res = await fetch(`/api/b2b/roster/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: { offerDetails: { salary: offerSalary, startDate: offerStartDate, status: 'draft' } } })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Offer details saved');
        setCandidate(data.data);
      }
    } catch (err) {
      toast.error('Failed to save offer');
    } finally {
      setSavingOffer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) return null;

  const cv = candidate.cvData || {};
  const basics = cv.basics || {};
  const name = `${candidate.firstName || basics.name?.split(' ')[0] || ''} ${candidate.lastName || basics.name?.split(' ').slice(1).join(' ') || ''}`.trim() || 'Unknown Candidate';
  const scoreResult = candidate.metadata?.scoreResult;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/b2b/dashboard/roster')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
            <p className="text-muted-foreground mt-1">
              Candidate ID: {candidate._id} • Added {format(new Date(candidate.createdAt), 'MMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={candidate.status} 
            onValueChange={handleStatusChange}
            disabled={updating}
          >
            <SelectTrigger className="w-[140px]">
              {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SelectValue placeholder="Status" />}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="shortlisted">Shortlisted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20" onClick={handleShare} disabled={sharing}>
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share Profile
          </Button>
          {candidate.resumeUrl && (
            <Button variant="outline" onClick={() => window.open(candidate.resumeUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Original CV
            </Button>
          )}
          <Button 
            variant="outline" 
            className="gap-2 text-destructive border-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left Column - Contact & Summary */}
        <div className="space-y-6">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="text-sm">
                  <div className="font-medium">Email</div>
                  <div className="text-muted-foreground break-all">{candidate.email || basics.email || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="text-sm">
                  <div className="font-medium">Phone</div>
                  <div className="text-muted-foreground">{candidate.phone || basics.phone || 'N/A'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="text-sm">
                  <div className="font-medium">Location</div>
                  <div className="text-muted-foreground">
                    {basics.location?.city ? `${basics.location.city}, ${basics.location.countryCode}` : 'N/A'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {candidate.score !== undefined && (
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-lg">Match Score</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center flex-col">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="64" cy="64" r="56" className="stroke-muted fill-none stroke-[8]" />
                      <circle 
                        cx="64" 
                        cy="64" 
                        r="56" 
                        className={`fill-none stroke-[8] ${
                          candidate.score >= 80 ? 'stroke-green-500' :
                          candidate.score >= 60 ? 'stroke-yellow-500' : 'stroke-red-500'
                        }`}
                        strokeDasharray="351.858"
                        strokeDashoffset={351.858 - (351.858 * candidate.score) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute text-3xl font-bold">{candidate.score}</div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Overall match against requirements
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {cv.skills && cv.skills.length > 0 && (
            <Card className={glassCard}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Code className="h-5 w-5 text-primary" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {cv.skills.map((skillGroup: any, idx: number) => (
                    <React.Fragment key={idx}>
                      {(skillGroup.keywords || []).map((skill: string, sIdx: number) => (
                        <Badge key={`${idx}-${sIdx}`} variant="secondary">{skill}</Badge>
                      ))}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Analysis & Experience or Preview */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b dark:border-gray-800 pb-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === 'preview' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              CV Preview
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                activeTab === 'analysis' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Extracted Data
            </button>
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'interview' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Interview Guide
              {candidate.metadata?.interviewGuide && (
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'scorecard' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Scorecard
            </button>
            <button
              onClick={() => setActiveTab('communication')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'communication' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Communication
            </button>
            <button
              onClick={() => setActiveTab('offer')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'offer' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Offer
            </button>
          </div>

          {activeTab === 'preview' ? (
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 md:p-8 overflow-x-auto border">
              <div className="min-w-[700px] max-w-[850px] mx-auto">
                <CVPreviewContent 
                  cvData={cv}
                  templateName="hybrid-split"
                  theme="light"
                />
              </div>
            </div>
          ) : activeTab === 'interview' ? (
            <div className="space-y-6">
              <Card className={`border-primary/20 shadow-sm ${glassCard}`}>
                <CardHeader className="bg-primary/5 pb-4">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <FileQuestion className="h-5 w-5 text-primary" />
                      Dynamic Interview Guide
                    </span>
                    {candidate.metadata?.interviewGuide && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Send to Calendar
                      </Button>
                    )}
                  </CardTitle>
                  <CardDescription className="text-sm mt-1">
                    AI-generated technical questions based specifically on the candidate's skill gaps against the Job Description.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {!candidate.metadata?.jobDescription ? (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground mb-4">No Job Description attached to this candidate.</p>
                      <Button variant="outline" disabled>Cannot Generate Guide</Button>
                    </div>
                  ) : !candidate.metadata?.interviewGuide ? (
                    <div className="text-center py-10">
                      <p className="text-muted-foreground mb-4">Generate a targeted interview guide to probe this candidate's specific weaknesses.</p>
                      <Button onClick={handleGenerateInterviewGuide} disabled={generatingGuide}>
                        {generatingGuide ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileQuestion className="mr-2 h-4 w-4" />}
                        Generate Guide
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {candidate.metadata.interviewGuide.map((q: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-gray-900 border rounded-lg p-5">
                          <h4 className="font-semibold text-lg mb-2">Q{idx + 1}. {q.question}</h4>
                          <div className="mt-3 text-sm space-y-3">
                            <div className="flex gap-2">
                              <span className="font-medium text-amber-600 dark:text-amber-400 shrink-0">Why ask this:</span>
                              <span className="text-muted-foreground">{q.reason}</span>
                            </div>
                            <div className="flex gap-2">
                              <span className="font-medium text-blue-600 dark:text-blue-400 shrink-0">What to look for:</span>
                              <span className="text-muted-foreground">{q.whatToLookFor}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : activeTab === 'scorecard' ? (
            <div className="space-y-6">
              <Card className={`border-primary/20 shadow-sm ${glassCard}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Star className="h-5 w-5 text-primary" /> Human Scorecard
                  </CardTitle>
                  <CardDescription>Leave your evaluation notes after interviewing the candidate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Overall Rating</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          onClick={() => setRating(star)}
                          className={`p-1 rounded-md transition-colors ${rating >= star ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'}`}
                        >
                          <Star className={`w-8 h-8 ${rating >= star ? 'fill-current' : ''}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Interview Notes</label>
                    <Textarea 
                      placeholder="What were their strengths? Any red flags?" 
                      className="min-h-[200px]"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleSaveScorecard} disabled={savingScorecard}>
                    {savingScorecard ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save Scorecard
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === 'communication' ? (
            <div className="space-y-6">
              <Card className={`shadow-sm ${glassCard}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" /> Communication History
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3 bg-muted/30 p-4 rounded-xl border">
                    <label className="text-sm font-medium">Send Email / Add Note</label>
                    <Textarea 
                      placeholder="Draft an email or log a call..." 
                      className="min-h-[100px] bg-background"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleSendMessage} disabled={sendingMsg || !message.trim()} className="gap-2">
                        {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        Send Message
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t dark:border-gray-800">
                    <h4 className="text-sm font-semibold">History</h4>
                    {(!candidate.metadata?.communications || candidate.metadata.communications.length === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No communications logged yet.</p>
                    ) : (
                      <div className="space-y-4">
                        {candidate.metadata.communications.map((comm: any, i: number) => (
                          <div key={i} className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div className="flex-1 bg-white dark:bg-gray-900 border rounded-xl p-4 shadow-sm">
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-semibold text-sm">{comm.sentBy}</span>
                                <span className="text-xs text-muted-foreground">{new Date(comm.date).toLocaleString()}</span>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comm.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : activeTab === 'offer' ? (
            <div className="space-y-6">
              <Card className={`shadow-sm ${glassCard}`}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-primary" /> Offer Letter Generator
                  </CardTitle>
                  <CardDescription>Draft an offer and specify compensation details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proposed Salary</label>
                      <Input 
                        placeholder="$120,000 / year" 
                        value={offerSalary}
                        onChange={(e) => setOfferSalary(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Proposed Start Date</label>
                      <Input 
                        type="date"
                        value={offerStartDate}
                        onChange={(e) => setOfferStartDate(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Mock Offer Letter Preview */}
                  <div className="mt-8 p-8 border rounded-xl bg-white dark:bg-gray-950 font-serif text-gray-800 dark:text-gray-200">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold">Offer of Employment</h2>
                    </div>
                    <p className="mb-4">Dear {candidate.firstName},</p>
                    <p className="mb-4">
                      We are thrilled to offer you the position of <strong>{candidate.metadata?.jobTitle || 'Professional'}</strong>. 
                      Based on your excellent interviews and AI-verified skills in {cv?.skills?.[0]?.keywords?.slice(0, 2).join(', ') || 'your field'}, 
                      we believe you will be a fantastic addition to our team.
                    </p>
                    <p className="mb-4">
                      <strong>Compensation:</strong> {offerSalary || '[Salary]'}
                      <br/>
                      <strong>Start Date:</strong> {offerStartDate ? new Date(offerStartDate).toLocaleDateString() : '[Date]'}
                    </p>
                    <p>We look forward to welcoming you.</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline">Preview PDF</Button>
                    <Button onClick={handleGenerateOffer} disabled={savingOffer}>
                      {savingOffer ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Save Offer Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              {scoreResult && (
            <Card className={`border-primary/20 shadow-sm ${glassCard}`}>
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    CV vs Job Description Analysis
                  </span>
                  <Badge variant="outline" className="bg-white dark:bg-black">
                    Grade: {scoreResult.overallGrade || 'N/A'}
                  </Badge>
                </CardTitle>
                {candidate.metadata?.jobTitle && (
                  <CardDescription className="text-sm mt-1">
                    Analyzed against: <span className="font-medium text-foreground">{candidate.metadata.jobTitle}</span>
                    {candidate.metadata.company && ` at ${candidate.metadata.company}`}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {scoreResult.issues && scoreResult.issues.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">Identified Gaps</h3>
                    <ul className="space-y-2">
                      {scoreResult.issues.slice(0, 5).map((issue: any, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-200 p-2 rounded">
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{issue.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {scoreResult.recommendations && scoreResult.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider mb-3">Recommendations</h3>
                    <ul className="space-y-2">
                      {scoreResult.recommendations.slice(0, 5).map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm bg-blue-50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-200 p-2 rounded">
                          <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" />
                Professional Experience
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cv.work && cv.work.length > 0 ? (
                cv.work.map((work: any, idx: number) => (
                  <div key={idx} className="border-b last:border-0 pb-6 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">{work.position}</h3>
                        <p className="text-muted-foreground">{work.name || work.company}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {work.startDate ? new Date(work.startDate).getFullYear() : 'N/A'} - 
                        {work.endDate ? new Date(work.endDate).getFullYear() : 'Present'}
                      </Badge>
                    </div>
                    {work.summary && <p className="text-sm mt-2">{work.summary}</p>}
                    {work.highlights && work.highlights.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {work.highlights.map((hl: string, hIdx: number) => (
                          <li key={hIdx} className="text-sm flex items-start gap-2">
                            <span className="text-primary mt-1">•</span>
                            <span>{hl}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No experience data available.</p>
              )}
            </CardContent>
          </Card>

          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {cv.education && cv.education.length > 0 ? (
                cv.education.map((edu: any, idx: number) => (
                  <div key={idx} className="border-b last:border-0 pb-6 last:pb-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {edu.studyType} {edu.area ? `in ${edu.area}` : ''}
                        </h3>
                        <p className="text-muted-foreground">{edu.institution}</p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {edu.startDate ? new Date(edu.startDate).getFullYear() : 'N/A'} - 
                        {edu.endDate ? new Date(edu.endDate).getFullYear() : 'Present'}
                      </Badge>
                    </div>
                    {edu.score && <p className="text-sm mt-1">Grade/Score: {edu.score}</p>}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No education data available.</p>
              )}
            </CardContent>
          </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
