import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySessionCookieValue, createSessionCookieValue, SESSION_COOKIE, type AppSession } from '@/lib/session';
import { puedeGestionarVinculacion, puedeSupervisarVinculacion, puedeGestionarInvestigacion } from '@/lib/modulos';

// Expiración "sliding": reemite la cookie con maxAge completo (8h, ver
// lib/session.ts) en cada request autenticado que pasa por el middleware —
// así el usuario se mantiene logueado mientras siga visitando el Portal al
// menos una vez cada 8 horas, en vez de expirar a fecha fija desde el login.
async function conSesionRenovada(response: NextResponse, session: AppSession): Promise<NextResponse> {
  const cookieValue = await createSessionCookieValue(session);
  response.cookies.set({
    name: SESSION_COOKIE.name,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE.maxAge,
    path: '/',
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren estar autenticado (Portal unificado).
  // OJO: '/vinculacion/dinamicas-linguisticas' es contenido publico (nunca requirio login)
  // y '/registro' es la pagina de alta de cuenta — no puede exigir sesion previa.
  const protectedRoutes = [
    '/portal/dashboard',
    '/portal/perfil',
    '/portal/subir-video',
    '/portal/mi-avance',
    '/vinculacion/dinamicas-linguisticas/asistencia',
    '/vinculacion/espacios',
    '/vinculacion/asistencia',
    '/vinculacion/registrar-evaluar',
    '/vinculacion/pasantes',
    '/vinculacion/supervisar',
    '/vinculacion/difusion',
    '/vinculacion/evaluacion-final',
    '/vinculacion/encuesta',
    '/vinculacion/investigacion-actividades',
    '/investigacion/espacios',
    '/investigacion/informes',
    '/gestion-carrera',
    '/pine-dashboard',
    '/contribuciones',
    '/utilidades',
    '/superadmin',
  ];

  // Whitelist de emails para /superadmin — mismo hardcode que
  // lib/superadmin-auth.ts (no se puede importar Node/@neondatabase acá
  // porque el middleware corre en Edge runtime; se duplica a propósito,
  // ambos deben mantenerse en sync).
  const SUPERADMIN_EMAILS = ['arturo.rodriguez@uleam.edu.ec'];

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
       pathname.startsWith('/vinculacion/registrar-evaluar') ||
       pathname.startsWith('/vinculacion/evaluacion-final') ||
       pathname.startsWith('/vinculacion/encuesta')) &&
      !['profesor', 'admin', 'estudiante'].includes(session.rol)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Gestión (crear espacios, administrar pasantes): solo líder de Vinculación / superadmin.
    if (
      (pathname.startsWith('/vinculacion/pasantes') || pathname.startsWith('/vinculacion/espacios')) &&
      !puedeGestionarVinculacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/vinculacion/supervisar') &&
      !puedeSupervisarVinculacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/portal/subir-video') &&
      !['profesor', 'admin'].includes(session.rol) &&
      !(session.rol === 'estudiante' && session.modulos_acceso.includes('subir_video'))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/vinculacion/investigacion-actividades') &&
      !(session.rol === 'estudiante' && session.modulos_acceso.includes('investigacion'))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/investigacion/espacios') && !puedeGestionarInvestigacion(session)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (
      pathname.startsWith('/investigacion/informes') &&
      !puedeGestionarInvestigacion(session)
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/gestion-carrera') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    if (pathname.startsWith('/pine-dashboard') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Listado y wizard de contribuciones: cualquier docente autenticado.
    // Borrar sigue siendo solo admin (DELETE en app/api/contribuciones).
    if (pathname === '/contribuciones' && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (pathname.startsWith('/contribuciones/new') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Utilidades: generadores de documentos (Acta Técnica, Oficios, Convocatorias,
    // PAT Maestría, Pares Lectores) — abierto a cualquier docente, no ligado a modulos_acceso.
    if (pathname.startsWith('/utilidades') && !['profesor', 'admin'].includes(session.rol)) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    // Superadmin: acceso absoluto a la Neon (explorador de tablas + SQL crudo).
    // Doble candado — modulos_acceso Y email hardcodeado — ver lib/superadmin-auth.ts.
    if (
      pathname.startsWith('/superadmin') &&
      (!session.modulos_acceso.includes('superadmin') || !SUPERADMIN_EMAILS.includes(session.email))
    ) {
       return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }

    return conSesionRenovada(NextResponse.next(), session);
  }

  // Panel admin legacy (gestion de contenido estatico del sitio) — ahora vive
  // bajo la misma sesion unificada del Portal, requiere modulo 'contenido_sitio'
  // (distinto de 'admin', que solo controla /pine-dashboard). Restringido a
  // lider/colider de este proyecto especifico.
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const session = await verifySessionCookieValue(request.cookies.get(SESSION_COOKIE.name)?.value);
    // /admin/roles (asignar módulos a cada persona) exige además el módulo 'admin'.
    if (session && pathname.startsWith('/admin/roles') && !session.modulos_acceso.includes('admin')) {
      return NextResponse.redirect(new URL('/portal/dashboard', request.url));
    }
    if (!session || !session.modulos_acceso.includes('contenido_sitio')) {
      const loginUrl = new URL('/portal/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return conSesionRenovada(NextResponse.next(), session);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|images|files).*)'],
};
