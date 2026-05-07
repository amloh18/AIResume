'use client';

import LinkedInEnhancerContainer from '@/components/linkedin-enhancer/LinkedInEnhancerContainer';
import RouteGuard from '@/components/auth/RouteGuard';

export default function LinkedInEnhancerPage() {
    return (
        <RouteGuard requireAuth={true}>
            <LinkedInEnhancerContainer />
        </RouteGuard>
    );
}
