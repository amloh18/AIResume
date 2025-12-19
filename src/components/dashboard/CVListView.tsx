'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Edit,
    Download,
    Star,
    Trash2,
    Copy,
    MoreVertical,
    Check,
    X,
    Pencil,
    BarChart3, // Using BarChart3 for Analytics as per CVCardOverlay
    ExternalLink,
    Loader2,
    FileText
} from 'lucide-react';
import { formatDetailedTime } from '@/lib/utils/timeUtils';
import CVPreviewThumbnail from './CVPreviewThumbnail';
import { ITemplate } from '@/types/template';

// Local interface compatible with Canvas.tsx's CV objects
interface CV {
    id: string;
    title: string;
    lastModified: string | Date; // Allow Date
    status: 'draft' | 'published' | 'archived';
    views?: number; // Optional
    isStarred?: boolean;
    thumbnail?: string;
    description?: string;
    cvData?: any;
    template?: {
        _id?: string;
        id?: string; // Handle both
        name: string;
        globalStyles: any;
        availableSections: any[];
    };
    completionPercentage?: number;
    isMaster?: boolean;
    journeyId?: string;
    cvType?: 'master' | 'journey' | 'standalone';
    atsScore?: number;
    metadata?: any;
    [key: string]: any; // Allow loose typing to accept CVDocument extranous props
}

interface CVListViewProps {
    cvs: CV[];
    onEdit: (cv: CV) => void | Promise<void>;
    onDownload: (cv: CV) => void | Promise<void>;
    onDelete: (cv: CV) => void | Promise<void>;
    onToggleStar: (cvId: string) => void;
    onDuplicate: (cv: CV) => void | Promise<void>;
    onViewReport: (cv: CV) => void | Promise<void>;
    onRename: (cvId: string, newTitle: string) => void | Promise<void>;
    editingCVId?: string | null;
    editingTitle?: string;
    onStartEditing?: (cv: CV) => void;
    onTitleEdit?: (cvId: string, newTitle: string) => void;
    onCancelEditing?: () => void;
}

const CVListView: React.FC<CVListViewProps> = ({
    cvs,
    onEdit,
    onDownload,
    onDelete,
    onToggleStar,
    onDuplicate,
    onViewReport,
    onRename,
    editingCVId,
    editingTitle,
    onStartEditing,
    onTitleEdit,
    onCancelEditing
}) => {
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

    // Check if any CV in the list is a journey CV (non-master CV)
    // Journey CVs should show "ATS Score" instead of "CV Score"
    // Master CVs show completion percentage, so they show "CV Score"
    const hasJourneyCVs = cvs.some(cv => {
        // Check if it's explicitly a journey CV
        if (cv.cvType === 'journey' || cv.metadata?.cvType === 'journey') return true;
        // Check if it has a journeyId
        if (cv.journeyId || cv.metadata?.journeyId) return true;
        // Check if it's NOT a master CV (non-master CVs in "My CVs" section should show ATS Score)
        const isMaster = cv.isMaster === true || 
                        cv.metadata?.isMaster === true || 
                        cv.metadata?.isMaster === 'true' ||
                        cv.metadata?.createdVia === 'ai-career-report';
        // If it's not a master CV, show ATS Score
        return !isMaster;
    });
    
    // Alternative: If all CVs are non-master, show ATS Score
    // This ensures "My CVs" section always shows "ATS Score"
    const allNonMaster = cvs.length > 0 && cvs.every(cv => {
        const isMaster = cv.isMaster === true || 
                        cv.metadata?.isMaster === true || 
                        cv.metadata?.isMaster === 'true' ||
                        cv.metadata?.createdVia === 'ai-career-report';
        return !isMaster;
    });
    
    // Show "ATS Score" if there are any journey CVs OR if all CVs are non-master
    const showATSScore = hasJourneyCVs || allNonMaster;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'published': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'draft': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'archived': return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getRandomColor = (id: string) => {
        const colors = [
            '#F0FDF4', '#FEF3C7', '#FEE2E2', '#E0E7FF', '#F3E8FF',
            '#F0F9FF', '#FDF2F8', '#ECFDF5', '#FFFBEB', '#F1F5F9',
        ];
        const hash = id.split('').reduce((a, b) => {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0);
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="w-full bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#141810] border-b border-gray-200 dark:border-white/10">
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Document Name</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">
                                {showATSScore ? 'ATS Score' : 'CV Score'}
                            </th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Last Modified</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="dark:divide-white/10">
                        {cvs.map((cv) => (
                            <tr
                                key={cv.id}
                                className="bg-white dark:bg-[#1a2015] group hover:bg-gray-50 dark:hover:bg-[#1f2619] transition-colors cursor-pointer border-b border-gray-100 dark:border-white/10 last:border-b-0"
                                onMouseEnter={() => setHoveredRowId(cv.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                                onClick={() => onEdit(cv)}
                            >
                                {/* Document Name */}
                                <td className="px-6 py-3">
                                    <div className="flex flex-col max-w-[450px]">
                                        {editingCVId === cv.id ? (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editingTitle || ''}
                                                    onChange={(e) => onTitleEdit?.(cv.id, e.target.value)}
                                                    className="w-full bg-white dark:bg-[#1a2016] border border-gray-300 dark:border-lime-500/20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:text-white"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onRename(cv.id, editingTitle || cv.title);
                                                        } else if (e.key === 'Escape') {
                                                            onCancelEditing?.();
                                                        }
                                                    }}
                                                />
                                                <button onClick={() => onRename(cv.id, editingTitle || cv.title)} className="text-green-500 hover:text-green-600 p-1"><Check size={14} /></button>
                                                <button onClick={onCancelEditing} className="text-gray-400 hover:text-gray-500 p-1"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate" title={cv.title}>{cv.title}</span>
                                                {onStartEditing && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onStartEditing(cv);
                                                        }}
                                                        className="transition-opacity text-gray-300 dark:text-gray-600 hover:text-lime-600 dark:hover:text-lime-400 opacity-0 group-hover:opacity-100"
                                                        title="Rename"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                {/* Master Badge */}
                                                {((cv.isMaster === true || cv.metadata?.isMaster === true || cv.metadata?.isMaster === 'true') || cv.metadata?.createdVia === 'ai-career-report') && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-lime-400 text-black border border-lime-400 uppercase tracking-wide">
                                                        Master
                                                    </span>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleStar(cv.id);
                                                    }}
                                                    className={`transition-opacity ${cv.isStarred ? 'text-yellow-400 opacity-100' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'}`}
                                                >
                                                    <Star size={14} fill={cv.isStarred ? 'currentColor' : 'none'} />
                                                </button>
                                            </div>
                                        )}
                                        {cv.description && <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{cv.description}</span>}
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${getStatusColor(cv.status)}`}>
                                        {cv.status}
                                    </span>
                                </td>

                                {/* CV Score */}
                                <td className="px-6 py-3">
                                    {(cv.isMaster === true || cv.metadata?.isMaster === true) ? (
                                        // Master CV - Show Completion Score
                                        cv.completionPercentage !== undefined ? (
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                                <BarChart3 size={12} className={cv.completionPercentage >= 70 ? 'text-green-500' : cv.completionPercentage >= 50 ? 'text-yellow-500' : 'text-red-500'} />
                                                <span className={cv.completionPercentage >= 70 ? 'text-green-600 dark:text-green-400' : cv.completionPercentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                                                    {cv.completionPercentage}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-gray-400">-</span>
                                        )
                                    ) : (
                                        // Regular CV - Show ATS Score (check metadata first, then fallback to direct property)
                                        (() => {
                                            const atsScore = cv.metadata?.atsScore !== undefined ? cv.metadata.atsScore : cv.atsScore;
                                            return atsScore !== undefined ? (
                                                <div className="flex items-center gap-1.5 text-[10px]">
                                                    <BarChart3 size={12} className={atsScore >= 70 ? 'text-green-500' : atsScore >= 50 ? 'text-yellow-500' : 'text-red-500'} />
                                                    <span className={atsScore >= 70 ? 'text-green-600 dark:text-green-400' : atsScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                                                        {atsScore}%
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] text-gray-400">-</span>
                                            );
                                        })()
                                    )}
                                </td>

                                {/* Last Modified */}
                                <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400">
                                    {formatDetailedTime(cv.lastModified)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onEdit(cv)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Edit"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDuplicate(cv)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Duplicate"
                                        >
                                            <Copy size={14} />
                                        </button>
                                        <button
                                            onClick={() => onViewReport(cv)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="View Report"
                                        >
                                            <BarChart3 size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDownload(cv)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(cv)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {cvs.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <FileText size={32} className="opacity-20 mb-2" />
                                        <p>No CVs found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CVListView;
