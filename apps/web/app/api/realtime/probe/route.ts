import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guards';
import { emitToGateway } from '@/lib/services/gatewayEmit';

export const dynamic = 'force-dynamic';

/**
 * Proves the complete server → Supabase Realtime → browser delivery path.
 * It is staff-only, writes no operational data, and sends an opaque nonce that
 * the subscribing dashboard must receive before it claims instant updates.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request, ['authority', 'admin']);
  if (auth.errorResponse) return auth.errorResponse;

  const body = await request.json().catch(() => ({}));
  const nonce = typeof body.nonce === 'string' ? body.nonce : '';
  if (!/^[a-zA-Z0-9_-]{8,120}$/.test(nonce)) {
    return NextResponse.json({ success: false, error: 'A valid realtime probe nonce is required.' }, { status: 400 });
  }

  const delivery = await emitToGateway('realtime:probe', {
    nonce,
    sentAt: new Date().toISOString(),
  });

  return NextResponse.json({ success: delivery.accepted, delivery });
}
