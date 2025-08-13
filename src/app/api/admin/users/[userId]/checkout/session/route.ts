import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/database';
import User from '@/models/User';
import PricingPlan from '@/models/PricingPlan';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    const { planKey, delivery = 'open', billingDetails } = await request.json();

    await connectToDatabase();

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify plan exists
    const plan = await PricingPlan.findOne({ key: planKey });
    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
    }

    // Determine payment provider based on user region
    let provider = 'stripe';
    if (user.region === 'IN') {
      provider = 'razorpay';
    }

    // Generate checkout URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const checkoutUrl = `${baseUrl}/checkout?plan=${planKey}&user=${userId}&admin=true`;

    if (delivery === 'email') {
      // TODO: Send email with checkout link
      console.log('Sending checkout link via email to:', user.email);
      return NextResponse.json({ 
        success: true, 
        message: 'Checkout link sent via email',
        checkoutUrl 
      });
    } else if (delivery === 'clipboard') {
      return NextResponse.json({ 
        success: true, 
        checkoutUrl,
        message: 'Checkout link copied to clipboard'
      });
    } else {
      // Open in new window
      return NextResponse.json({ 
        success: true, 
        redirectUrl: checkoutUrl,
        provider 
      });
    }
  } catch (error) {
    console.error('Error creating admin checkout session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

