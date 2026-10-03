import { NextRequest, NextResponse } from 'next/server';
import { campaignTemplates, getCampaignTemplateById } from '@/lib/campaign-templates';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const scenario = searchParams.get('scenario');
    const search = searchParams.get('search');

    let filteredTemplates = [...campaignTemplates];

    if (category && category !== 'all') {
      filteredTemplates = filteredTemplates.filter(t => t.category === category);
    }

    if (scenario) {
      filteredTemplates = filteredTemplates.filter(t => t.scenario === scenario);
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredTemplates = filteredTemplates.filter(t =>
        t.name.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower) ||
        t.scenario.toLowerCase().includes(searchLower)
      );
    }

    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      total: filteredTemplates.length
    });

  } catch (error: any) {
    console.error('Campaign templates API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

