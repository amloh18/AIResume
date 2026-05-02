// @ts-nocheck
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Link as LinkIcon, Unlink, ServerCog } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Integration {
  _id?: string;
  provider: 'greenhouse' | 'lever';
  status: 'active' | 'inactive' | 'error';
  credentials?: {
    apiKey?: string;
    webhookSecret?: string;
  };
}

export default function ATSIntegrationsManager() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  
  // Forms state
  const [greenhouseKey, setGreenhouseKey] = useState('');
  const [greenhouseSecret, setGreenhouseSecret] = useState('');
  const [leverKey, setLeverKey] = useState('');

  const fetchIntegrations = async () => {
    try {
      const res = await fetch('/api/b2b/integrations');
      const data = await res.json();
      if (data.success) {
        setIntegrations(data.data);
        
        // Populate forms
        const gh = data.data.find((i: Integration) => i.provider === 'greenhouse');
        if (gh?.credentials) {
          setGreenhouseKey(gh.credentials.apiKey || '');
          setGreenhouseSecret(gh.credentials.webhookSecret || '');
        }
        
        const lv = data.data.find((i: Integration) => i.provider === 'lever');
        if (lv?.credentials) {
          setLeverKey(lv.credentials.apiKey || '');
        }
      }
    } catch (err) {
      toast.error('Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const getIntegration = (provider: string) => integrations.find(i => i.provider === provider);

  const handleSave = async (provider: 'greenhouse' | 'lever') => {
    setSaving(provider);
    
    const payload: any = { provider, status: 'active' };
    if (provider === 'greenhouse') {
      payload.apiKey = greenhouseKey;
      payload.webhookSecret = greenhouseSecret;
    } else {
      payload.apiKey = leverKey;
    }

    try {
      const res = await fetch('/api/b2b/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(`${provider} integration saved successfully`);
        fetchIntegrations();
      } else {
        toast.error(data.error || 'Failed to save integration');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setSaving(null);
    }
  };

  const handleDisconnect = async (provider: 'greenhouse' | 'lever') => {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;
    
    setSaving(provider);
    try {
      const res = await fetch('/api/b2b/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, status: 'inactive', apiKey: '', webhookSecret: '' })
      });
      
      if (res.ok) {
        toast.success(`Disconnected ${provider}`);
        if (provider === 'greenhouse') {
          setGreenhouseKey('');
          setGreenhouseSecret('');
        } else {
          setLeverKey('');
        }
        fetchIntegrations();
      }
    } catch (err) {
      toast.error('Failed to disconnect');
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const gh = getIntegration('greenhouse');
  const lv = getIntegration('lever');

  return (
    <div className="space-y-6">
      {/* Greenhouse */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <ServerCog className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Greenhouse</CardTitle>
                <CardDescription>Automatically parse and score candidates as they enter your ATS.</CardDescription>
              </div>
            </div>
            <Badge variant={gh?.status === 'active' ? 'default' : 'outline'} className={gh?.status === 'active' ? 'bg-green-500' : ''}>
              {gh?.status === 'active' ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Harvest API Key</label>
              <Input 
                type="password" 
                value={greenhouseKey} 
                onChange={(e) => setGreenhouseKey(e.target.value)} 
                placeholder="Enter your Greenhouse Harvest API Key"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Webhook Secret Key</label>
              <Input 
                type="password" 
                value={greenhouseSecret} 
                onChange={(e) => setGreenhouseSecret(e.target.value)} 
                placeholder="Enter Webhook Secret for signature validation"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => handleSave('greenhouse')} 
                disabled={saving === 'greenhouse' || !greenhouseKey}
                className="w-32"
              >
                {saving === 'greenhouse' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                Connect
              </Button>
              {gh?.status === 'active' && (
                <Button 
                  variant="destructive" 
                  variant="outline" 
                  onClick={() => handleDisconnect('greenhouse')}
                  disabled={saving === 'greenhouse'}
                >
                  <Unlink className="w-4 h-4 mr-2" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
          
          {gh?.status === 'active' && (
            <div className="mt-6 p-4 bg-muted rounded-lg border">
              <p className="text-sm font-medium mb-2">Webhook URL Configuration</p>
              <p className="text-xs text-muted-foreground mb-3">Copy this URL and paste it into your Greenhouse Webhook settings (Trigger: Candidate has been added to a job).</p>
              <code className="px-3 py-2 bg-background border rounded block text-sm break-all select-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/b2b/ats/webhooks/greenhouse
              </code>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lever */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <ServerCog className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Lever</CardTitle>
                <CardDescription>Sync candidates from Lever directly into CVCircle.</CardDescription>
              </div>
            </div>
            <Badge variant={lv?.status === 'active' ? 'default' : 'outline'} className={lv?.status === 'active' ? 'bg-blue-500' : ''}>
              {lv?.status === 'active' ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label className="text-sm font-medium">Lever Data API Key</label>
              <Input 
                type="password" 
                value={leverKey} 
                onChange={(e) => setLeverKey(e.target.value)} 
                placeholder="Enter your Lever API Key"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => handleSave('lever')} 
                disabled={saving === 'lever' || !leverKey}
                className="w-32"
              >
                {saving === 'lever' ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
                Connect
              </Button>
              {lv?.status === 'active' && (
                <Button 
                  variant="outline" 
                  onClick={() => handleDisconnect('lever')}
                  disabled={saving === 'lever'}
                >
                  <Unlink className="w-4 h-4 mr-2 text-destructive" />
                  Disconnect
                </Button>
              )}
            </div>
          </div>
          
          {lv?.status === 'active' && (
            <div className="mt-6 p-4 bg-muted rounded-lg border">
              <p className="text-sm font-medium mb-2">Webhook URL Configuration</p>
              <p className="text-xs text-muted-foreground mb-3">Add this URL to your Lever Webhook settings for candidate stage changes.</p>
              <code className="px-3 py-2 bg-background border rounded block text-sm break-all select-all">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/b2b/ats/webhooks/lever
              </code>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
