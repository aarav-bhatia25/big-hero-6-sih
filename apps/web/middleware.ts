import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from '@/lib/auth/session';

// Paths that require specific roles
const ROLE_ROUTE_MAP: Record<string, string[]> = {
  '/authority': ['admin', 'authority'],
  '/citizen': ['tourist', 'authority', 'admin'],
  '/tourist': ['tourist', 'authority', 'admin'],
  '/sos': ['tourist', 'authority', 'admin'],
  '/dashboard': ['admin', 'authority', 'responder', 'tourist'],
  '/dir': ['admin', 'authority', 'responder', 'tourist'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin and authority had duplicate interfaces. The one command console is
  // now Authority; keep legacy URLs working without presenting a second role.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return NextResponse.redirect(new URL('/authority', request.url));
  }

  // 1. Skip static assets, _next, favicon, and API routes (API routes have their own requireAuth guards)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // 2. Extract and verify session cookie
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;

  // 3. Handle /login page: if already logged in, redirect to appropriate home
  if (pathname === '/login') {
    if (session) {
      if (session.role === 'admin' || session.role === 'authority') {
        return NextResponse.redirect(new URL('/authority', request.url));
      }
      return NextResponse.redirect(new URL('/citizen', request.url));
    }
    return NextResponse.next();
  }

  // 4. Check if current route is protected
  const protectedPrefix = Object.keys(ROLE_ROUTE_MAP).find(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (protectedPrefix) {
    const allowedRoles = ROLE_ROUTE_MAP[protectedPrefix];

    if (!session) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (!allowedRoles.includes(session.role)) {
      // Authenticated but unauthorized role for this page
      if (session.role === 'tourist') {
        return NextResponse.redirect(new URL('/citizen', request.url));
      }
      if (session.role === 'responder') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/login?error=forbidden', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public images/assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
