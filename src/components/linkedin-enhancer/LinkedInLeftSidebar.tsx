'use client';

import React from 'react';
import { useLinkedInEnhancer } from '@/contexts/linkedin-enhancer';
import ProfileStrengthCard from './ProfileStrengthCard';
import ProfileChecklistCard from './ProfileChecklistCard';

interface LinkedInLeftSidebarProps {
    userProfileImage: string | null;
}

export default function LinkedInLeftSidebar({ userProfileImage }: LinkedInLeftSidebarProps) {
    const { state } = useLinkedInEnhancer();
    const heroData = state.sections.hero.current;

    return (
        <div className="space-y-4">
            {/* User Profile Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 mb-4">
                        {userProfileImage || heroData.photoUrl ? (
                            <img
                                src={userProfileImage || heroData.photoUrl}
                                alt={heroData.name || 'User'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                                {(heroData.name || 'U').charAt(0)}
                            </div>
                        )}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">{heroData.name || 'Your Profile'}</h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{heroData.headline || 'No headline available'}</p>
                </div>
            </div>

            {/* Before/After Profile Strength */}
            <ProfileStrengthCard />

            {/* Dynamic Sections Checklist */}
            <ProfileChecklistCard />
        </div>
    );
}
