'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { UploadCloud, Play, Code } from 'lucide-react';
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
      
      // Using mock endpoint or real endpoint if available
      // Replace this with actual B2B endpoint when implemented
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
    <div className="space-y-8 max-w-5xl mx-auto pb-10">
      <div className={`relative overflow-hidden rounded-3xl p-8 md:p-12 ${glassCard}`}>
        <div className="relative z-10 md:w-2/3">
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300">
            API Sandbox
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mt-4 max-w-xl">
            Test your B2B parsing endpoints manually before integrating them into your application.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 md:opacity-80 pointer-events-none transform translate-x-1/4 translate-y-1/4 md:translate-x-12 md:-translate-y-8 w-64 md:w-96 text-primary">
          <SandboxIllustration />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className={glassCard}>
          <CardHeader>
            <CardTitle>Request Configuration</CardTitle>
            <CardDescription>Configure your API request parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Authorization</Label>
              <Input 
                type="password" 
                placeholder="Enter your API Key (Bearer token)" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                You can generate an API key in the API Keys & Webhooks tab.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex border-b">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'upload' 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setActiveTab('upload')}
                >
                  File Upload
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'text' 
                      ? 'border-b-2 border-primary text-primary' 
                      : 'text-muted-foreground'
                  }`}
                  onClick={() => setActiveTab('text')}
                >
                  Raw Text
                </button>
              </div>

              {activeTab === 'upload' ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center space-y-2 text-center hover:bg-muted/50 transition-colors">
                    <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    <div className="text-sm font-medium">
                      <label htmlFor="file-upload" className="cursor-pointer text-primary hover:underline">
                        Click to upload
                      </label>
                      {' '}or drag and drop
                    </div>
                    <p className="text-xs text-muted-foreground">PDF or DOCX (max. 5MB)</p>
                    <input 
                      id="file-upload" 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.docx"
                      onChange={handleFileChange}
                    />
                  </div>
                  {file && (
                    <div className="text-sm text-muted-foreground bg-muted p-2 rounded flex justify-between items-center">
                      <span className="truncate">{file.name}</span>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea 
                    placeholder="Paste resume text here..." 
                    className="min-h-[200px] font-mono text-sm"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button 
              onClick={handleTest} 
              disabled={loading} 
              className="w-full gap-2"
            >
              {loading ? (
                <span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {loading ? 'Processing...' : 'Run Test'}
            </Button>
          </CardContent>
        </Card>

        <Card className={`flex flex-col h-full ${glassCard}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Response
            </CardTitle>
            <CardDescription>JSON output from the parsing API.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 min-h-[400px]">
            <div className="bg-[#1e1e1e] text-green-400 p-4 rounded-lg h-full overflow-auto font-mono text-sm whitespace-pre-wrap">
              {result ? (
                JSON.stringify(result, null, 2)
              ) : (
                <span className="text-gray-500">
                  {loading ? 'Waiting for response...' : '// Run a test to see the response here'}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
