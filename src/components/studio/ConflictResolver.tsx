'use client';

import React, { useState } from 'react';
import { AlertTriangle, Check, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface ConflictResolverProps {
  open: boolean;
  onClose: () => void;
  serverVersion: {
    id: string;
    title: string;
    cvData: any;
    templateId?: string;
    version: number;
    updatedAt: string;
    metadata?: any;
  };
  clientVersion: {
    id: string;
    title: string;
    cvData: any;
    templateId?: string;
    version: number;
    updatedAt: string;
    metadata?: any;
  };
  onResolve: (resolution: 'server' | 'client' | 'merge') => void;
  onMerge?: (mergedData: any) => void;
}

export function ConflictResolver({
  open,
  onClose,
  serverVersion,
  clientVersion,
  onResolve,
  onMerge
}: ConflictResolverProps) {
  const [selectedResolution, setSelectedResolution] = useState<'server' | 'client' | 'merge' | null>(null);
  const [mergeData, setMergeData] = useState<any>(null);

  const serverDate = new Date(serverVersion.updatedAt);
  const clientDate = new Date(clientVersion.updatedAt);

  const handleResolve = () => {
    if (selectedResolution === 'merge' && onMerge && mergeData) {
      onMerge(mergeData);
    } else if (selectedResolution) {
      onResolve(selectedResolution);
    }
  };

  const handleMerge = () => {
    // Simple merge: prefer client changes for most fields, but keep server's metadata
    const merged = {
      ...clientVersion.cvData,
      // Merge arrays intelligently
      work: mergeArrays(clientVersion.cvData?.work || [], serverVersion.cvData?.work || []),
      education: mergeArrays(clientVersion.cvData?.education || [], serverVersion.cvData?.education || []),
      projects: mergeArrays(clientVersion.cvData?.projects || [], serverVersion.cvData?.projects || []),
      skills: mergeSkills(clientVersion.cvData?.skills || [], serverVersion.cvData?.skills || []),
      // Keep server metadata
      metadata: serverVersion.metadata
    };
    setMergeData(merged);
    setSelectedResolution('merge');
  };

  const mergeArrays = (client: any[], server: any[]) => {
    // Simple merge: combine unique items based on name/position
    const merged = [...client];
    const clientKeys = new Set(client.map(item => `${item.name || item.position || item.institution || ''}`));
    
    server.forEach(item => {
      const key = `${item.name || item.position || item.institution || ''}`;
      if (!clientKeys.has(key)) {
        merged.push(item);
      }
    });
    
    return merged;
  };

  const mergeSkills = (client: any[], server: any[]) => {
    // Merge skills by category
    const categoryMap = new Map<string, any>();
    
    [...client, ...server].forEach(skill => {
      const category = skill.category || 'Other';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { ...skill, skills: [] });
      }
      const existing = categoryMap.get(category);
      const skillSet = new Set([...(existing.skills || []), ...(skill.skills || [])]);
      existing.skills = Array.from(skillSet);
    });
    
    return Array.from(categoryMap.values());
  };

  const getDifferences = () => {
    const differences: string[] = [];
    
    // Compare basic fields
    if (serverVersion.title !== clientVersion.title) {
      differences.push(`Title: "${clientVersion.title}" vs "${serverVersion.title}"`);
    }
    
    // Compare array lengths
    const clientWork = clientVersion.cvData?.work?.length || 0;
    const serverWork = serverVersion.cvData?.work?.length || 0;
    if (clientWork !== serverWork) {
      differences.push(`Work experience: ${clientWork} items vs ${serverWork} items`);
    }
    
    const clientEducation = clientVersion.cvData?.education?.length || 0;
    const serverEducation = serverVersion.cvData?.education?.length || 0;
    if (clientEducation !== serverEducation) {
      differences.push(`Education: ${clientEducation} items vs ${serverEducation} items`);
    }
    
    return differences;
  };

  const differences = getDifferences();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Edit Conflict Detected
          </DialogTitle>
          <DialogDescription>
            This CV was modified in another tab or session. Choose how to resolve the conflict.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Conflict Summary */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Conflict Summary
                </h4>
                <div className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
                  <p>
                    <strong>Server version:</strong> Last modified {serverDate.toLocaleString()}
                  </p>
                  <p>
                    <strong>Your version:</strong> Last modified {clientDate.toLocaleString()}
                  </p>
                  {differences.length > 0 && (
                    <div className="mt-2">
                      <p className="font-medium">Differences:</p>
                      <ul className="list-disc list-inside mt-1">
                        {differences.map((diff, idx) => (
                          <li key={idx}>{diff}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resolution Options */}
          <Tabs defaultValue="compare" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="compare">Compare</TabsTrigger>
              <TabsTrigger value="server">Use Server Version</TabsTrigger>
              <TabsTrigger value="client">Use Your Version</TabsTrigger>
            </TabsList>

            <TabsContent value="compare" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Server Version</h4>
                    <Badge variant="outline">
                      {serverDate.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Title:</strong> {serverVersion.title}</p>
                    <p><strong>Version:</strong> {serverVersion.version}</p>
                    <p><strong>Work Experience:</strong> {serverVersion.cvData?.work?.length || 0} items</p>
                    <p><strong>Education:</strong> {serverVersion.cvData?.education?.length || 0} items</p>
                    <p><strong>Projects:</strong> {serverVersion.cvData?.projects?.length || 0} items</p>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">Your Version</h4>
                    <Badge variant="outline">
                      {clientDate.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Title:</strong> {clientVersion.title}</p>
                    <p><strong>Version:</strong> {clientVersion.version}</p>
                    <p><strong>Work Experience:</strong> {clientVersion.cvData?.work?.length || 0} items</p>
                    <p><strong>Education:</strong> {clientVersion.cvData?.education?.length || 0} items</p>
                    <p><strong>Projects:</strong> {clientVersion.cvData?.projects?.length || 0} items</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleMerge}
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Merge Both Versions
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="server" className="mt-4">
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <p className="text-sm mb-4">
                  This will discard your changes and use the version from the server (last modified {serverDate.toLocaleString()}).
                </p>
                <Button
                  onClick={() => setSelectedResolution('server')}
                  variant={selectedResolution === 'server' ? 'default' : 'outline'}
                  className="w-full"
                >
                  {selectedResolution === 'server' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    'Select Server Version'
                  )}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="client" className="mt-4">
              <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-900/20">
                <p className="text-sm mb-4">
                  This will overwrite the server version with your changes (last modified {clientDate.toLocaleString()}).
                </p>
                <Button
                  onClick={() => setSelectedResolution('client')}
                  variant={selectedResolution === 'client' ? 'default' : 'outline'}
                  className="w-full"
                >
                  {selectedResolution === 'client' ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Selected
                    </>
                  ) : (
                    'Select Your Version'
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleResolve}
            disabled={!selectedResolution}
          >
            <Check className="h-4 w-4 mr-2" />
            Resolve Conflict
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

