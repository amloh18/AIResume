'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeyRound, Shield, Clock, Check, Copy, Trash2, Loader2, Activity } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ApiKey {
  _id: string;
  name: string;
  prefix: string;
  isActive: boolean;
  createdAt: string;
  permissions: string[];
}

interface ApiKeysManagerProps {
  initialApiKeys: ApiKey[];
  apiUsageCount: number;
}

export default function ApiKeysManager({ initialApiKeys, apiUsageCount }: ApiKeysManagerProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>(initialApiKeys);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [keyName, setKeyName] = useState('');

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/b2b/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName })
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys([data.data, ...apiKeys]);
        setNewKeyData({ name: data.data.name, key: data.data.key });
        setKeyName('');
        toast.success('API Key generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate key');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeKey = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/b2b/api-keys/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setApiKeys(apiKeys.map(key => key._id === id ? { ...key, isActive: false } : key));
        toast.success('API Key revoked');
      } else {
        toast.error(data.error || 'Failed to revoke key');
      }
    } catch (error) {
      toast.error('An error occurred while revoking the key');
    }
  };

  const handleCopy = () => {
    if (newKeyData) {
      navigator.clipboard.writeText(newKeyData.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('API Key copied to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      {/* Usage Stats Card */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                API Usage
              </CardTitle>
              <CardDescription>Your current API consumption</CardDescription>
            </div>
            <div className="text-3xl font-bold text-primary">
              {apiUsageCount.toLocaleString()}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-white/40 dark:border-white/10 shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div>
              <CardTitle>Active API Keys</CardTitle>
              <CardDescription>Use these keys to authenticate your API requests.</CardDescription>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Key Name (e.g. Production)"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm max-w-[200px]"
              />
              <button 
                onClick={handleGenerateKey}
                disabled={isGenerating || !keyName.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Generate Key
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {newKeyData && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-300 mb-2">
                Save your new API key!
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                This is the only time you will be able to view this key. Please copy it and store it somewhere safe.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-black rounded border text-sm break-all">
                  {newKeyData.key}
                </code>
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-white dark:bg-black border rounded hover:bg-gray-50 dark:hover:bg-gray-900"
                >
                  {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No API keys found. Generate one to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {apiKeys.map((key) => (
                <div key={key._id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg ${!key.isActive ? 'opacity-60 bg-muted/50' : ''}`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{key.name}</span>
                      <Badge variant={key.isActive ? 'default' : 'secondary'}>
                        {key.isActive ? 'Active' : 'Revoked'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created: {new Date(key.createdAt).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        Permissions: {key.permissions?.join(', ')}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-xs">
                      {key.prefix}************************
                    </code>
                    {key.isActive && (
                      <button 
                        onClick={() => handleRevokeKey(key._id)}
                        className="text-xs text-destructive hover:underline ml-2 flex items-center"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
