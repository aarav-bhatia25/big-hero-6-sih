import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/auth/session';

export async function GET(request: NextRequest) {
  const session = getSessionFromRequest(request);

  if (!session) {
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: session.userId,
      role: session.role,
      name: session.name,
      email: session.email,
      touristId: session.touristId,
      did: session.did,
      department: session.department,
      badge: session.badge,
      expiresAt: session.exp ? new Date(session.exp * 1000).toISOString() : null,
    },
  });
}
