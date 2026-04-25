import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Tenant from '@/models/b2b/Tenant';
import B2BCandidate from '@/models/b2b/B2BCandidate';
import { log } from '@/lib/edge-logger';
import { getS3Client } from '@/lib/s3-client';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { isS3Url, extractS3KeyFromUrl } from '@/lib/utils/s3-utils';

// Vercel cron or manual trigger with Authorization header
export async function GET(req: NextRequest) {
  try {
    // Verify cron secret if deployed to Vercel
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    // Find all active tenants to check their retention policies
    const tenants = await Tenant.find({ isActive: true }).lean();
    let totalDeleted = 0;
    
    let s3Client = null;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    try {
      if (bucketName) {
        s3Client = getS3Client();
      }
    } catch (e: any) {
      log.error('Retention cron: Failed to initialize S3 client', e);
    }

    for (const tenant of tenants) {
      const retentionDays = tenant.settings?.dataRetentionDays || 30;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // Find candidates to delete to also clean up S3
      const candidatesToDelete = await B2BCandidate.find({
        tenantId: tenant._id,
        createdAt: { $lt: cutoffDate }
      }).select('_id resumeUrl').lean();

      if (candidatesToDelete.length > 0) {
        // Delete files from S3
        if (s3Client && bucketName) {
          for (const candidate of candidatesToDelete) {
            if (candidate.resumeUrl && isS3Url(candidate.resumeUrl)) {
              try {
                const s3Key = extractS3KeyFromUrl(candidate.resumeUrl);
                if (s3Key) {
                  await s3Client.send(new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: s3Key
                  }));
                }
              } catch (s3Err: any) {
                log.error('Retention cron: Failed to delete resume from S3', s3Err, { candidateId: candidate._id });
              }
            }
          }
        }

        // Now delete from DB
        const result = await B2BCandidate.deleteMany({
          tenantId: tenant._id,
          createdAt: { $lt: cutoffDate }
        });

        log.info(`B2B Retention Policy Applied for Tenant ${tenant.name}`, {
          tenantId: tenant._id,
          retentionDays,
          deletedCount: result.deletedCount
        });
        totalDeleted += result.deletedCount;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Retention policy executed successfully. Deleted ${totalDeleted} candidates.` 
    });
  } catch (error: any) {
    log.error('Error executing B2B retention cron', error);
    return NextResponse.json({ error: 'Failed to execute retention policy', details: error.message }, { status: 500 });
  }
}
