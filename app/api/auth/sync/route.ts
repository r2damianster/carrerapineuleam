import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies, createSessionCookieValue, SESSION_COOKIE } from '@/lib/session';

// Re-emite la cookie de sesión con el rol y los módulos actuales de Neon.
// Sin esto, un cambio hecho en /admin/roles no se vería hasta un nuevo login
// (los módulos viajan firmados dentro de la cookie). El dashboard redirige aquí
// cuando detecta que la cookie quedó desactualizada.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const destino = searchParams.get('redirect') || '/portal/dashboard';
  // Solo rutas internas (evita open redirect).
  const rutaSegura = destino.startsWith('/') && !destino.startsWith('//') ? destino : '/portal/dashboard';

  const sesion = await getAppSessionFromCookies();
  if (!sesion) return NextResponse.redirect(new URL('/portal/login', request.url));

  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const [fila] = await sql`SELECT rol, modulos_acceso FROM usuarios WHERE id = ${Number(sesion.id)}`;
  const respuesta = NextResponse.redirect(new URL(rutaSegura, request.url));
  if (!fila) return respuesta;

  const cookieValue = await createSessionCookieValue({
    ...sesion,
    rol: fila.rol,
    modulos_acceso: fila.modulos_acceso || [],
  });
  respuesta.cookies.set({
    name: SESSION_COOKIE.name,
    value: cookieValue,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_COOKIE.maxAge,
    path: '/',
  });
  return respuesta;
}
