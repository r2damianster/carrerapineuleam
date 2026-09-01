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
    '/vinculacion/espacios',
    '/vinculacion/asistencia',
    '/vinculacion/beneficiarios',
    '/vinculacion/pasantes',
    '/vinculacion/difusion',
    '/investigacion/espacios',
    '/gestion-carrera',
    '/docencia',
    '/pine-dashboard',
    '/contribuciones',
  ];

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtected) {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);

    if (!session) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (
      (pathname.startsWith('/vinculacion/espacios') ||
       pathname.startsWith('/vinculacion/asistencia') ||
       pathname.startsWith('/vinculacion/beneficiarios')) &&
      !['profesor', 'admin', 'estudiante'].includes(session.rol)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/vinculacion/pasantes') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/investigacion/espacios') && !session.modulos_acceso.includes('investigacion')) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/gestion-carrera') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/pine-dashboard') && !session.modulos_acceso.includes('admin')) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Listado de contribuciones: solo admin. El wizard de registro
    // (/contribuciones/new/*) queda abierto a cualquier docente autenticado.
    if (pathname === '/contribuciones' && !session.modulos_acceso.includes('admin')) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (pathname.startsWith('/contribuciones/new') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
  }

  // Panel admin legacy (gestion de contenido estatico del sitio) — ahora vive
  // bajo la misma sesion unificada del Portal, requiere modulo 'contenido_sitio'
  // (distinto de 'admin', que solo controla /pine-dashboard). Restringido a
  // lider/colider de este proyecto especifico.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);
    if (!session || !session.modulos_acceso.includes('contenido_sitio')) {
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
