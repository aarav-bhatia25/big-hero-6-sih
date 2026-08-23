import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { notifyEmergencyContacts } from '@/lib/services/emergencyNotifications';

export const dynamic = 'force-dynamic';

/**
 * Sends one explicitly requested, clearly labelled delivery test. This is
 * intentionally staff-only and never uses a real incident's contact list.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['admin', 'authority']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const { email } = await request.json();
    const recipient = String(email ?? '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json({ success: false, error: 'A valid test email address is required.' }, { status: 400 });
    }

    const testId = `NOTIFY-TEST-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const delivery = await notifyEmergencyContacts(
      [{ name: 'Prahari delivery test', relationship: 'Test recipient', email: recipient }],
      testId
    );

    return NextResponse.json({
      success: delivery.status === 'ACCEPTED',
      testId,
      delivery,
    }, { status: delivery.status === 'ACCEPTED' ? 200 : 503 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message ?? 'Notification test failed.' }, { status: 500 });
  }
}
