import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { cookies } from 'next/headers';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';
import { puedeGenerarEnlaceDifusion } from '@/lib/permisos-enlace-difusion';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const usuario = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);
  if (!usuario) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  // Sesión 53: se calcula una sola vez aquí (líder/colíder de cualquier proyecto, o los módulos
  // de siempre) — /vinculacion/difusion y /gestion-carrera lo leen en vez de duplicar la lógica.
  let puedeGenerarEnlace = false;
  try {
    const sql = neon(process.env.DATABASE_URL!);
    puedeGenerarEnlace = await puedeGenerarEnlaceDifusion(sql, usuario);
  } catch { /* si falla, se oculta el botón; no debe romper la carga de sesión */ }
  return NextResponse.json({ usuario: { ...usuario, puede_generar_enlace: puedeGenerarEnlace } });
}
