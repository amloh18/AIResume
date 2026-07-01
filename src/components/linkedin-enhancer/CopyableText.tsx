'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check } from 'lucide-react';

interface CopyableTextProps {
    text: string;
    className?: string;
    showIcon?: boolean;
    multiline?: boolean;
    label?: string;
    children?: React.ReactNode;
}

export default function CopyableText({
    text,
    className = '',
    showIcon = true,
    multiline = false,
    label,
    children,
}: CopyableTextProps) {
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            // Try modern Clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [text]);

    return (
        <motion.div
            className={`relative cursor-pointer rounded-md transition-colors group ${className}`}
            onClick={handleCopy}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            whileTap={{ scale: 0.99 }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCopy()}
            title="Click to copy"
        >
            {/* Hover overlay */}
            <div
                className={`absolute inset-0 rounded-md transition-colors pointer-events-none ${isHovered ? 'bg-blue-50/60' : 'bg-transparent'
                    }`}
            />

            {/* Content */}
            <div className="relative z-10 flex items-start gap-2">
                <div className="flex-1">
                    {label && (
                        <span className="text-small text-gray-500 uppercase tracking-wide block mb-1">
                            {label}
                        </span>
                    )}
                    {children || (
                        <span className={multiline ? 'whitespace-pre-wrap' : ''}>
                            {text}
                        </span>
                    )}
                </div>

                {/* Copy Icon */}
                {showIcon && (
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={copied ? 'check' : 'copy'}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: isHovered || copied ? 1 : 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="flex-shrink-0 ml-2"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4 text-blue-600" />
                            )}
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>

            {/* Copied Toast */}
            <AnimatePresence>
                {copied && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 bg-gray-900 text-white text-small rounded-full whitespace-nowrap z-50"
                    >
                        Copied!
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Copy All Button for entire sections
interface CopyAllButtonProps {
    content: string;
    label?: string;
}

export function CopyAllButton({ content, label = 'Copy All' }: CopyAllButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(content);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = content;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
            }

            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }, [content]);

    return (
        <motion.button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-medium transition-colors"
            style={{
                backgroundColor: copied ? '#057642' : '#0a66c2',
                color: 'white',
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {copied ? (
                <>
                    <Check className="w-3 h-3" />
                    Copied!
                </>
            ) : (
                <>
                    <Copy className="w-3 h-3" />
                    {label}
                </>
            )}
        </motion.button>
    );
}
