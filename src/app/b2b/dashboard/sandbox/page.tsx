'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UploadCloud, Play, Code, FileText, CheckCircle, Mail, Phone, MapPin, Briefcase, GraduationCap, Sparkles, Key as KeyIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SandboxIllustration } from '@/components/b2b/Illustrations';

const glassCard = "bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg";

export default function SandboxPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [viewMode, setViewMode] = useState<'hr' | 'json'>('hr');
  const [apiKey, setApiKey] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTest = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please provide a valid API Key to test the endpoint.',
        variant: 'destructive',
      });
      return;
    }

    if (activeTab === 'upload' && !file) {
      toast({
        title: 'File Required',
        description: 'Please select a PDF or DOCX file to upload.',
        variant: 'destructive',
      });
      return;
    }

    if (activeTab === 'text' && !text.trim()) {
      toast({
        title: 'Text Required',
        description: 'Please enter some resume text to parse.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      let response;
      
      // Using the actual B2B endpoint
      if (activeTab === 'upload') {
        const formData = new FormData();
        formData.append('file', file as Blob);
        
        response = await fetch('/api/v1/b2b/parse', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData,
        });
      } else {
        response = await fetch('/api/v1/b2b/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ text }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to parse resume');
      }

      const data = await response.json();
      setResult(data);
      toast({
        title: 'Success',
        description: 'Resume parsed successfully.',
      });
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80">
            Parsing Sandbox
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Drop a resume here to see how our AI extracts, structures, and scores candidate data before you integrate it into your own systems.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 md:opacity-80 pointer-events-none transform translate-x-1/4 translate-y-1/4 md:translate-x-12 md:-translate-y-8 w-64 md:w-96 text-primary">
          <SandboxIllustration />
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className={glassCard}>
            <CardHeader className="pb-4">
              <CardTitle>Input Source</CardTitle>
              <CardDescription>Select a resume file or paste raw text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Authentication</Label>
                <div className="relative">
                  <KeyIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    type="password" 
                    placeholder="Enter API Key (cvc_test_...)" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex border-b dark:border-gray-800">
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'upload' 
                        ? 'border-b-2 border-primary text-primary bg-primary/5' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveTab('upload')}
                  >
                    File Upload
                  </button>
                  <button
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'text' 
                        ? 'border-b-2 border-primary text-primary bg-primary/5' 
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveTab('text')}
                  >
                    Raw Text
                  </button>
                </div>

                {activeTab === 'upload' ? (
                  <div className="space-y-4">
                    <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center space-y-3 text-center transition-all ${file ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-700 hover:bg-muted/50 hover:border-primary/50'}`}>
                      <UploadCloud className={`h-10 w-10 ${file ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div className="text-sm font-medium">
                        <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                          Browse files
                        </label>
                        {' '}or drag and drop
                      </div>
                      <p className="text-xs text-muted-foreground">Supports PDF, DOCX (Max 5MB)</p>
                      <input 
                        id="file-upload" 
                        type="file" 
                        className="hidden" 
                        accept=".pdf,.docx"
                        onChange={handleFileChange}
                      />
                    </div>
                    {file && (
                      <div className="text-sm bg-primary/10 text-primary border border-primary/20 p-3 rounded-lg flex justify-between items-center">
                        <span className="truncate font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          {file.name}
                        </span>
                        <span className="opacity-80">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea 
                      placeholder="Paste candidate resume text here..." 
                      className="min-h-[250px] text-sm resize-y"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleTest} 
                disabled={loading} 
                className="w-full gap-2 h-11 text-base font-semibold shadow-md"
              >
                {loading ? (
                  <span className="animate-spin inline-block w-5 h-5 border-2 border-current border-t-transparent rounded-full" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                {loading ? 'Analyzing Candidate...' : 'Analyze Candidate'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className={`flex flex-col h-full ${glassCard}`}>
            <CardHeader className="pb-4 border-b dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Analysis Results
                  </CardTitle>
                  <CardDescription>Review the structured data extracted by the AI.</CardDescription>
                </div>
                <div className="flex gap-1 bg-muted p-1 rounded-md">
                  <button
                    onClick={() => setViewMode('hr')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all ${viewMode === 'hr' ? 'bg-white dark:bg-black shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    Visual View
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-all flex items-center gap-1 ${viewMode === 'json' ? 'bg-white dark:bg-black shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <Code className="w-3 h-3" /> API JSON
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-[500px]">
              {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 space-y-4">
                  <div className="w-16 h-16 relative">
                    <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
                  </div>
                  <p className="animate-pulse">Parsing document and extracting structure...</p>
                </div>
              ) : !result ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-12 text-center space-y-3 opacity-50">
                  <FileText className="w-16 h-16 mb-2" />
                  <p className="text-lg">No Data Yet</p>
                  <p className="text-sm max-w-sm">Upload a resume and click analyze to see how CVCircle structures the unstructured text.</p>
                </div>
              ) : viewMode === 'json' ? (
                <div className="bg-[#0d1117] text-[#569cd6] p-6 h-full overflow-auto font-mono text-sm whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </div>
              ) : (
                <div className="p-6 h-full overflow-auto space-y-8 bg-gray-50/50 dark:bg-black/20">
                  {/* Candidate Header */}
                  <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border shadow-sm flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                        {result.data?.basics?.name || 'Unknown Candidate'}
                      </h2>
                      <p className="text-lg text-primary font-medium mt-1">
                        {result.data?.basics?.label || 'No Job Title'}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border">
                      {result.data?.basics?.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{result.data.basics.email}</span>
                        </div>
                      )}
                      {result.data?.basics?.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">{result.data.basics.phone}</span>
                        </div>
                      )}
                      {result.data?.basics?.location?.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-700 dark:text-gray-300">
                            {result.data.basics.location.city}, {result.data.basics.location.countryCode}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary */}
                  {result.data?.basics?.summary && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" /> Professional Summary
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900 p-5 rounded-xl border shadow-sm">
                        {result.data.basics.summary}
                      </p>
                    </div>
                  )}

                  {/* Skills Grid */}
                  {result.data?.skills && result.data.skills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Extracted Skills
                      </h3>
                      <div className="bg-white dark:bg-gray-900 p-5 rounded-xl border shadow-sm">
                        <div className="flex flex-wrap gap-2">
                          {result.data.skills.flatMap((skillGroup: any) => skillGroup.keywords || []).map((skill: string, i: number) => (
                            <Badge key={i} variant="secondary" className="px-3 py-1 bg-primary/10 text-primary hover:bg-primary/20 font-medium">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Experience Timeline */}
                  {result.data?.work && result.data.work.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Work Experience
                      </h3>
                      <div className="space-y-4">
                        {result.data.work.map((job: any, i: number) => (
                          <div key={i} className="bg-white dark:bg-gray-900 p-5 rounded-xl border shadow-sm relative overflow-hidden group">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gray-200 dark:bg-gray-800 group-hover:bg-primary transition-colors"></div>
                            <div className="flex justify-between items-start mb-2 pl-3">
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{job.position}</h4>
                                <div className="text-primary font-medium">{job.name}</div>
                              </div>
                              <Badge variant="outline" className="bg-gray-50 dark:bg-gray-800 whitespace-nowrap">
                                {job.startDate} — {job.endDate || 'Present'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 mt-3 text-sm pl-3 leading-relaxed">
                              {job.summary}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Education */}
                  {result.data?.education && result.data.education.length > 0 && (
                    <div>
                      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" /> Education
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        {result.data.education.map((edu: any, i: number) => (
                          <div key={i} className="bg-white dark:bg-gray-900 p-4 rounded-xl border shadow-sm">
                            <h4 className="font-bold text-gray-900 dark:text-white">{edu.institution}</h4>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{edu.studyType} in {edu.area}</p>
                            <p className="text-xs text-muted-foreground mt-2">{edu.startDate} — {edu.endDate}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
