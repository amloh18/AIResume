import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { MyJwtPayload } from '@/types/jwt-payload';
import { getConnection } from '@/lib/database';
import { getAdminInvoice } from '@/models/admin-models';
import { getAdminSubscription } from '@/models/admin-models';
import { getAdminUser } from '@/models/admin-models';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication using cookie
    const cookieStore = await cookies();
    const adminToken = cookieStore.get('admin-token');

    if (!adminToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin access required.' },
        { status: 401 }
      );
    }

    try {
      jwt.verify(adminToken.value, process.env.NEXTAUTH_SECRET || 'fallback-secret') as MyJwtPayload;
    } catch (jwtError) {
      return NextResponse.json(
        { success: false, error: 'Invalid admin token' },
        { status: 401 }
      );
    }

    await getConnection();
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const Subscription = await getAdminSubscription();
    const Invoice = await getAdminInvoice();
    const User = await getAdminUser();

    // Find user's active subscription
    const subscription = await Subscription.findOne({
      userId,
      status: 'active'
    })
      .populate('planId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found for this user' },
        { status: 404 }
      );
    }

    // Check if invoice already exists
    const existingInvoice = await Invoice.findOne({
      userId,
      planId: subscription.planId,
      status: 'paid'
    }).lean();

    if (existingInvoice) {
      return NextResponse.json({
        success: true,
        message: 'Invoice already exists',
        invoiceUrl: existingInvoice.metadata?.invoiceUrl || subscription.metadata?.invoiceUrl,
        invoice: existingInvoice
      });
    }

    // Create new invoice
    const invoice = new Invoice({
      userId,
      planId: subscription.planId,
      amount: subscription.finalAmount || subscription.amount,
      currency: subscription.currency || 'INR',
      status: 'paid',
      planName: subscription.planId?.name || 'Unknown Plan',
      billingCycle: subscription.billingCycle,
      paidAt: subscription.createdAt || new Date(),
      dueDate: subscription.endDate || new Date(),
      description: `Invoice for ${subscription.planId?.name || 'subscription'} plan`,
      metadata: {
        subscriptionId: subscription._id,
        paymentMethod: subscription.paymentMethod,
        invoiceUrl: subscription.metadata?.invoiceUrl
      }
    });

    await invoice.save();

    // TODO: Send invoice email to user
    // This would integrate with your email service

    return NextResponse.json({
      success: true,
      message: 'Invoice generated successfully',
      invoice: invoice,
      invoiceUrl: subscription.metadata?.invoiceUrl || invoice.metadata?.invoiceUrl
    });
  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

