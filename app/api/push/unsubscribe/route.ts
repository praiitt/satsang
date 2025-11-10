import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint to remove push notification subscription.
 * This removes the subscription from your database or storage.
 */
export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription is required' }, { status: 400 });
    }

    // TODO: Remove subscription from your database
    // Example:
    // await db.pushSubscriptions.delete({
    //   endpoint: subscription.endpoint,
    // });

    console.log('[Push API] Unsubscribe received:', {
      endpoint: subscription.endpoint,
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription removed successfully',
    });
  } catch (error) {
    console.error('[Push API] Error removing subscription:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
