'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, Download, Mail, Phone, MapPin, Briefcase, GraduationCap, Code, FileText, CheckCircle, XCircle } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'analysis' | 'preview'>('preview');

  const fetchCandidate = async () => {
    try {
      const response = await fetch(`/api/b2b/roster/${candidateId}`);
      const data = await response.json();

      if (data.success) {
        setCandidate(data.data);
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
          {candidate.resumeUrl && (
            <Button variant="outline" onClick={() => window.open(candidate.resumeUrl, '_blank')}>
              <Download className="h-4 w-4 mr-2" />
              Original CV
            </Button>
          )}
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
          <div className="flex items-center gap-2 border-b dark:border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'preview' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              CV Preview
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === 'analysis' 
                  ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              Analysis & Extracted Data
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
