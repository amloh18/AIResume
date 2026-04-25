import { NextRequest, NextResponse } from 'next/server';
import { withB2BAuth } from '@/lib/middleware/b2b-auth';
import { getConnection } from '@/lib/database';
import B2BBatch from '@/models/b2b/B2BBatch';
import crypto from 'crypto';
import { robustDocumentParser } from '@/app/api/cv/parse/route';
import { calculateScore } from '@/lib/utils/cv-scoring';
import { KeywordGapAnalysisService } from '@/lib/services/keyword-gap-analysis-service';
import { B2BScoringExplainService } from '@/lib/services/b2b-scoring-explain-service';
import { WebhookDispatcher } from '@/lib/services/b2b-webhook-dispatcher';

export async function POST(req: NextRequest, context: any) {
  return withB2BAuth(req, context, async (req, context, tenant, apiKey) => {
    try {
      const body = await req.json();
      const { items, webhookUrl } = body;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: 'items must be a non-empty array' }, { status: 400 });
      }

      if (items.length > 100) {
        return NextResponse.json({ error: 'batch size exceeds limit of 100 items' }, { status: 400 });
      }

      const batchId = `batch_${crypto.randomBytes(16).toString('hex')}`;
      
      await getConnection();
      
      const targetWebhookUrl = webhookUrl || tenant.settings?.webhookUrl;
      
      const batchDoc = new B2BBatch({
        tenantId: tenant._id,
        batchId,
        status: 'pending',
        totalItems: items.length,
        webhookUrl: targetWebhookUrl
      });
      await batchDoc.save();

      // Trigger background processing asynchronously without awaiting it
      processBatchAsync(batchDoc._id, tenant, items, targetWebhookUrl);

      return NextResponse.json({
        success: true,
        batchId,
        message: 'Batch processing started',
        status: 'pending',
        totalItems: items.length
      });
    } catch (error: any) {
      return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
  }, ['batch']);
}

// Extract background processing logic
async function processBatchAsync(batchDbId: any, tenant: any, items: any[], webhookUrl?: string) {
  try {
    await getConnection();
    const batch = await B2BBatch.findById(batchDbId);
    if (!batch) return;

    batch.status = 'processing';
    await batch.save();

    const results = [];
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      let itemResult: any = { itemId: item.id || `item_${i}` };

      try {
        let cvData = item.cvData;

        // Parsing step
        if (!cvData && item.fileBase64 && item.fileType) {
          const buffer = Buffer.from(item.fileBase64, 'base64');
          const parseResult = await robustDocumentParser(buffer, item.fileType);
          if (parseResult.error) {
            throw new Error(parseResult.error);
          }
          cvData = parseResult.cvData;
          itemResult.parseData = cvData;
        }

        // Scoring step
        if (cvData && (item.action === 'score' || item.action === 'parse_and_score')) {
          let keywordAnalysis = null;
          if (item.jobDescription) {
            keywordAnalysis = await KeywordGapAnalysisService.analyze(cvData, {
              description: item.jobDescription,
              title: item.jobTitle,
              company: item.company
            });
          }
          const scoreResult = calculateScore(cvData, keywordAnalysis);
          
          const analysis_summary = await B2BScoringExplainService.explainScore(
            cvData,
            scoreResult,
            { description: item.jobDescription, title: item.jobTitle, company: item.company },
            keywordAnalysis
          );
          
          itemResult.scoreData = {
            ...scoreResult,
            analysis_summary
          };
        }

        itemResult.status = 'success';
        processed++;
      } catch (err: any) {
        itemResult.status = 'error';
        itemResult.error = err.message || 'Processing failed';
        failed++;
      }

      results.push(itemResult);
      
      // Save intermediate progress periodically
      if (i % 10 === 0 || i === items.length - 1) {
        batch.processedItems = processed;
        batch.failedItems = failed;
        batch.results = results;
        await batch.save();
      }
    }

    batch.status = 'completed';
    batch.processedItems = processed;
    batch.failedItems = failed;
    batch.results = results;
    await batch.save();

    // Dispatch webhook if registered
    if (webhookUrl && tenant.settings?.webhookSecret) {
      await WebhookDispatcher.dispatch(
        webhookUrl,
        tenant.settings.webhookSecret,
        'batch.completed',
        {
          batchId: batch.batchId,
          status: batch.status,
          totalItems: batch.totalItems,
          processedItems: batch.processedItems,
          failedItems: batch.failedItems,
          results: batch.results
        }
      );
    }
  } catch (err) {
    console.error(`Batch processing failed for ID ${batchDbId}:`, err);
    try {
      await B2BBatch.findByIdAndUpdate(batchDbId, {
        status: 'failed'
      });
      // Try to send failed webhook
      if (webhookUrl && tenant.settings?.webhookSecret) {
        const failedBatch = await B2BBatch.findById(batchDbId);
        await WebhookDispatcher.dispatch(
          webhookUrl,
          tenant.settings.webhookSecret,
          'batch.failed',
          {
            batchId: failedBatch.batchId,
            status: 'failed',
            totalItems: failedBatch.totalItems,
            processedItems: failedBatch.processedItems,
            failedItems: failedBatch.failedItems
          }
        );
      }
    } catch (updateErr) {
      console.error('Failed to update batch status to failed:', updateErr);
    }
  }
}
