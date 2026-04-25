import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { getConnection } from '@/lib/database';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import { log } from '@/lib/edge-logger';
import { getS3Client } from '@/lib/s3-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isS3Url, extractS3KeyFromUrl } from '@/lib/utils/s3-utils';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      await getConnection();
      
      const resolvedParams = await context.params;
      const candidateId = resolvedParams.id;
      
      if (!candidateId) {
        return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
      }

      // Ensure the candidate belongs to the current tenant to prevent IDOR
      const candidate = await B2BCandidate.findOne({ 
        _id: candidateId,
        tenantId: tenant._id 
      });

      if (!candidate) {
        return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
      }

      // Delete resume file from S3 if it exists
      if (candidate.resumeUrl && isS3Url(candidate.resumeUrl)) {
        try {
          const s3Key = extractS3KeyFromUrl(candidate.resumeUrl);
          if (s3Key) {
            let s3Client;
            try {
              s3Client = getS3Client();
            } catch (e: any) {
              log.error('Failed to initialize S3 client for deletion', e);
            }

            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            if (s3Client && bucketName) {
              await s3Client.send(new DeleteObjectCommand({
                Bucket: bucketName,
                Key: s3Key
              }));
              log.info('Deleted candidate resume from S3', { s3Key, candidateId });
            }
          }
        } catch (s3Error: any) {
          log.error('Failed to delete resume from S3', s3Error, { candidateId });
          // We continue with database deletion even if S3 fails
        }
      }

      await B2BCandidate.deleteOne({ _id: candidateId });

      log.info('B2B Candidate deleted for compliance', { 
        candidateId, 
        tenantId: tenant._id 
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Candidate successfully deleted' 
      });
      
    } catch (error: any) {
      log.error('Error deleting B2B candidate', error);
      return NextResponse.json({ error: 'Failed to delete candidate', details: error.message }, { status: 500 });
    }
  });
}

