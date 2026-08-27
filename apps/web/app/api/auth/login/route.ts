import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/crypto';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify password against the stored, provisioned authority account.
    const isPasswordValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    if (user.active === false) {
      return NextResponse.json(
        { success: false, error: 'Account has been deactivated. Contact an administrator.' },
        { status: 403 }
      );
    }

    // Create session token
    const sessionToken = await createSessionToken({
      userId: user.userId,
      role: user.role,
      email: user.email,
      name: user.name,
      entityId: user.entityId ?? undefined,
      department: user.department ?? undefined,
      badge: user.badge ?? undefined,
    });

    const response = NextResponse.json({
      success: true,
      message: `Authenticated successfully as ${user.role}.`,
      user: {
        userId: user.userId,
        email: user.email,
        name: user.name,
        role: user.role,
        department: user.department,
        badge: user.badge,
      },
    });

    // 5. Attach HTTP-only cookie
    setSessionCookie(response, sessionToken);

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
