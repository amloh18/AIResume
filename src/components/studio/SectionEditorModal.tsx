'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X,
    Save,
    Loader2,
    User,
    Briefcase,
    GraduationCap,
    Code,
    FolderOpen,
    Award,
    Globe,
    Heart,
    Plus,
    Trash2,
} from 'lucide-react';

// ============================================================================
// Props
// ============================================================================

type SectionId = 'personal' | 'work' | 'education' | 'skills' | 'projects' | 'certificates' | 'languages' | 'volunteer';

interface SectionEditorModalProps {
    sectionId: SectionId;
    sectionLabel: string;
    cvData: any;
    onSave: (data: any) => void;
    onClose: () => void;
}

// ============================================================================
// Section Icons
// ============================================================================

const SECTION_ICONS: Record<SectionId, React.ElementType> = {
    personal: User,
    work: Briefcase,
    education: GraduationCap,
    skills: Code,
    projects: FolderOpen,
    certificates: Award,
    languages: Globe,
    volunteer: Heart,
};

// ============================================================================
// Main Component
// ============================================================================

export default function SectionEditorModal({
    sectionId,
    sectionLabel,
    cvData,
    onSave,
    onClose,
}: SectionEditorModalProps) {
    const [formData, setFormData] = useState<any>(null);
    const [isSaving, setIsSaving] = useState(false);

    const Icon = SECTION_ICONS[sectionId];

    // Initialize form data
    useEffect(() => {
        switch (sectionId) {
            case 'personal':
                setFormData(cvData.basics || {});
                break;
            case 'work':
                setFormData(cvData.work || []);
                break;
            case 'education':
                setFormData(cvData.education || []);
                break;
            case 'skills':
                setFormData(cvData.skills || []);
                break;
            case 'projects':
                setFormData(cvData.projects || []);
                break;
            case 'certificates':
                setFormData(cvData.certificates || []);
                break;
            case 'languages':
                setFormData(cvData.languages || []);
                break;
            case 'volunteer':
                setFormData(cvData.volunteer || []);
                break;
        }
    }, [sectionId, cvData]);

    // Handle save
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 300)); // Brief delay for UX
            onSave(formData);
        } finally {
            setIsSaving(false);
        }
    };

    // Handle ESC key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (formData === null) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white dark:bg-[#141810] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden border border-gray-200 dark:border-white/10"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-lime-100 dark:bg-[#80FF00]/20 rounded-lg">
                            <Icon className="w-5 h-5 text-lime-600 dark:text-[#80FF00]" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {sectionLabel}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Edit and save your changes
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
                    {sectionId === 'personal' ? (
                        <PersonalInfoForm data={formData} onChange={setFormData} />
                    ) : sectionId === 'work' ? (
                        <WorkExperienceForm data={formData} onChange={setFormData} />
                    ) : sectionId === 'education' ? (
                        <EducationForm data={formData} onChange={setFormData} />
                    ) : sectionId === 'skills' ? (
                        <SkillsForm data={formData} onChange={setFormData} />
                    ) : (
                        <GenericArrayForm
                            data={formData}
                            onChange={setFormData}
                            sectionId={sectionId}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-white/10">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-5 py-2 bg-lime-500 dark:bg-[#80FF00] hover:bg-lime-600 dark:hover:bg-[#70e600] text-black rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

// ============================================================================
// Personal Info Form
// ============================================================================

function PersonalInfoForm({ data, onChange }: { data: any; onChange: (d: any) => void }) {
    const updateField = (field: string, value: string) => {
        onChange({ ...data, [field]: value });
    };

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Full Name
                    </label>
                    <input
                        type="text"
                        value={data.name || ''}
                        onChange={(e) => updateField('name', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50 dark:focus:ring-[#80FF00]/50 focus:border-lime-500 dark:focus:border-[#80FF00]"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        value={data.label || ''}
                        onChange={(e) => updateField('label', e.target.value)}
                        placeholder="e.g., Software Engineer"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                </label>
                <input
                    type="email"
                    value={data.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50"
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                    </label>
                    <input
                        type="tel"
                        value={data.phone || ''}
                        onChange={(e) => updateField('phone', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Location
                    </label>
                    <input
                        type="text"
                        value={data.location?.city || ''}
                        onChange={(e) => onChange({ ...data, location: { ...data.location, city: e.target.value } })}
                        placeholder="City, Country"
                        className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Summary
                </label>
                <textarea
                    value={data.summary || ''}
                    onChange={(e) => updateField('summary', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-[#1a230f] border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-lime-500/50 resize-none"
                />
            </div>
        </div>
    );
}

// ============================================================================
// Work Experience Form
// ============================================================================

function WorkExperienceForm({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
    const addItem = () => {
        onChange([...data, { name: '', position: '', startDate: '', endDate: '', summary: '', highlights: [] }]);
    };

    const removeItem = (index: number) => {
        onChange(data.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <div className="space-y-6">
            {data.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-[#1a230f] rounded-xl border border-gray-200 dark:border-white/10">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Position {index + 1}
                        </span>
                        <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={item.name || ''}
                                onChange={(e) => updateItem(index, 'name', e.target.value)}
                                placeholder="Company Name"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={item.position || ''}
                                onChange={(e) => updateItem(index, 'position', e.target.value)}
                                placeholder="Job Title"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={item.startDate || ''}
                                onChange={(e) => updateItem(index, 'startDate', e.target.value)}
                                placeholder="Start Date (e.g., 2020-01)"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={item.endDate || ''}
                                onChange={(e) => updateItem(index, 'endDate', e.target.value)}
                                placeholder="End Date (or Present)"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                        </div>
                        <textarea
                            value={item.summary || ''}
                            onChange={(e) => updateItem(index, 'summary', e.target.value)}
                            placeholder="Description of your role..."
                            rows={3}
                            className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm resize-none"
                        />
                    </div>
                </div>
            ))}
            <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-gray-500 dark:text-gray-400 hover:border-lime-500 dark:hover:border-[#80FF00] hover:text-lime-600 dark:hover:text-[#80FF00] transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Work Experience
            </button>
        </div>
    );
}

// ============================================================================
// Education Form
// ============================================================================

function EducationForm({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
    const addItem = () => {
        onChange([...data, { institution: '', area: '', studyType: '', startDate: '', endDate: '' }]);
    };

    const removeItem = (index: number) => {
        onChange(data.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <div className="space-y-6">
            {data.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 dark:bg-[#1a230f] rounded-xl border border-gray-200 dark:border-white/10">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Education {index + 1}
                        </span>
                        <button
                            onClick={() => removeItem(index)}
                            className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="space-y-3">
                        <input
                            type="text"
                            value={item.institution || ''}
                            onChange={(e) => updateItem(index, 'institution', e.target.value)}
                            placeholder="Institution Name"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={item.studyType || ''}
                                onChange={(e) => updateItem(index, 'studyType', e.target.value)}
                                placeholder="Degree (e.g., Bachelor's)"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={item.area || ''}
                                onChange={(e) => updateItem(index, 'area', e.target.value)}
                                placeholder="Field of Study"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                value={item.startDate || ''}
                                onChange={(e) => updateItem(index, 'startDate', e.target.value)}
                                placeholder="Start Year"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                            <input
                                type="text"
                                value={item.endDate || ''}
                                onChange={(e) => updateItem(index, 'endDate', e.target.value)}
                                placeholder="End Year"
                                className="px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                            />
                        </div>
                    </div>
                </div>
            ))}
            <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-gray-500 dark:text-gray-400 hover:border-lime-500 dark:hover:border-[#80FF00] hover:text-lime-600 dark:hover:text-[#80FF00] transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Education
            </button>
        </div>
    );
}

// ============================================================================
// Skills Form
// ============================================================================

function SkillsForm({ data, onChange }: { data: any[]; onChange: (d: any[]) => void }) {
    const addItem = () => {
        onChange([...data, { name: '', level: '', keywords: [] }]);
    };

    const removeItem = (index: number) => {
        onChange(data.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: string, value: any) => {
        const updated = [...data];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    return (
        <div className="space-y-4">
            {data.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#1a230f] rounded-lg">
                    <input
                        type="text"
                        value={item.name || ''}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        placeholder="Skill Category (e.g., Programming)"
                        className="flex-1 px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                    />
                    <input
                        type="text"
                        value={item.keywords?.join(', ') || ''}
                        onChange={(e) => updateItem(index, 'keywords', e.target.value.split(',').map(s => s.trim()))}
                        placeholder="Skills (comma separated)"
                        className="flex-1 px-3 py-2 bg-white dark:bg-[#0f1410] border border-gray-200 dark:border-white/10 rounded-lg text-sm"
                    />
                    <button
                        onClick={() => removeItem(index)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-500/20 rounded"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ))}
            <button
                onClick={addItem}
                className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-gray-500 dark:text-gray-400 hover:border-lime-500 hover:text-lime-600 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Skill Category
            </button>
        </div>
    );
}

// ============================================================================
// Generic Array Form (for other sections)
// ============================================================================

function GenericArrayForm({ data, onChange, sectionId }: { data: any[]; onChange: (d: any[]) => void; sectionId: string }) {
    return (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="mb-2">Editor for {sectionId} section</p>
            <p className="text-sm">Items: {data.length}</p>
        </div>
    );
}
