'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface WebhookConfigProps {
  initialUrl: string;
  initialSecret: string;
}

export default function WebhookConfig({ initialUrl, initialSecret }: WebhookConfigProps) {
  const [url, setUrl] = useState(initialUrl || '');
  const [secret, setSecret] = useState(initialSecret || '');
  const [savingUrl, setSavingUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handleSaveUrl = async () => {
    setSavingUrl(true);
    try {
      const res = await fetch('/api/b2b/tenant/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_url', webhookUrl: url })
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Webhook URL saved');
      } else {
        toast.error(data.error || 'Failed to save URL');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setSavingUrl(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure? This will invalidate your existing webhook secret and any signatures using it will fail.')) {
      return;
    }
    setRegenerating(true);
    try {
      const res = await fetch('/api/b2b/tenant/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerate_secret' })
      });
      const data = await res.json();
      if (data.success && data.secret) {
        setSecret(data.secret);
        toast.success('Webhook secret regenerated');
      } else {
        toast.error(data.error || 'Failed to regenerate secret');
      }
    } catch (err) {
      toast.error('An error occurred');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
      <CardHeader>
        <CardTitle>Webhook Configuration</CardTitle>
        <CardDescription>Configure where we should send asynchronous event updates.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Webhook URL</label>
          <div className="flex gap-2">
            <Input 
              type="url" 
              className="flex-1"
              placeholder="https://your-domain.com/webhooks/cvcircle"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button 
              onClick={handleSaveUrl} 
              disabled={savingUrl}
              variant="secondary"
            >
              {savingUrl ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Must be a valid HTTPS URL that can accept POST requests.
          </p>
        </div>
        
        <div className="pt-4 border-t">
          <label className="text-sm font-medium">Webhook Secret</label>
          <div className="mt-1 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <code className="px-3 py-2 bg-muted rounded text-sm w-full sm:flex-1 truncate block overflow-hidden">
              {secret || 'Not configured'}
            </code>
            <Button 
              variant="outline" 
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full sm:w-auto"
            >
              {regenerating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Regenerate
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Use this secret to verify that webhook requests are coming from CVCircle.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
