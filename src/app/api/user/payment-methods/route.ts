import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/database';
import { User, PaymentMethod } from '@/models';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Fetch payment methods
    const paymentMethods = await PaymentMethod.find({ 
      userId: user._id, 
      isActive: true 
    }).sort({ isDefault: -1, createdAt: -1 });

    return NextResponse.json({
      success: true,
      paymentMethods: paymentMethods.map(method => ({
        id: method._id,
        type: method.type,
        provider: method.provider,
        last4: method.last4,
        brand: method.brand,
        expiryMonth: method.expiryMonth,
        expiryYear: method.expiryYear,
        isDefault: method.isDefault,
        email: method.email,
        accountName: method.accountName,
        createdAt: method.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { 
      type, 
      provider, 
      last4, 
      brand, 
      expiryMonth, 
      expiryYear, 
      email, 
      accountName,
      isDefault = false 
    } = body;

    // Validate required fields
    if (!type || !provider) {
      return NextResponse.json(
        { success: false, error: 'Type and provider are required' },
        { status: 400 }
      );
    }

    // If this is being set as default, unset other default payment methods
    if (isDefault) {
      await PaymentMethod.updateMany(
        { userId: user._id, isDefault: true },
        { isDefault: false }
      );
    }

    // Create new payment method
    const paymentMethod = new PaymentMethod({
      userId: user._id,
      type,
      provider,
      last4,
      brand,
      expiryMonth,
      expiryYear,
      email,
      accountName,
      isDefault,
      isActive: true
    });

    await paymentMethod.save();

    return NextResponse.json({
      success: true,
      paymentMethod: {
        id: paymentMethod._id,
        type: paymentMethod.type,
        provider: paymentMethod.provider,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        isDefault: paymentMethod.isDefault,
        email: paymentMethod.email,
        accountName: paymentMethod.accountName,
        createdAt: paymentMethod.createdAt
      }
    });

  } catch (error) {
    console.error('Error adding payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await connectDB();

    // Find user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const paymentMethodId = searchParams.get('id');

    if (!paymentMethodId) {
      return NextResponse.json(
        { success: false, error: 'Payment method ID is required' },
        { status: 400 }
      );
    }

    // Soft delete the payment method
    const result = await PaymentMethod.updateOne(
      { _id: paymentMethodId, userId: user._id },
      { isActive: false }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Payment method not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment method deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting payment method:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}