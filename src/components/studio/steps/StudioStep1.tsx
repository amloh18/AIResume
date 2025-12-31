'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Edit3, CheckCircle2, Loader2, Briefcase, Sparkles, AlertTriangle } from 'lucide-react';
import { useStudio } from '@/components/studio/StudioContext';
import { UnifiedCVDataStructure } from '@/types/unified-cv-schema';
import { sanitizeErrorMessage } from '@/lib/api/error-handler';

interface StudioStep1Props {
    onComplete: (cvData: UnifiedCVDataStructure) => void;
    mode?: 'create' | 'edit';
}

export default function StudioStep1({ onComplete, mode = 'create' }: StudioStep1Props) {
    const { state, dispatch } = useStudio();
    const [parseMethod, setParseMethod] = useState<'upload' | 'manual' | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [currentParsingStepIndex, setCurrentParsingStepIndex] = useState<number>(-1);
    const [parsingSteps] = useState([
        { label: 'Extracting text...', progress: 20 },
        { label: 'Structuring sections...', progress: 40 },
        { label: 'Identifying personal info...', progress: 60 },
        { label: 'Parsing work experience...', progress: 75 },
        { label: 'Extracting education...', progress: 85 },
        { label: 'Finalizing structure...', progress: 95 }
    ]);

    const completeParsing = (cvData: UnifiedCVDataStructure) => {
        dispatch({ type: 'SET_CV_DATA', payload: cvData });
        onComplete(cvData);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadStatus('uploading');
        setUploadProgress(0);
        setErrorMessage('');
        setCurrentParsingStepIndex(-1);

        let uploadInterval: NodeJS.Timeout | null = null;
        let parsingInterval: NodeJS.Timeout | null = null;

        try {
            uploadInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev >= 20) {
                        if (uploadInterval) clearInterval(uploadInterval);
                        return 20;
                    }
                    return prev + 5;
                });
            }, 50);

            setTimeout(() => {
                if (uploadInterval) clearInterval(uploadInterval);
                setUploadStatus('parsing');

                let currentStepIndex = 0;
                setCurrentParsingStepIndex(0);
                parsingInterval = setInterval(() => {
                    if (currentStepIndex < parsingSteps.length) {
                        const step = parsingSteps[currentStepIndex];
                        setUploadProgress(step.progress);
                        setCurrentParsingStepIndex(currentStepIndex);
                        currentStepIndex++;
                    } else {
                        if (parsingInterval) clearInterval(parsingInterval);
                        setCurrentParsingStepIndex(parsingSteps.length);
                    }
                }, 400);
            }, 500);

            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/cv/parse', {
                method: 'POST',
                body: formData
            });

            if (uploadInterval) clearInterval(uploadInterval);
            if (parsingInterval) clearInterval(parsingInterval);

            if (!response.ok) {
                const errorData = await response.json();
                const rawError = errorData.error || 'Failed to parse CV';
                throw new Error(sanitizeErrorMessage(rawError, 'Failed to parse CV'));
            }

            const result = await response.json();

            setUploadProgress(100);
            setUploadStatus('success');

            setTimeout(() => {
                completeParsing(result);
            }, 1000);

        } catch (error) {
            if (uploadInterval) clearInterval(uploadInterval);
            if (parsingInterval) clearInterval(parsingInterval);

            console.error('CV parsing error:', error);
            setUploadStatus('error');
            setErrorMessage(sanitizeErrorMessage(error, 'Failed to parse CV'));
        } finally {
            setIsUploading(false);
        }
    };

    const handleManualEntry = () => {
        const emptyCV: UnifiedCVDataStructure = {
            basics: {
                name: '',
                email: '',
                phone: '',
                location: { city: '', country: '' },
                summary: '',
            },
            work: [],
            education: [],
            skills: [],
            projects: [],
        };
        dispatch({ type: 'SET_CV_DATA', payload: emptyCV });
        onComplete(emptyCV);
    };

    if (parseMethod === null) {
        return (
            <div className="flex items-center justify-center h-full min-h-[calc(100vh-200px)]">
                <div className="w-full max-w-4xl px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                            Import Your CV
                        </h2>
                        <p className="text-lg text-gray-600 dark:text-gray-300">
                            Choose how you'd like to get started
                        </p>
                    </motion.div>

                    <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
                        {/* Upload Option */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            onClick={() => setParseMethod('upload')}
                            className="group relative bg-white dark:bg-[#141810] rounded-2xl p-12 shadow-lg shadow-black/10 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:scale-105 border border-gray-200 dark:border-transparent"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload className="w-10 h-10 text-[#80FF00]" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Upload Resume
                                </h3>
                                <p className="text-base text-gray-600 dark:text-gray-300">
                                    Upload your current resume and we'll extract the information
                                </p>
                                <div className="flex flex-wrap gap-2 justify-center pt-2">
                                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-400">
                                        PDF
                                    </span>
                                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-400">
                                        DOCX
                                    </span>
                                </div>
                            </div>
                        </motion.button>

                        {/* Manual Entry Option */}
                        <motion.button
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.15 }}
                            onClick={() => handleManualEntry()}
                            className="group relative bg-white dark:bg-[#141810] rounded-2xl p-12 shadow-lg shadow-black/10 dark:shadow-black/40 transition-all duration-300 hover:shadow-xl hover:shadow-black/20 dark:hover:shadow-black/50 hover:scale-105 border border-gray-200 dark:border-transparent"
                        >
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Edit3 className="w-10 h-10 text-[#80FF00]" />
                                </div>
                                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                                    Start Fresh
                                </h3>
                                <p className="text-base text-gray-600 dark:text-gray-300">
                                    Build your resume from scratch with our guided forms
                                </p>
                                <div className="flex items-center gap-2 justify-center pt-2">
                                    <span className="text-xs px-3 py-1 bg-gray-100 dark:bg-white/10 rounded-full text-gray-600 dark:text-gray-400">
                                        For beginners
                                    </span>
                                </div>
                            </div>
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    }

    if (parseMethod === 'upload') {
        return (
            <div className="flex items-center justify-center h-full min-h-[calc(100vh-200px)]">
                <div className="w-full max-w-2xl px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-[#141810] rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40 p-12 border border-gray-200 dark:border-transparent"
                    >
                        {uploadStatus === 'idle' && (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <FileText className="w-10 h-10 text-[#80FF00]" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                    Upload Your Resume
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-8">
                                    Drag and drop your file here or click to browse
                                </p>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".pdf,.docx,.doc,image/*"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        disabled={isUploading}
                                    />
                                    <span className="inline-block px-8 py-3 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105">
                                        Choose File
                                    </span>
                                </label>
                                <p className="text-sm text-gray-400 mt-4">
                                    Supports PDF, DOCX, and image files (max 10MB)
                                </p>
                                <button
                                    onClick={() => setParseMethod(null)}
                                    className="mt-6 text-gray-500 hover:text-gray-700 dark:hover:text-white"
                                >
                                    ← Back to options
                                </button>
                            </div>
                        )}

                        {(uploadStatus === 'uploading' || uploadStatus === 'parsing') && (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                    <FileText className="w-10 h-10 text-[#80FF00]" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                                    {uploadStatus === 'uploading' ? 'Uploading...' : 'Parsing Your Resume...'}
                                </h3>

                                {uploadStatus === 'parsing' && (
                                    <div className="mb-6">
                                        <ul className="space-y-3 text-left max-w-md mx-auto">
                                            {parsingSteps.map((step, index) => {
                                                const isCompleted = index < currentParsingStepIndex;
                                                const isCurrent = index === currentParsingStepIndex;

                                                return (
                                                    <li
                                                        key={index}
                                                        className={`flex items-center gap-3 text-sm transition-colors ${isCompleted
                                                            ? 'text-[#80FF00]'
                                                            : isCurrent
                                                                ? 'text-[#80FF00] font-medium'
                                                                : 'text-gray-400'
                                                            }`}
                                                    >
                                                        {isCompleted ? (
                                                            <CheckCircle2 className="w-5 h-5 text-[#80FF00] flex-shrink-0" />
                                                        ) : isCurrent ? (
                                                            <Loader2 className="w-5 h-5 text-[#80FF00] flex-shrink-0 animate-spin" />
                                                        ) : (
                                                            <div className="w-5 h-5 rounded-full border-2 border-gray-400 flex-shrink-0" />
                                                        )}
                                                        <span>{step.label}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}

                                <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2 mb-4 overflow-hidden">
                                    <div
                                        className="bg-[#80FF00] h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-gray-500 text-sm">
                                    {uploadProgress}% complete
                                </p>
                            </div>
                        )}

                        {uploadStatus === 'success' && (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-[#80FF00]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-[#80FF00]" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                    Successfully Parsed!
                                </h3>
                                <p className="text-gray-500">
                                    Moving to the next step...
                                </p>
                            </div>
                        )}

                        {uploadStatus === 'error' && (
                            <div className="text-center">
                                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <AlertTriangle className="w-10 h-10 text-red-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                    Upload Failed
                                </h3>
                                <p className="text-red-400 mb-6">
                                    {errorMessage}
                                </p>
                                <button
                                    onClick={() => {
                                        setUploadStatus('idle');
                                        setErrorMessage('');
                                        setUploadProgress(0);
                                    }}
                                    className="px-6 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-lg font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>
        );
    }

    return null;
}
