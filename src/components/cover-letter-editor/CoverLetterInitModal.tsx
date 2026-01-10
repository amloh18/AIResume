'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Briefcase, ChevronDown, User, Sparkles, AlertCircle } from 'lucide-react';

interface CVOption {
    id: string;
    title: string;
    type: 'master' | 'standalone' | 'journey';
    lastModified: string;
}

interface CoverLetterInitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: {
        cvId?: string;
        jobDescription?: string;
        companyName: string;
        jobTitle: string;
    }) => void;
    userId: string;
}

export default function CoverLetterInitModal({
    isOpen,
    onClose,
    onSubmit,
    userId
}: CoverLetterInitModalProps) {
    const [cvOptions, setCvOptions] = useState<CVOption[]>([]);
    const [selectedCvId, setSelectedCvId] = useState<string>('');
    const [jobDescription, setJobDescription] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [jobTitle, setJobTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showCvDropdown, setShowCvDropdown] = useState(false);

    // Fetch user's CVs
    useEffect(() => {
        if (isOpen && userId) {
            const fetchCVs = async () => {
                setIsLoading(true);
                try {
                    const response = await fetch(`/api/cvs?userId=${userId}`);
                    if (response.ok) {
                        const result = await response.json();
                        const cvs = result.data?.cvs || result.cvs || [];
                        const options: CVOption[] = cvs.map((cv: any) => ({
                            id: cv._id || cv.id,
                            title: cv.title || 'Untitled CV',
                            type: cv.isMaster ? 'master' : (cv.cvType || 'standalone'),
                            lastModified: cv.updatedAt || cv.lastModified || new Date().toISOString()
                        }));
                        setCvOptions(options);
                    }
                } catch (error) {
                    console.error('Failed to fetch CVs:', error);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCVs();
        }
    }, [isOpen, userId]);

    const handleSubmit = () => {
        // Company name and job title are required
        if (!companyName.trim() || !jobTitle.trim()) {
            return;
        }

        onSubmit({
            cvId: selectedCvId || undefined,
            jobDescription: jobDescription.trim() || undefined,
            companyName: companyName.trim(),
            jobTitle: jobTitle.trim()
        });
    };

    const selectedCv = cvOptions.find(cv => cv.id === selectedCvId);

    const getCvTypeLabel = (type: string) => {
        switch (type) {
            case 'master': return 'Master';
            case 'journey': return 'Journey';
            default: return 'Standalone';
        }
    };

    const getCvTypeBadgeColor = (type: string) => {
        switch (type) {
            case 'master': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            case 'journey': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-[#141810] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#80FF00]/20 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[#80FF00]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Create Cover Letter</h2>
                                <p className="text-sm text-white/60">Add job details to generate a tailored cover letter</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5 text-white/60" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                        {/* Job Description - Optional */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-white">
                                <Briefcase className="w-4 h-4 text-[#80FF00]" />
                                Job Description
                                <span className="text-white/40 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={jobDescription}
                                onChange={(e) => setJobDescription(e.target.value)}
                                placeholder="Paste the job description here for better tailoring..."
                                className="w-full h-32 px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#80FF00]/50 focus:ring-1 focus:ring-[#80FF00]/30 resize-none transition-all"
                            />
                            <p className="text-xs text-white/40">
                                Helps generate a more tailored cover letter
                            </p>
                        </div>

                        {/* Company & Job Title - Required */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-white">
                                    Company Name
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="e.g., Google"
                                    className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#80FF00]/50 focus:ring-1 focus:ring-[#80FF00]/30 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-white">
                                    Job Title
                                    <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    placeholder="e.g., Software Engineer"
                                    className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-white/40 focus:outline-none focus:border-[#80FF00]/50 focus:ring-1 focus:ring-[#80FF00]/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* CV Selection - Optional */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm font-medium text-white">
                                <FileText className="w-4 h-4 text-[#80FF00]" />
                                Select CV
                                <span className="text-white/40 font-normal">(Optional)</span>
                            </label>

                            {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="w-6 h-6 border-2 border-[#80FF00] border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : cvOptions.length > 0 ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowCvDropdown(!showCvDropdown)}
                                        className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white hover:border-white/20 transition-all"
                                    >
                                        <span className={selectedCv ? 'text-white' : 'text-white/40'}>
                                            {selectedCv ? selectedCv.title : 'Choose a CV to use your details'}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {selectedCv && (
                                                <span className={`text-xs px-2 py-0.5 rounded-full border ${getCvTypeBadgeColor(selectedCv.type)}`}>
                                                    {getCvTypeLabel(selectedCv.type)}
                                                </span>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-white/60 transition-transform ${showCvDropdown ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>

                                    {/* Dropdown */}
                                    <AnimatePresence>
                                        {showCvDropdown && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-10 max-h-48 overflow-y-auto"
                                            >
                                                {/* None option */}
                                                {/* Fill details manually option removed */}

                                                {cvOptions.map((cv) => (
                                                    <button
                                                        key={cv.id}
                                                        onClick={() => {
                                                            setSelectedCvId(cv.id);
                                                            setShowCvDropdown(false);
                                                        }}
                                                        className={`w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors ${selectedCvId === cv.id ? 'bg-[#80FF00]/10' : ''}`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <FileText className="w-4 h-4 text-white/40" />
                                                            <span className="text-white truncate">{cv.title}</span>
                                                        </div>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getCvTypeBadgeColor(cv.type)}`}>
                                                            {getCvTypeLabel(cv.type)}
                                                        </span>
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 px-4 py-4 bg-[#1a1a1a] border border-white/10 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                                    <div>
                                        <p className="text-sm text-white">No CVs found</p>
                                        <p className="text-xs text-white/60">You can fill in your details manually in the editor</p>
                                    </div>
                                </div>
                            )}

                            <p className="text-xs text-white/40">
                                {selectedCvId ? 'Your CV details will be used to populate the cover letter header' : 'You can fill in your personal details manually in the editor'}
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-[#0d0d0d]">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={!companyName.trim() || !jobTitle.trim()}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition-all flex items-center gap-2 ${(companyName.trim() && jobTitle.trim())
                                ? 'bg-[#80FF00] text-black hover:bg-[#99FF33] shadow-lg shadow-[#80FF00]/20'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Continue
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
