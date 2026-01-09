import { authenticatedFetch } from '@/lib/utils/apiUtils';

/**
 * Trigger CV match analysis for a job
 * @param job The job to analyze
 * @returns The analysis result or null if failed
 */
export const triggerJobAnalysis = async (job: any) => {
    const jobId = job.id || job._id;
    if (!job.jobDescription || !jobId) return null;

    try {
        const response = await authenticatedFetch('/api/jobs/analyze-cv-match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                jobDescription: job.jobDescription,
                jobTitle: job.jobTitle || job.title,
                company: job.company
            }),
        });

        if (response.ok) {
            const result = await response.json();

            // Update the job with the new score
            const updateResponse = await authenticatedFetch(`/api/jobs/${jobId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    matchScore: result.matchScore,
                    atsScore: result.atsScore // If API returns it
                }),
            });

            if (updateResponse.ok) {
                console.log('✅ Job Analysis - Job updated with match score:', job.id);
            } else {
                console.error('❌ Job Analysis - Failed to update job score:', await updateResponse.text());
            }

            return result;
        }
    } catch (error) {
        console.error('Error triggering job analysis:', error);
    }
    return null;
};
