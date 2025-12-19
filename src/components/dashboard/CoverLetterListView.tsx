'use client';

import React, { useState } from 'react';
import {
    Edit,
    Download,
    Star,
    Trash2,
    MoreVertical,
    Check,
    X,
    Pencil,
    PenTool,
    Eye,
    MessageSquare
} from 'lucide-react';
import { formatDetailedTime } from '@/lib/utils/timeUtils';
import CoverLetterPreviewThumbnail from './CoverLetterPreviewThumbnail';

interface CoverLetter {
    id: string;
    title: string;
    lastModified: string | Date;
    status: 'draft' | 'final' | 'archived';
    content?: string; // Optional
    isStarred?: boolean;
    wordCount?: number;
    views?: number;
    thumbnail?: string;
    metadata?: {
        targetCompany?: string;
        targetPosition?: string;
        wordCount?: number;
        lastModified?: Date;
    };
    [key: string]: any;
}

interface CoverLetterListViewProps {
    coverLetters: CoverLetter[];
    onEdit: (coverLetter: CoverLetter) => void | Promise<void>;
    onDownload: (coverLetter: CoverLetter) => void | Promise<void>;
    onDelete: (coverLetter: CoverLetter) => void | Promise<void>;
    onToggleStar: (coverLetterId: string) => void;
    onRename: (id: string, newTitle: string) => void | Promise<void>;
    editingCoverLetterId?: string | null;
    editingTitle?: string;
    onStartEditing?: (coverLetter: CoverLetter) => void;
    onTitleEdit?: (id: string, newTitle: string) => void;
    onCancelEditing?: () => void;
}

const CoverLetterListView: React.FC<CoverLetterListViewProps> = ({
    coverLetters,
    onEdit,
    onDownload,
    onDelete,
    onToggleStar,
    onRename,
    editingCoverLetterId,
    editingTitle,
    onStartEditing,
    onTitleEdit,
    onCancelEditing
}) => {
    const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'final': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
            case 'draft': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'archived': return 'bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-400';
            default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getWordCount = (cl: CoverLetter) => {
        return cl.metadata?.wordCount || cl.content?.split(/\s+/).length || 0;
    };

    return (
        <div className="w-full bg-white dark:bg-[#141810] rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-[#141810] border-b border-gray-200 dark:border-white/10">
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Document Name</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Words</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider">Last Modified</th>
                            <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-white uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="dark:divide-white/10">
                        {coverLetters.map((cl) => (
                            <tr
                                key={cl.id}
                                className="bg-white dark:bg-[#1a2015] group hover:bg-gray-50 dark:hover:bg-[#1f2619] transition-colors cursor-pointer border-b border-gray-100 dark:border-white/10 last:border-b-0"
                                onMouseEnter={() => setHoveredRowId(cl.id)}
                                onMouseLeave={() => setHoveredRowId(null)}
                                onClick={() => onEdit(cl)}
                            >
                                {/* Document Name */}
                                <td className="px-6 py-3">
                                    <div className="flex flex-col max-w-[450px]">
                                        {editingCoverLetterId === cl.id ? (
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editingTitle || ''}
                                                    onChange={(e) => onTitleEdit?.(cl.id, e.target.value)}
                                                    className="w-full bg-white dark:bg-[#1a2016] border border-gray-300 dark:border-lime-500/20 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500 dark:text-white"
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            onRename(cl.id, editingTitle || cl.title);
                                                        } else if (e.key === 'Escape') {
                                                            onCancelEditing?.();
                                                        }
                                                    }}
                                                />
                                                <button onClick={() => onRename(cl.id, editingTitle || cl.title)} className="text-green-500 hover:text-green-600 p-1"><Check size={14} /></button>
                                                <button onClick={onCancelEditing} className="text-gray-400 hover:text-gray-500 p-1"><X size={14} /></button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm text-gray-900 dark:text-white truncate" title={cl.title}>{cl.title}</span>
                                                {onStartEditing && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onStartEditing(cl);
                                                        }}
                                                        className="transition-opacity text-gray-300 dark:text-gray-600 hover:text-lime-600 dark:hover:text-lime-400 opacity-0 group-hover:opacity-100"
                                                        title="Rename"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onToggleStar(cl.id);
                                                    }}
                                                    className={`transition-opacity ${cl.isStarred ? 'text-yellow-400 opacity-100' : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400 opacity-0 group-hover:opacity-100'}`}
                                                >
                                                    <Star size={14} fill={cl.isStarred ? 'currentColor' : 'none'} />
                                                </button>
                                            </div>
                                        )}
                                        {(cl.metadata?.targetCompany || cl.metadata?.targetPosition) && (
                                            <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                {cl.metadata.targetPosition ? `${cl.metadata.targetPosition} at ` : ''}
                                                {cl.metadata.targetCompany || ''}
                                            </span>
                                        )}
                                    </div>
                                </td>

                                {/* Status */}
                                <td className="px-6 py-3">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium capitalize ${getStatusColor(cl.status)}`}>
                                        {cl.status}
                                    </span>
                                </td>

                                {/* Words */}
                                <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400">
                                    {getWordCount(cl)} words
                                </td>

                                {/* Last Modified */}
                                <td className="px-6 py-3 text-xs text-gray-500 dark:text-gray-400">
                                    {typeof cl.lastModified === 'string' ? cl.lastModified : formatDetailedTime(cl.lastModified)}
                                </td>

                                {/* Actions */}
                                <td className="px-6 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => onEdit(cl)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Edit"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDownload(cl)}
                                            className="p-1.5 text-gray-400 hover:text-lime-600 dark:hover:text-lime-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Download"
                                        >
                                            <Download size={14} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(cl)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {coverLetters.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex flex-col items-center justify-center">
                                        <MessageSquare size={32} className="opacity-20 mb-2" />
                                        <p>No Cover Letters found</p>
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

export default CoverLetterListView;
