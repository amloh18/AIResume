import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, FileText, Plus, Sparkles } from 'lucide-react';

interface MasterCVPromptModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateMasterCV: () => void;
}

/**
 * Master CV Prompt Modal
 * 
 * Shown when user tries to add a job with 0 CVs
 * Explains the Master CV concept and guides user to create one
 */
const MasterCVPromptModal: React.FC<MasterCVPromptModalProps> = ({
    isOpen,
    onClose,
    onCreateMasterCV
}) => {
    const router = useRouter();
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        // Check if user has previously dismissed this modal (in current session)
        const dismissed = sessionStorage.getItem('masterCVPromptDismissed');
        if (dismissed === 'true') {
            setIsDismissed(true);
        }
    }, []);

    const handleCreateMasterCV = () => {
        // Navigate to Resume Enhancer in Master CV creation mode
        router.push('/resume-enhancer?mode=create&type=master&source=job-tracker');
        onCreateMasterCV();
    };

    const handleDismiss = () => {
        // Store dismissal in session storage (not persistent across sessions)
        sessionStorage.setItem('masterCVPromptDismissed', 'true');
        setIsDismissed(true);
        onClose();
    };

    if (!isOpen || isDismissed) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={handleDismiss}
            />

            {/* Modal */}
            <div className="relative bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    aria-label="Close"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 rounded-2xl flex items-center justify-center">
                        <FileText className="w-8 h-8 text-[var(--accent-primary)]" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">
                    Create Your Master CV First
                </h2>

                {/* Description */}
                <p className="text-[var(--text-secondary)] text-center mb-6 leading-relaxed">
                    Before you start tracking jobs, let's create your <span className="font-semibold text-[var(--accent-primary)]">Master CV</span> — a comprehensive resume that captures your full experience and skills.
                </p>

                {/* Benefits */}
                <div className="bg-[var(--bg-secondary)] rounded-xl p-4 mb-6 space-y-3">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <Sparkles className="w-4 h-4 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1">
                                Tailored Job Applications
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                For each job you add, we'll automatically create a customized CV optimized for that specific role
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <Plus className="w-4 h-4 text-[var(--accent-primary)]" />
                        </div>
                        <div>
                            <h3 className="font-medium text-[var(--text-primary)] text-sm mb-1">
                                One Source, Many Versions
                            </h3>
                            <p className="text-xs text-[var(--text-secondary)]">
                                Update your Master CV once, and all your job-specific CVs stay in sync
                            </p>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={handleDismiss}
                        className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors font-medium"
                    >
                        Remind Me Later
                    </button>
                    <button
                        onClick={handleCreateMasterCV}
                        className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:opacity-90 transition-opacity font-medium shadow-lg shadow-[var(--accent-primary)]/25"
                    >
                        Create Master CV
                    </button>
                </div>

                {/* Help link */}
                <div className="text-center mt-4">
                    <a
                        href="https://docs.cvcircle.app/master-cv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-[var(--accent-primary)] hover:underline"
                    >
                        Learn more about Master CV →
                    </a>
                </div>
            </div>
        </div>
    );
};

export default MasterCVPromptModal;
