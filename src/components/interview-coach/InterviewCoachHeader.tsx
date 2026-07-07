'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Home, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import NotificationCenter from '@/components/notifications/NotificationCenter';
import UserAvatar from '@/components/ui/UserAvatar';
import { useUserData, getUserDisplayName, getUserAvatar } from '@/lib/hooks/useUserData';

interface InterviewCoachHeaderProps {
    title?: string;
}

const InterviewCoachHeader: React.FC<InterviewCoachHeaderProps> = ({
    title = 'Interview Coach'
}) => {
    const router = useRouter();
    const { resolvedTheme, toggleTheme } = useTheme();
    const { userData } = useUserData();

    const handleExit = () => {
        router.push('/dashboard/tracker');
    };

    return (
        <header className="bg-white dark:bg-[#141810] sticky top-0 z-[100] shadow-sm shadow-black/10 dark:shadow-black/30 backdrop-blur-sm w-full border-b border-gray-200 dark:border-transparent">
            <div className="w-full px-4 py-2">
                <div className="flex items-center justify-between">
                    {/* Logo & Title */}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleExit}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title="Go to Dashboard"
                        >
                            <Home className="w-5 h-5 text-gray-700 dark:text-white" />
                        </button>
                        <div className="flex flex-col">
                            <span className="text-h3 font-black tracking-tighter leading-none text-gray-900 dark:text-white">
                                CV<span className="text-lime-500">CIRCLE</span>
                            </span>
                            <span className="text-small uppercase tracking-[0.2em] font-bold text-lime-500/60 leading-none mt-1">
                                Interview Coach
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                            title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {resolvedTheme === 'dark' ? (
                                <Sun className="w-5 h-5 text-yellow-500" />
                            ) : (
                                <Moon className="w-5 h-5 text-gray-600" />
                            )}
                        </button>

                        {/* Notifications */}
                        <NotificationCenter />

                        {/* User Avatar */}
                        {userData && (
                            <UserAvatar
                                name={getUserDisplayName(userData)}
                                src={getUserAvatar(userData)}
                                size="sm"
                            />
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default InterviewCoachHeader;
