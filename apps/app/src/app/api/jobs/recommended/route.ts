/**
 * GET /api/jobs/recommended
 *
 * Returns scored job recommendations from the ingested jobs collection.
 * Supports filtering, pagination, and faceted results.
 *
 * Query params:
 *   page, pageSize, search, sources, seniorities, locations, departments,
 *   remoteOnly, minSalary, sortBy, sortOrder
 */

import { NextRequest, NextResponse } from 'next/server';
import { RecommendedJobsService } from '@/lib/services/recommendedJobsService';
import { authenticateRequest } from '@/lib/utils/auth-helpers-api';

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const auth = await authenticateRequest(request);

    const result = await RecommendedJobsService.getRecommended({
      userId: auth?.userId || undefined,
      page: parseInt(sp.get('page') || '1'),
      pageSize: parseInt(sp.get('pageSize') || '20'),
      search: sp.get('search') || undefined,
      sources: sp.get('sources')?.split(',').filter(Boolean),
      seniorities: sp.get('seniorities')?.split(',').filter(Boolean),
      locations: sp.get('locations')?.split(',').filter(Boolean),
      departments: sp.get('departments')?.split(',').filter(Boolean),
      remoteOnly: sp.get('remoteOnly') === 'true',
      minSalary: sp.get('minSalary') ? parseInt(sp.get('minSalary')!) : undefined,
      sortBy: (sp.get('sortBy') as any) || 'postedAt',
      sortOrder: (sp.get('sortOrder') as any) || 'desc',
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API] /api/jobs/recommended error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
