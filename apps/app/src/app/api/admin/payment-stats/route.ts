import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { Subscription, Invoice } from '@/models';
import { withAdminAuth } from '@/lib/middleware/admin-auth';

export const GET = withAdminAuth(async (request: NextRequest) => {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const currency = searchParams.get('currency') || 'EUR';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch payment data
    const [subscriptions, invoices] = await Promise.all([
      Subscription.find({
        createdAt: { $gte: startDate },
        status: { $in: ['active', 'paid'] }
      }).lean(),
      Invoice.find({
        createdAt: { $gte: startDate },
        status: 'paid'
      }).lean()
    ]);

    // Calculate stats by payment provider
    let stripeRevenue = 0;
    let stripeTransactions = 0;
    const currencyBreakdownPolar: { [key: string]: number } = {};

    // Process subscriptions
    subscriptions.forEach((sub: any) => {
        const amount = sub.amount || 0;
        const provider = sub.provider || 'polar';
        const subCurrency = sub.currency || 'EUR';

        if (provider === 'polar') {
            stripeRevenue += amount;
            stripeTransactions += 1;
            currencyBreakdownPolar[subCurrency] = (currencyBreakdownPolar[subCurrency] || 0) + amount;
        }
    });

    // Process invoices
    invoices.forEach((invoice: any) => {
        const amount = invoice.amount || 0;
        const provider = invoice.provider || 'polar';
        const invCurrency = invoice.currency || 'EUR';

        if (provider === 'polar') {
            stripeRevenue += amount;
            stripeTransactions += 1;
            currencyBreakdownPolar[invCurrency] = (currencyBreakdownPolar[invCurrency] || 0) + amount;
        }
    });

    const totalRevenue = stripeRevenue;
    const totalTransactions = stripeTransactions;

    const stats = {
        stripe: {
            totalRevenue: stripeRevenue,
            totalTransactions: stripeTransactions,
            averageOrderValue: stripeTransactions > 0 ? stripeRevenue / stripeTransactions : 0,
            currencyBreakdown: currencyBreakdownPolar
        },
        total: {
            revenue: totalRevenue,
            transactions: totalTransactions,
            averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0
        }
    };

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Error fetching payment stats:', error);
    
    // Return empty stats on error rather than fabricated data
    return NextResponse.json({
        stripe: {
            totalRevenue: 0,
            totalTransactions: 0,
            averageOrderValue: 0,
            currencyBreakdown: {}
        },
        total: {
            revenue: 0,
            transactions: 0,
            averageOrderValue: 0
        }
    });
  }
});

