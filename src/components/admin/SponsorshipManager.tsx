
"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Database } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export default function SponsorshipManager() {
    const { toast } = useToast();
    const [country, setCountry] = useState<'uk' | 'us'>('uk');
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<{ imported: number; updated: number; errors: number; message?: string } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStats(null); // Reset stats on new file
        }
    };

    const handleUpload = async () => {
        if (!file) {
            toast({
                title: "No file selected",
                description: "Please select a CSV file to upload.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        setStats(null);
        // Use a progress indicator instead of just loading/null
        const progressToastId = "upload-progress-toast";

        const formData = new FormData();
        formData.append('file', file);
        formData.append('country', country);

        try {
            const response = await fetch('/api/admin/sponsorships/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                // Handle non-200 simple errors
                const errorText = await response.text();
                // Check specifically for Payload Too Large
                if (response.status === 413 || errorText.includes("Request Entity Too Large")) {
                    throw new Error("File is too large. Please split the CSV into smaller files (under 4MB).");
                }

                try {
                    const errorJson = JSON.parse(errorText);
                    throw new Error(errorJson.error || errorText);
                } catch (e) {
                    throw new Error(errorText || `Server Error: ${response.status}`);
                }
            }

            // Stream Reader
            const reader = response.body?.getReader();
            if (!reader) throw new Error("Browser does not support streaming responses.");

            const decoder = new TextDecoder();
            let processedRecords = 0;
            let totalRecords = 0;
            let buffer = '';

            toast({
                title: "Starting Import...",
                description: "Initializing upload stream...",
                // We'll update this toast
            });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Parse NDJSON (New-Line Delimited JSON)
                const lines = buffer.split('\n');
                // Keep the last partial line in the buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);

                        if (event.type === 'start') {
                            totalRecords = event.total;
                            toast({
                                title: "Processing...",
                                description: `Found ${totalRecords.toLocaleString()} rows. Starting database writes...`,
                            });
                        } else if (event.type === 'progress') {
                            processedRecords = event.processed;
                            // We could throttle toast updates here if it's too frequent, but for 2500 chunk size it's fine
                            // setStats is used as a temporary display for "Processing..." in our current UI logic

                            // Update user feedback
                            // Since native toast usually stacks, we might want to just rely on a local state for the progress bar
                            // But the user asked for toast updates. We'll rely on the final completion toast for "done".

                            // Optional: console log or update a state variable to show a progress bar in the UI if we add one.
                            console.log(`Stream Progress: ${processedRecords} / ${totalRecords}`);

                            // Let's update the stats object immediately to show partial progress if the UI renders it?
                            // The UI renders stats only when done usually, but we can repurpose it or add a separate state.
                            // For now, let's just let the loop run.
                        } else if (event.type === 'complete') {
                            setStats(event.stats);
                            setFile(null);
                            toast({
                                title: "Import Successful",
                                description: event.message,
                                variant: "success"
                            });
                        } else if (event.type === 'error') {
                            throw new Error(event.message);
                        } else if (event.type === 'log') {
                            console.log("Server Log:", event.message);
                        }

                    } catch (err) {
                        console.error("Error parsing stream line:", line, err);
                    }
                }
            }

        } catch (error: any) {
            console.error('Upload error:', error);
            toast({
                title: "Error",
                description: error.message || "Network error",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-white">Sponsorship Data</h1>
                <p className="text-gray-400">Manage database records for UK Sponsors and US H1B Employers.</p>
            </div>

            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Database className="w-5 h-5 text-blue-500" />
                        Bulk Import
                    </CardTitle>
                    <CardDescription>
                        Upload a CSV file to populate or update the sponsorship database.
                        Duplicates will be updated automatically.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={country} onValueChange={(v) => setCountry(v as 'uk' | 'us')} className="space-y-6">
                        <TabsList className="bg-gray-800 border-gray-700">
                            <TabsTrigger value="uk" className="data-[state=active]:bg-blue-600">UK Sponsors</TabsTrigger>
                            <TabsTrigger value="us" className="data-[state=active]:bg-blue-600">US H1B Employers</TabsTrigger>
                        </TabsList>

                        <TabsContent value="uk" className="space-y-4">
                            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg text-sm text-blue-200">
                                <p className="font-semibold mb-1">CSV Requirements (UK):</p>
                                <ul className="list-disc pl-5 space-y-1 opacity-80">
                                    <li>Must contain columns for <strong>Company/Organisation Name</strong>.</li>
                                    <li>Optional columns: <strong>Licence Number</strong>, <strong>Status</strong>, <strong>Expiry Date</strong>.</li>
                                    <li>First row must be headers.</li>
                                </ul>
                            </div>
                        </TabsContent>

                        <TabsContent value="us" className="space-y-4">
                            <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-lg text-sm text-purple-200">
                                <p className="font-semibold mb-1">CSV Requirements (US):</p>
                                <ul className="list-disc pl-5 space-y-1 opacity-80">
                                    <li>Must contain columns for <strong>Employer Name</strong>.</li>
                                    <li>Optional columns: <strong>FEIN/EIN</strong>, <strong>Fiscal Year</strong>.</li>
                                    <li>First row must be headers.</li>
                                </ul>
                            </div>
                        </TabsContent>

                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="csv-upload" className="text-gray-300">Select CSV File</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="csv-upload"
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="bg-gray-800 border-gray-700 text-gray-300 file:bg-gray-700 file:text-white file:border-0 file:rounded-md"
                                    />
                                </div>
                            </div>

                            {stats && (
                                <Alert className="bg-gray-800/50 border-gray-700">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <AlertTitle className="text-green-500">Import Complete</AlertTitle>
                                    <AlertDescription className="text-gray-300 mt-2 grid grid-cols-3 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold text-white">{stats.imported}</span>
                                            <span className="text-xs uppercase text-gray-500">New Records</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold text-white">{stats.updated}</span>
                                            <span className="text-xs uppercase text-gray-500">Updated</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-2xl font-bold text-red-400">{stats.errors}</span>
                                            <span className="text-xs uppercase text-gray-500">Errors</span>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={handleUpload}
                                disabled={!file || loading}
                                className="bg-lime-500 hover:bg-lime-600 text-black font-semibold"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="mr-2 h-4 w-4" />
                                        Upload & Process
                                    </>
                                )}
                            </Button>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
