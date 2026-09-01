import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';

/** Simple auth middleware for API routes.
 *  It expects a session cookie named `sessionToken` that can be used to
 *  fetch the user via the existing `/api/auth/me` endpoint. For the purpose
 *  of this implementation we assume the token is already validated and the
 *  endpoint returns `{ usuario: { rol: string } }`.
 */
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('sessionToken')?.value;
  let role = null;
  if (token) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/auth/me`, {
        headers: { Cookie: `sessionToken=${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        role = data?.usuario?.rol || null;
      }
    } catch (e) {
      // ignore errors – role stays null
    }
  }
  // Forward the role to downstream handlers via a custom header
  const response = NextResponse.next();
  if (role) {
    response.headers.set('x-user-role', role);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*', // apply to all API routes
};
