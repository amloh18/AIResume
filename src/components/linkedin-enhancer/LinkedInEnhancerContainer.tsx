'use client';

import React, { useState } from 'react';
import { LinkedInEnhancerProvider } from '@/contexts/linkedin-enhancer';
import LinkedInEnhancementFlow from './LinkedInEnhancementFlow';
import LinkedInEnhancerDashboard from './LinkedInEnhancerDashboard';

export default function LinkedInEnhancerContainer() {
    return (
        <LinkedInEnhancerProvider>
            <LinkedInEnhancerViewManager />
        </LinkedInEnhancerProvider>
    );
}

function LinkedInEnhancerViewManager() {
    const [view, setView] = useState<'dashboard' | 'flow'>('dashboard');

    if (view === 'dashboard') {
        return <LinkedInEnhancerDashboard onStartEnhancing={(sectionId) => {
            setView('flow');
            if (sectionId) {
                // Use a small timeout to ensure the DOM has rendered the flow
                setTimeout(() => {
                    const el = document.getElementById(`section-${sectionId}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 100);
            }
        }} />;
    }

    return <LinkedInEnhancementFlow onBackToDashboard={() => setView('dashboard')} />;
}
