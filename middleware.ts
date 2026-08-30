import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminSessionCookieValue, ADMIN_SESSION_COOKIE } from '@/lib/adminSession';
import { isAdminAuthorized } from '@/lib/db';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect all /admin routes
  if (pathname.startsWith('/admin')) {
    // Allow access to login page
    if (pathname === '/admin/login') {
      return NextResponse.next();
    }

    const session = await verifyAdminSessionCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE.name)?.value);

    if (!session || !isAdminAuthorized(session.email)) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protect /admin-assets folder (static files)
  if (pathname.startsWith('/admin-assets')) {
    const session = await verifyAdminSessionCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE.name)?.value);

    if (!session || !isAdminAuthorized(session.email)) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin-assets/:path*'],
};
