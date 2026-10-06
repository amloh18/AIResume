'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LINKEDIN_LIMITS } from '@/types/linkedin';

interface CharacterGuardProps {
    current: number;
    limit: number;
    hookLimit?: number; // For the first X chars that are most visible
    label?: string;
}

type GuardStatus = 'green' | 'yellow' | 'red';

function getStatus(current: number, limit: number): GuardStatus {
    const ratio = current / limit;
    if (ratio >= 1) return 'red';
    if (ratio >= 0.85) return 'yellow';
    return 'green';
}

const STATUS_COLORS = {
    green: {
        bg: '#dcfce7',
        text: '#166534',
        bar: '#22c55e',
    },
    yellow: {
        bg: '#fef9c3',
        text: '#854d0e',
        bar: '#eab308',
    },
    red: {
        bg: '#fee2e2',
        text: '#991b1b',
        bar: '#ef4444',
    },
};

export default function CharacterGuard({
    current,
    limit,
    hookLimit,
    label,
}: CharacterGuardProps) {
    const status = getStatus(current, limit);
    const colors = STATUS_COLORS[status];
    const percentage = Math.min(100, (current / limit) * 100);
    const remaining = limit - current;
    const isOverLimit = current > limit;

    // Check hook visibility (for About section)
    const hookStatus = hookLimit ? getStatus(Math.min(current, hookLimit), hookLimit) : null;
    const hookColors = hookStatus ? STATUS_COLORS[hookStatus] : null;

    return (
        <div className="flex items-center gap-3">
            {/* Main Character Counter */}
            <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-full text-small font-medium"
                style={{
                    backgroundColor: colors.bg,
                    color: colors.text,
                }}
            >
                {label && <span className="opacity-70">{label}</span>}
                <span>
                    {current} / {limit}
                </span>
                {isOverLimit && (
                    <span className="text-red-600 font-bold">
                        ({Math.abs(remaining)} over)
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="flex-1 max-w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: colors.bar }}
                />
            </div>

            {/* Hook Warning (for About section) */}
            {hookLimit && hookColors && current > 0 && (
                <div
                    className="text-small px-2 py-0.5 rounded-full"
                    style={{
                        backgroundColor: hookColors.bg,
                        color: hookColors.text,
                    }}
                >
                    Hook: {Math.min(current, hookLimit)}/{hookLimit}
                </div>
            )}
        </div>
    );
}

// Preset guards for common LinkedIn fields
export function HeadlineGuard({ current }: { current: number }) {
    return (
        <CharacterGuard
            current={current}
            limit={LINKEDIN_LIMITS.HEADLINE}
            label="Headline"
        />
    );
}

export function AboutGuard({ current }: { current: number }) {
    return (
        <CharacterGuard
            current={current}
            limit={LINKEDIN_LIMITS.ABOUT}
            hookLimit={LINKEDIN_LIMITS.ABOUT_HOOK}
            label="About"
        />
    );
}

export function ExperienceGuard({ current }: { current: number }) {
    return (
        <CharacterGuard
            current={current}
            limit={LINKEDIN_LIMITS.EXPERIENCE_DESC}
            label="Description"
        />
    );
}
