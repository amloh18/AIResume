'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Globe, Palette, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default function CareersPageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    slug: '',
    brandColor: '#4C9900',
    logoUrl: '',
    companyDescription: '',
    isPublished: false
  });

  const fetchBranding = async () => {
    try {
      const res = await fetch('/api/b2b/tenant/branding');
      const data = await res.json();
      if (data.success && data.data) {
        setFormData({
          slug: data.data.slug || '',
          brandColor: data.data.brandColor || '#4C9900',
          logoUrl: data.data.logoUrl || '',
          companyDescription: data.data.companyDescription || '',
          isPublished: !!data.data.isPublished
        });
      }
    } catch (error) {
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/b2b/tenant/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Careers page settings updated');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const careersUrl = `${baseUrl}/careers/${formData.slug}`;

  return (
    <div className="space-y-8 pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            Public Careers Page
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Create a branded landing page for your active jobs. Candidates can apply directly, and their CVs will be automatically parsed into your Smart Roster.
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Settings Form */}
        <div className="lg:col-span-7 space-y-6">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" /> Page Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom URL Slug</label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{baseUrl}/careers/</span>
                  <Input 
                    placeholder="your-company" 
                    value={formData.slug}
                    onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                  />
                </div>
                <p className="text-xs text-muted-foreground">Only lowercase letters, numbers, and hyphens.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Logo URL</label>
                <Input 
                  placeholder="https://example.com/logo.png" 
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Brand Accent Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={formData.brandColor}
                    onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                    className="w-10 h-10 rounded border cursor-pointer"
                  />
                  <Input 
                    value={formData.brandColor}
                    onChange={(e) => setFormData({...formData, brandColor: e.target.value})}
                    className="w-32"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Company Description / Hero Text</label>
                <Textarea 
                  placeholder="We are on a mission to..." 
                  value={formData.companyDescription}
                  onChange={(e) => setFormData({...formData, companyDescription: e.target.value})}
                  rows={4}
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-xl bg-muted/30">
                <div>
                  <h4 className="font-medium">Publish Page</h4>
                  <p className="text-sm text-muted-foreground">Make your careers page visible to the public.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, isPublished: !formData.isPublished})}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${formData.isPublished ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isPublished ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Branding Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview / Status */}
        <div className="lg:col-span-5 space-y-6">
          <Card className={glassCard}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" /> Live Preview
              </CardTitle>
              <CardDescription>How candidates will see your page.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-black/20">
                {/* Mock Browser Header */}
                <div className="bg-gray-100 dark:bg-gray-900 border-b px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="mx-auto bg-white dark:bg-black rounded-md px-3 py-1 text-xs text-muted-foreground w-2/3 truncate text-center flex items-center justify-center gap-1">
                    <LinkIcon className="w-3 h-3" /> {formData.slug ? `cvcircle.com/careers/${formData.slug}` : 'cvcircle.com/careers/...'}
                  </div>
                </div>
                
                {/* Mock Page Content */}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded flex items-center justify-center font-bold" style={{ color: formData.brandColor }}>
                        {formData.slug ? formData.slug.charAt(0).toUpperCase() : 'C'}
                      </div>
                    )}
                    <h2 className="font-bold text-lg">Join Our Team</h2>
                  </div>
                  
                  <div className="h-2 w-16 rounded mb-2" style={{ backgroundColor: formData.brandColor }}></div>
                  <p className="text-xs text-muted-foreground mb-6 line-clamp-3">
                    {formData.companyDescription || 'We are looking for talented individuals to join our growing team. Check out our open positions below.'}
                  </p>

                  <div className="space-y-3">
                    <div className="border rounded p-3">
                      <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-800 rounded mb-2"></div>
                      <div className="flex justify-between items-center">
                        <div className="h-3 w-1/3 bg-gray-100 dark:bg-gray-900 rounded"></div>
                        <div className="px-3 py-1 rounded text-[10px] text-white" style={{ backgroundColor: formData.brandColor }}>Apply</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {formData.isPublished && formData.slug && (
                <div className="mt-6 text-center">
                  <a href={careersUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center justify-center gap-2 font-medium">
                    Visit Live Page <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
