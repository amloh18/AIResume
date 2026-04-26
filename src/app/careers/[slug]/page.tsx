'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Briefcase, MapPin, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function PublicCareersPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await fetch(`/api/public/careers/${slug}`);
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          router.push('/404');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return null;

  const branding = data.branding;
  const jobs = data.jobs;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-10 w-auto object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xl" style={{ backgroundColor: branding.brandColor || '#4C9900' }}>
                {slug.charAt(0).toUpperCase()}
              </div>
            )}
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white hidden sm:block">
              Careers at {slug.charAt(0).toUpperCase() + slug.slice(1)}
            </h1>
          </div>
          <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2">
            Company Website <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <div className="relative py-20 px-6 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundColor: branding.brandColor || '#4C9900' }}></div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
            Join Our Team
          </h2>
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto">
            {branding.companyDescription || 'We are looking for talented individuals to join our growing team. Check out our open positions below and apply today.'}
          </p>
        </div>
      </div>

      {/* Job Listings */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Open Positions</h3>
          <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
            {jobs.length} Jobs
          </span>
        </div>

        {jobs.length === 0 ? (
          <Card className="border-dashed border-2 bg-transparent shadow-none">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Briefcase className="w-12 h-12 text-gray-400 mb-4" />
              <h4 className="text-lg font-medium text-gray-900 dark:text-white">No open positions</h4>
              <p className="text-gray-500 mt-2 max-w-md">We don't have any open roles right now. Check back later!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job: any) => (
              <Link key={job._id} href={`/careers/${slug}/${job._id}`}>
                <div className="group bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl p-6 hover:shadow-md transition-all cursor-pointer relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="absolute left-0 top-0 bottom-0 w-1 transition-colors bg-transparent group-hover:bg-opacity-100" style={{ backgroundColor: branding.brandColor || '#4C9900' }}></div>
                  
                  <div className="pl-3">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors mb-2">
                      {job.jobTitle}
                    </h4>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 font-medium">
                      <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.company}</span>
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location || 'Remote'}</span>
                    </div>
                  </div>
                  
                  <div className="pl-3 sm:pl-0 flex items-center">
                    <div className="px-5 py-2.5 rounded-lg text-sm font-bold text-white transition-transform group-hover:scale-105 flex items-center gap-2 shadow-sm" style={{ backgroundColor: branding.brandColor || '#4C9900' }}>
                      View Role <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 py-10 mt-10">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-gray-500 text-sm">
            Powered by <span className="font-bold text-gray-900 dark:text-white">CVCircle HR</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
