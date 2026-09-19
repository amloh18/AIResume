'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, Star, Briefcase, GraduationCap, FileText, CheckCircle, XCircle } from 'lucide-react';
import { toast } from '@/lib/hot-toast';

export default function SharedCandidatePage() {
  const params = useParams();
  const token = params.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchCandidate = async () => {
      try {
        const res = await fetch(`/api/public/shared-candidate/${token}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.error || 'Link expired');
          router.push('/404');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidate();
  }, [token, router]);

  const handleSubmitFeedback = async (status: 'approved' | 'rejected') => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/shared-candidate/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, status })
      });
      const result = await res.json();

      if (result.success) {
        toast.success(`Candidate ${status} successfully`);
        // Refresh data to show their feedback
        setData({ ...data, metadata: { ...data.metadata, clientFeedback: { status, notes: feedback, date: new Date() } } });
      } else {
        toast.error(result.error || 'Failed to submit feedback');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { cvData, tenant, metadata } = data;
  const brandColor = tenant.branding?.brandColor || '#4C9900';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {tenant.branding?.logoUrl ? (
              <img src={tenant.branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
            ) : (
              <div className="font-bold text-lg" style={{ color: brandColor }}>
                {tenant.name}
              </div>
            )}
            <span className="text-gray-400">|</span>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Candidate Presentation</span>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10 grid lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Candidate Hero */}
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row gap-6 items-start">
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shrink-0 shadow-sm" style={{ backgroundColor: brandColor }}>
              {cvData?.basics?.name ? cvData.basics.name.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {cvData?.basics?.name || 'Candidate Profile'}
              </h1>
              <p className="text-lg font-medium" style={{ color: brandColor }}>
                {cvData?.basics?.label || 'Professional'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {cvData?.basics?.location?.city && (
                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                    {cvData.basics.location.city}, {cvData.basics.location.countryCode}
                  </Badge>
                )}
                {metadata?.jobTitle && (
                  <Badge variant="outline" className="bg-gray-50 dark:bg-gray-900">
                    Applied for: {metadata.jobTitle}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Agency/HR Notes (Scorecard) */}
          {metadata?.humanScorecard && (
            <Card className="border-primary/20 shadow-sm" style={{ borderColor: `${brandColor}40`, backgroundColor: `${brandColor}05` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-5 h-5" style={{ color: brandColor }} /> Recruiter Notes & Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-5 h-5 ${star <= (metadata.humanScorecard.rating || 0) ? 'fill-current' : 'text-gray-300 dark:text-gray-700'}`} 
                        style={star <= (metadata.humanScorecard.rating || 0) ? { color: brandColor } : {}}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">({metadata.humanScorecard.rating}/5)</span>
                </div>
                <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
                  {metadata.humanScorecard.notes || 'No notes provided.'}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {cvData?.basics?.summary && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" /> Professional Summary
              </h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {cvData.basics.summary}
              </p>
            </div>
          )}

          {/* Experience */}
          {cvData?.work && cvData.work.length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" /> Work Experience
              </h3>
              <div className="space-y-6">
                {cvData.work.map((job: any, i: number) => (
                  <div key={i} className="relative pl-6 border-l-2" style={{ borderColor: `${brandColor}40` }}>
                    <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5" style={{ backgroundColor: brandColor }}></div>
                    <h4 className="font-bold text-gray-900 dark:text-white text-lg">{job.position}</h4>
                    <div className="font-medium text-gray-700 dark:text-gray-300">{job.name}</div>
                    <div className="text-sm text-gray-500 mb-3">{job.startDate} — {job.endDate || 'Present'}</div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{job.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {cvData?.education && cvData.education.length > 0 && (
            <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-gray-400" /> Education
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {cvData.education.map((edu: any, i: number) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
                    <h4 className="font-bold text-gray-900 dark:text-white">{edu.institution}</h4>
                    <p className="text-sm font-medium mt-1">{edu.studyType} in {edu.area}</p>
                    <p className="text-xs text-gray-500 mt-1">{edu.startDate} — {edu.endDate}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Sidebar / Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            
            {/* Client Feedback Widget */}
            <Card className="border-gray-200 dark:border-gray-800 shadow-lg">
              <div className="h-2 w-full rounded-t-xl" style={{ backgroundColor: brandColor }}></div>
              <CardHeader>
                <CardTitle>Client Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                {metadata?.clientFeedback ? (
                  <div className="text-center py-6 space-y-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${metadata.clientFeedback.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {metadata.clientFeedback.status === 'approved' ? <CheckCircle className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
                    </div>
                    <h3 className="text-lg font-bold capitalize">Candidate {metadata.clientFeedback.status}</h3>
                    {metadata.clientFeedback.notes && (
                      <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-md text-left">
                        "{metadata.clientFeedback.notes}"
                      </div>
                    )}
                    <p className="text-xs text-gray-400">Feedback recorded on {new Date(metadata.clientFeedback.date).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Please review the candidate profile and provide your feedback to the agency.
                    </p>
                    <Textarea 
                      placeholder="Add notes for the recruiter... (Optional)"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <Button 
                        variant="outline" 
                        className="w-full border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20"
                        onClick={() => handleSubmitFeedback('rejected')}
                        disabled={submitting}
                      >
                        Reject
                      </Button>
                      <Button 
                        className="w-full"
                        style={{ backgroundColor: brandColor, color: '#fff' }}
                        onClick={() => handleSubmitFeedback('approved')}
                        disabled={submitting}
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Approve'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills Snapshot */}
            {cvData?.skills && cvData.skills.length > 0 && (
              <Card className="border-gray-200 dark:border-gray-800 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-gray-500">Core Skills Snapshot</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {cvData.skills.flatMap((s: any) => s.keywords || []).slice(0, 15).map((skill: string, i: number) => (
                      <Badge key={i} variant="secondary" className="font-medium bg-gray-100 dark:bg-gray-800">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
