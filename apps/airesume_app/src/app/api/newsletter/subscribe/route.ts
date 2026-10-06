import { NextRequest, NextResponse } from 'next/server';
import { getConnection } from '@/lib/database';
import { getAdminNewsletter } from '@/models/admin-models';

export async function POST(request: NextRequest) {
  try {
    await getConnection();

    const body = await request.json();
    const { email, source = 'footer' } = body;

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Valid email is required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const NewsletterModel = await getAdminNewsletter();
    const existingSubscription = await NewsletterModel.findOne({ email: email.toLowerCase() });
    
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return NextResponse.json(
          { message: 'Email is already subscribed to our newsletter' },
          { status: 200 }
        );
      } else {
        // Reactivate subscription
        existingSubscription.isActive = true;
        existingSubscription.subscribedAt = new Date();
        existingSubscription.source = source;
        await existingSubscription.save();
        
        return NextResponse.json(
          { message: 'Welcome back! Your subscription has been reactivated.' },
          { status: 200 }
        );
      }
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0] : '';

    // Create new subscription
    const newsletter = new NewsletterModel({
      email: email.toLowerCase(),
      source,
      userAgent,
      ipAddress
    });

    await newsletter.save();

    return NextResponse.json(
      { message: 'Successfully subscribed to our newsletter!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await getConnection();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const NewsletterModel = await getAdminNewsletter();
    const subscription = await NewsletterModel.findOne({ 
      email: email.toLowerCase() 
    });

    if (!subscription) {
      return NextResponse.json(
        { subscribed: false, message: 'Email not found' },
        { status: 200 }
      );
    }

    return NextResponse.json({
      subscribed: subscription.isActive,
      subscribedAt: subscription.subscribedAt,
      source: subscription.source
    });
  } catch (error) {
    console.error('Error checking newsletter subscription:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    );
  }
}
