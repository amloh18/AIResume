import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware/admin-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET  /api/admin/ai-settings → current model config + recent AI usage stats
 * PUT  /api/admin/ai-settings → update model config (invalidates cache)
 *
 * Backed by the AdminAISettings singleton via aiModelConfigService, which every
 * AI call resolves through (see ai-router). Updates take effect on the next AI
 * call — no redeploy.
 */

const ALLOWED_UPDATES = ['primaryModel', 'fastModel', 'overridePerCallModels', 'useOllama', 'defaultTemperature'] as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const { getAIModelConfig } = await import('@/lib/services/aiModelConfigService');
    const { getAIUsageStats } = await import('@/lib/services/adminStatsService');

    const [config, usage] = await Promise.all([getAIModelConfig(), getAIUsageStats()]);

    return NextResponse.json({
      success: true,
      config,
      usage,
      envModel: process.env.GEMINI_MODEL || null,
    });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin AI Settings GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin(request);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATES) {
      if (body[field] !== undefined) updates[field] = body[field];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
    }

    const { updateAIModelConfig } = await import('@/lib/services/aiModelConfigService');
    const config = await updateAIModelConfig(updates as any, (session.user as any)?.email);

    console.log(`[Admin AI Settings] ${(session.user as any)?.email} updated:`, Object.keys(updates).join(', '));
    return NextResponse.json({ success: true, config });
  } catch (error: any) {
    if (error?.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (error?.message === 'FORBIDDEN') {
      return NextResponse.json({ error: 'Admin permission required' }, { status: 403 });
    }
    console.error('[Admin AI Settings PUT] Error:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
