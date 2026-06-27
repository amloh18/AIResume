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
    return <LinkedInEnhancementFlow />;
}
