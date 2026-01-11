
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

        const formData = new FormData();
        formData.append('file', file);
        formData.append('country', country);

        try {
            const response = await fetch('/api/admin/sponsorships/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (data.success) {
                setStats(data.stats);
                toast({
                    title: "Import Successful",
                    description: data.message,
                    variant: "success"
                });
                // Clear file input
                setFile(null);
                // We can't easily clear the file input value in React without a ref, but simple is fine.
            } else {
                toast({
                    title: "Import Failed",
                    description: data.error || "An unknown error occurred.",
                    variant: "destructive"
                });
            }
        } catch (error: any) {
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
