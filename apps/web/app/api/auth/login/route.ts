import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, upsertUser } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/crypto';
import { createSessionToken, setSessionCookie } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

// Built-in seed accounts fallback for instant access / bootstrap
const DEFAULT_FALLBACK_STAFF = [
  {
    userId: 'USR-ADMIN-01',
    email: 'admin@prahari.gov.in',
    password: 'Admin@123',
    name: 'Chief Admin Officer',
    role: 'admin' as const,
    department: 'Ministry of Tourism & Home Affairs',
    badge: 'ADM-001',
    phone: '+91 98000 00001',
  },
  {
    userId: 'USR-AUTH-01',
    email: 'officer.sharma@police.gov.in',
    password: 'Officer@123',
    name: 'Inspector Vikram Sharma',
    role: 'authority' as const,
    department: 'District Police Control Room',
    badge: 'AUTH-109',
    phone: '+91 98000 00109',
  },
  {
    userId: 'USR-RESP-17',
    email: 'unit17@dispatch.gov.in',
    password: 'Unit17@123',
    name: 'Unit #17 Patrol Lead',
    role: 'responder' as const,
    entityId: 'Unit #17',
    department: 'Emergency Quick Response Team',
    badge: 'QRT-017',
    phone: '+91 98765 00017',
  },
];

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

    // 1. Look up user in database
    let user = await getUserByEmail(normalizedEmail);

    // 2. If not found in DB, check fallback staff list (bootstrap mode)
    if (!user) {
      const fallback = DEFAULT_FALLBACK_STAFF.find(
        (s) => s.email.toLowerCase() === normalizedEmail
      );

      if (fallback && fallback.password === password) {
        // Auto-seed into DB if possible
        const { hash, salt } = hashPassword(fallback.password);
        const seededUser = {
          userId: fallback.userId,
          email: fallback.email,
          passwordHash: hash,
          salt,
          name: fallback.name,
          role: fallback.role,
          entityId: fallback.entityId ?? null,
          department: fallback.department,
          badge: fallback.badge,
          phone: fallback.phone,
          active: true,
        };
        await upsertUser(seededUser).catch(() => {});
        user = seededUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // 3. Verify password against the stored hash. The fallback list is only
    //    used to bootstrap a not-yet-seeded account above; once a user exists
    //    in the database, its stored password is the sole authority.
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

    // 4. Create session token
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
      token: sessionToken,
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
