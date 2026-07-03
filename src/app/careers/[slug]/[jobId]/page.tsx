'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, MapPin, ChevronLeft, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

export default function PublicJobPage() {
  const params = useParams();
  const slug = params.slug as string;
  const jobId = params.jobId as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      try {
        const res = await fetch(`/api/public/careers/${slug}/${jobId}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          router.push(`/careers/${slug}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchJob();
  }, [slug, jobId, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const { branding, job, tenantId } = data;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      if (!['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(selected.type)) {
        toast.error('Only PDF and DOCX files are supported');
        return;
      }
      setFile(selected);
    }
  };

  const handleApply = async () => {
    if (!file) {
      toast.error('Please upload your resume to apply');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', tenantId);

      const res = await fetch(`/api/public/careers/${slug}/${jobId}/apply`, {
        method: 'POST',
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        setSuccess(true);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(result.error || 'Failed to submit application');
      }
    } catch (err) {
      toast.error('An error occurred while submitting your application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={`/careers/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" /> Back to Careers
          </Link>
          {branding.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-8 w-auto object-contain" />
          ) : (
            <div className="font-bold text-h3" style={{ color: branding.brandColor || '#4C9900' }}>
              {slug.charAt(0).toUpperCase() + slug.slice(1)}
            </div>
          )}
        </div>
      </header>

      {/* Job Hero */}
      <div className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 pt-12 pb-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundColor: branding.brandColor || '#4C9900' }}></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-display md:text-display font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            {job.jobTitle}
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-6 text-body font-medium text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full"><Briefcase className="w-5 h-5" /> {job.company}</span>
            <span className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full"><MapPin className="w-5 h-5" /> {job.location || 'Remote'}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-10">
        {/* Job Description */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-950 rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-h2 font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" style={{ color: branding.brandColor || '#4C9900' }} />
              About the Role
            </h3>
            <div className="prose prose-gray dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
              {job.jobDescription || 'No detailed description provided.'}
            </div>
          </div>
        </div>

        {/* Application Form */}
        <div className="md:col-span-1">
          <div className="sticky top-24">
            <Card className="bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 shadow-xl overflow-hidden rounded-2xl">
              <div className="h-2 w-full" style={{ backgroundColor: branding.brandColor || '#4C9900' }}></div>
              <CardContent className="p-6">
                {success ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-h3 font-bold text-gray-900 dark:text-white">Application Received!</h3>
                    <p className="text-gray-500 text-small">Thank you for applying. Our team will review your profile shortly.</p>
                    <Button className="w-full mt-6" variant="outline" onClick={() => router.push(`/careers/${slug}`)}>
                      Browse More Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-h3 font-bold text-gray-900 dark:text-white mb-2">Apply Now</h3>
                      <p className="text-small text-gray-500">Upload your CV and let our AI do the rest.</p>
                    </div>

                    <div className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all ${file ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer'}`} style={file ? { borderColor: branding.brandColor || '#4C9900', backgroundColor: `${branding.brandColor}10` || '#f0fdf4' } : {}}>
                      <UploadCloud className={`h-8 w-8 mb-3 ${file ? 'text-primary' : 'text-gray-400'}`} style={file ? { color: branding.brandColor || '#4C9900' } : {}} />
                      
                      {file ? (
                        <div className="space-y-1 w-full">
                          <p className="text-small font-bold text-gray-900 dark:text-white truncate px-2">{file.name}</p>
                          <p className="text-small text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-small text-red-500 hover:underline mt-2">Remove File</button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label htmlFor="resume-upload" className="cursor-pointer text-small font-bold hover:underline block" style={{ color: branding.brandColor || '#4C9900' }}>
                            Choose a file
                          </label>
                          <p className="text-small text-gray-500">PDF or DOCX (Max 5MB)</p>
                          <input 
                            id="resume-upload" 
                            type="file" 
                            className="hidden" 
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                          />
                        </div>
                      )}
                    </div>

                    <Button 
                      className="w-full h-12 text-body font-bold shadow-md hover:shadow-lg transition-all" 
                      style={{ backgroundColor: branding.brandColor || '#4C9900', color: '#fff' }}
                      onClick={handleApply}
                      disabled={submitting || !file}
                    >
                      {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </Button>
                    <p className="text-small text-center text-gray-400">By applying, you agree to our privacy policy.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
