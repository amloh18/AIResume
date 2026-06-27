import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import Coupon from '@/models/Coupon';
import PolarService from '@/lib/payment/polar';

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const codeFilter = searchParams.get('code');

    // Sync from Polar
    try {
      const polarRes = await PolarService.listDiscounts();
      if (polarRes.success && polarRes.discounts) {
        for (const polarDiscount of polarRes.discounts) {
          if (polarDiscount.code) {
            const existing = await Coupon.findOne({ code: polarDiscount.code });
            if (!existing) {
              const val = polarDiscount.type === 'percentage' ? polarDiscount.amount : (polarDiscount.amount / 100);
              await Coupon.create({
                code: polarDiscount.code,
                name: polarDiscount.name,
                discountType: polarDiscount.type === 'percentage' ? 'percentage' : 'fixed',
                discountValue: val,
                isActive: true,
                providerId: polarDiscount.id,
                provider: 'polar'
              });
            }
          }
        }
      }
    } catch (polarError) {
      console.error('Failed to sync discounts from Polar during GET:', polarError);
    }

    // Build query
    const query: any = {};
    if (!includeInactive) {
      query.isActive = true;
    }
    if (codeFilter) {
      query.code = { $regex: codeFilter, $options: 'i' };
    }

    // Fetch coupons (unified model)
    const coupons = await Coupon.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(coupons);

  } catch (error: any) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch coupons', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();

    // Create discount in Polar
    try {
      const polarRes = await PolarService.createDiscount({
        name: body.name || body.code,
        code: body.code,
        duration: body.duration || 'once',
        type: body.discountType === 'percentage' ? 'percentage' : 'fixed',
        amount: body.discountValue,
        currency: body.currency || 'USD'
      });
      if (polarRes.success && polarRes.discount) {
        body.providerId = polarRes.discount.id;
        body.provider = 'polar';
      }
    } catch (polarError) {
      console.error('Failed to sync discount creation to Polar:', polarError);
    }

    // Create new coupon
    const coupon = new Coupon(body);
    await coupon.save();

    return NextResponse.json(
      { success: true, coupon },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create coupon', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await getConnection();

    const { codeId, ...updateData } = await request.json();

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Update coupon
    const coupon = await Coupon.findByIdAndUpdate(
      codeId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, coupon });

  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update coupon', details: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'Code ID is required' },
        { status: 400 }
      );
    }

    // Fetch coupon to check provider id
    const coupon = await Coupon.findById(codeId);
    if (coupon && coupon.provider === 'polar' && coupon.providerId) {
      try {
        await PolarService.deleteDiscount(coupon.providerId);
      } catch (polarError) {
        console.error('Failed to sync discount deletion to Polar:', polarError);
      }
    }

    // Delete coupon
    const result = await Coupon.findByIdAndDelete(codeId);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Coupon deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting coupon:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete coupon', details: error.message },
      { status: 500 }
    );
  }
}

