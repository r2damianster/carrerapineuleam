import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren estar autenticado (Portal unificado).
  // OJO: '/vinculacion/dinamicas-linguisticas' es contenido publico (nunca requirio login)
  // y '/registro' es la pagina de alta de cuenta — no puede exigir sesion previa.
  const protectedRoutes = [
    '/portal/dashboard',
    '/vinculacion/dinamicas-linguisticas/asistencia',
    '/vinculacion/difusion',
    '/vinculacion/encuesta',
    '/vinculacion/test-mcer',
    '/docencia',
    '/pine-dashboard',
  ];

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);

    if (!session) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // RBAC: Verificación simple de roles por módulo si se desea
    if (pathname.startsWith('/docencia') && !session.modulos_acceso.includes('admin') && !session.modulos_acceso.includes('investigacion')) {
       // Si intenta entrar a docencia sin permisos, se le expulsa al dashboard
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/pine-dashboard') && !session.modulos_acceso.includes('admin')) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  }

  // Panel admin legacy (gestion de contenido estatico del sitio) — ahora vive
  // bajo la misma sesion unificada del Portal, requiere modulo 'admin'.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);
    if (!session || !session.modulos_acceso.includes('admin')) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|files).*)'],
};
