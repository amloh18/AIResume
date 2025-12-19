export async function logResumeEnhancerEvent(params: {
  action: string;
  resourceType?: 'cv' | 'journey' | 'job' | 'cover_letter';
  resourceId?: string;
  resourceName?: string;
  metadata?: Record<string, any>;
}) {
  try {
    // Fire-and-forget logging; never block UX
    await fetch('/api/activity-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
  } catch {
    // ignore
  }
}







