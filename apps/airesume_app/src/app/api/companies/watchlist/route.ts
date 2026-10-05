import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnection } from '@/lib/database';
import CompanyWatchlist from '@/models/CompanyWatchlist';
import { mixedIdFilter } from '@/lib/utils/mixed-id';

/**
 * GET /api/companies/watchlist
 * List all watchlist entries for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const priority = searchParams.get('priority') as 'high' | 'medium' | 'low' | null;

    // `CompanyWatchlist.userId` is `Schema.Types.Mixed` and therefore uncast (SB-06).
    const query: any = { userId: mixedIdFilter(session.user.id) };
    
    if (activeOnly) {
      query.isActive = true;
    }
    
    if (priority) {
      query.priority = priority;
    }

    const watchlist = await CompanyWatchlist.find(query)
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: watchlist,
      count: watchlist.length,
    });
  } catch (error: any) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/companies/watchlist
 * Add a company to the watchlist
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { companyName, domain, industry, atsType, atsBoardUrl, notes, priority } = body;

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length === 0) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Check if already exists
    const normalizedName = companyName.toLowerCase().trim();
    const existing = await CompanyWatchlist.findOne({
      userId: mixedIdFilter(session.user.id),
      normalizedName,
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Company already in watchlist' },
        { status: 409 }
      );
    }

    const watchlistEntry = await CompanyWatchlist.create({
      userId: session.user.id,
      companyName: companyName.trim(),
      normalizedName,
      domain: domain?.trim(),
      industry: industry?.trim(),
      atsType: atsType || 'unknown',
      atsBoardUrl: atsBoardUrl?.trim(),
      notes: notes?.trim(),
      priority: priority || 'medium',
      isActive: true,
      jobsDiscovered: 0,
    });

    return NextResponse.json({
      success: true,
      data: watchlistEntry,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding to watchlist:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Company already in watchlist' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to add company to watchlist' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/companies/watchlist
 * Update a watchlist entry
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const body = await request.json();
    const { id, companyName, domain, industry, atsType, atsBoardUrl, notes, priority, isActive } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Watchlist entry ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (companyName !== undefined) {
      updateData.companyName = companyName.trim();
      updateData.normalizedName = companyName.toLowerCase().trim();
    }
    if (domain !== undefined) updateData.domain = domain?.trim();
    if (industry !== undefined) updateData.industry = industry?.trim();
    if (atsType !== undefined) updateData.atsType = atsType;
    if (atsBoardUrl !== undefined) updateData.atsBoardUrl = atsBoardUrl?.trim();
    if (notes !== undefined) updateData.notes = notes?.trim();
    if (priority !== undefined) updateData.priority = priority;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await CompanyWatchlist.findOneAndUpdate(
      { _id: id, userId: mixedIdFilter(session.user.id) },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: 'Watchlist entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to update watchlist' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/companies/watchlist
 * Remove a company from the watchlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await getConnection();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Watchlist entry ID is required' },
        { status: 400 }
      );
    }

    const deleted = await CompanyWatchlist.findOneAndDelete({
      _id: id,
      userId: mixedIdFilter(session.user.id),
    });

    if (!deleted) {
      return NextResponse.json(
        { error: 'Watchlist entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Company removed from watchlist',
    });
  } catch (error: any) {
    console.error('Error deleting from watchlist:', error);
    return NextResponse.json(
      { error: 'Failed to delete from watchlist' },
      { status: 500 }
    );
  }
}
