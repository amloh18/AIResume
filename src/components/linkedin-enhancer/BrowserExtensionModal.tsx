import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ExternalLink, ShieldCheck, ArrowRight } from 'lucide-react';
import { useExtension } from '@/contexts/linkedin-enhancer';
import { LINKEDIN_COLORS } from '@/types/linkedin';

interface BrowserExtensionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPreview: () => void;
    selectedSectionsCount: number;
}

export default function BrowserExtensionModal({ isOpen, onClose, onPreview, selectedSectionsCount }: BrowserExtensionModalProps) {
    const { state: extensionState } = useExtension();
    const isConnected = extensionState.isConnected;

    if (!isOpen) return null;

    const steps = [
        {
            title: "1. Review Changes",
            description: `You've selected ${selectedSectionsCount} section${selectedSectionsCount === 1 ? '' : 's'} to enhance.`,
            icon: <CheckCircle className="w-6 h-6 text-green-500" />,
            status: 'done'
        },
        {
            title: "2. Open LinkedIn",
            description: "Click below to open your LinkedIn profile in a new tab.",
            icon: <ExternalLink className="w-6 h-6 text-blue-500" />,
            status: 'current'
        },
        {
            title: "3. Safe Preview",
            description: "Our extension acts as a safe bridge, showing an overlay of changes before any real updates.",
            icon: <ShieldCheck className="w-6 h-6 text-indigo-500" />,
            status: 'pending'
        },
        {
            title: "4. One-Click Apply",
            description: "Review the overlay and click 'Apply' to safely inject changes into your profile.",
            icon: <ArrowRight className="w-6 h-6 text-purple-500" />,
            status: 'pending'
        }
    ];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 20 }}
                    className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Safe Mode Preview</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6">
                        <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-800 flex gap-3">
                            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <p>
                                <strong>Safety First:</strong> The CVCircle extension acts solely as a bridge. It will never modify your profile without your explicit confirmation on the LinkedIn page.
                            </p>
                        </div>

                        <div className="space-y-6">
                            {steps.map((step, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <div className="flex flex-col items-center">
                                        <div className={"w-10 h-10 rounded-full flex items-center justify-center " + (step.status === 'done' ? 'bg-green-50' : step.status === 'current' ? 'bg-blue-50' : 'bg-gray-50')}>
                                            {step.icon}
                                        </div>
                                        {idx !== steps.length - 1 && (
                                            <div className="w-px h-full bg-gray-200 my-2" />
                                        )}
                                    </div>
                                    <div className="pt-2 pb-4">
                                        <h3 className="font-semibold text-gray-900">{step.title}</h3>
                                        <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <motion.button
                            onClick={onPreview}
                            className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg shadow-sm"
                            style={{ backgroundColor: LINKEDIN_COLORS.PRIMARY_BLUE }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <ExternalLink className="w-4 h-4" />
                            <span>Preview on LinkedIn</span>
                        </motion.button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
