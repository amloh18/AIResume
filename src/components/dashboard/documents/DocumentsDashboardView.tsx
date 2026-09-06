'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeEnhancer } from '@/contexts/ResumeEnhancerContext';
import Step1Dashboard from '@/components/resume-enhancer/steps/Step1Dashboard';
import { generateCVTitle } from '@/lib/utils/cv-title-generator';
import { extractCvIdFromResponse } from '@/lib/resume-metrics';

/**
 * DocumentsDashboardView — the step-1 documents workspace embedded as a tab in
 * the main Dashboard route. Uses the same Step1Dashboard component as the
 * editor, but completing a new CV here persists it immediately and opens it in
 * the editor's builder (step 3) for further tailoring.
 */
export default function DocumentsDashboardView() {
  const router = useRouter();
  const { state } = useResumeEnhancer();
  const [documentTab, setDocumentTab] = useState<'cvs' | 'cover-letters'>('cvs');

  // Keep latest context state available to the async handler (the CV type is
  // dispatched by Step1Dashboard right before onComplete fires).
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const handleComplete = useCallback(
    async (cvData: any, isExistingCV?: boolean) => {
      if (isExistingCV) return;
      // Let the provider flush SET_CV_TYPE / SET_CV_DATA dispatched by Step1Dashboard
      await new Promise((resolve) => setTimeout(resolve, 0));
      const s = stateRef.current;
      const cvType =
        s.cvType ||
        (s.jdText && s.jdWordCount >= 10 ? 'journey' : s.hasMasterCV ? 'standalone' : 'master');

      try {
        const payload = {
          title: generateCVTitle(cvType, cvData, s.jobData),
          cvData,
          cvType,
          status: 'draft',
          metadata: {
            isMaster: cvType === 'master',
            completionPercentage: 0,
            createdVia: 'documents-tab',
          },
        };
        const res = await fetch('/api/cvs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await res.json().catch(() => ({}));
        const savedCvId = extractCvIdFromResponse(result);
        if (res.ok && savedCvId) {
          router.push(`/editor?mode=edit&cvId=${savedCvId}`);
          return;
        }
        // Fall back to the editor create flow if persistence failed
        router.push('/editor?mode=create&step=1');
      } catch {
        router.push('/editor?mode=create&step=1');
      }
    },
    [router]
  );

  return (
    <div className="w-full h-full min-h-[70vh] text-[#0f172a] dark:text-gray-150 font-sans">
      <Step1Dashboard
        onComplete={handleComplete}
        userHasMasterCV={state.hasMasterCV}
        mode="create"
        isGuestMode={false}
        activeDocumentTab={documentTab}
        onDocumentTabChange={setDocumentTab}
        embedded
      />
    </div>
  );
}