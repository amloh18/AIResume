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
            {/* Before/After Profile Strength */}
            <ProfileStrengthCard />

            {/* Dynamic Sections Checklist */}
            <ProfileChecklistCard />
        </div>
    );
}
