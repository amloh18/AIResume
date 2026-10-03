import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-helpers';
import {
  createQueuedGenerationState,
  getJourneyGenerationEntitlement
} from '@/lib/utils/journey-generation';

export async function GET() {
  try {
    const authResult = await getAuthenticatedUser();

    if (!authResult?.userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const entitlement = await getJourneyGenerationEntitlement(authResult.userId);
    const preview = createQueuedGenerationState(entitlement);

    return NextResponse.json({
      success: true,
      preview,
      entitlementReasonCode: entitlement.reasonCode
    });
  } catch (error) {
    console.error('Tracker generation preview API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load tracker generation preview' },
      { status: 500 }
    );
  }
}
