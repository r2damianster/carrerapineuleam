import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { obtenerFotosDeUbicacion } from '@/lib/fotosPublicas';
import { puedeAdministrarSitio } from '@/lib/permisosProyecto';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ubicacion = searchParams.get('ubicacion');
    const incluirTodas = searchParams.get('all') === 'true';

    // GET público (con topes) — cache desactivado explícitamente (bug Sesión 31)
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    // ?all=true ya no es público — requiere administración del sitio.
    // El admin usa /api/photos/banco (WP4). Este path queda por compatibilidad transitoria
    // hasta que /admin/photos se reescriba en WP8.
    if (incluirTodas) {
      const sesion = await getAppSessionFromCookies();
      if (!sesion || !puedeAdministrarSitio(sesion)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const rows = await sql`
        SELECT * FROM fotos ORDER BY "order" ASC, created DESC
      `;
      return NextResponse.json(rows);
    }

    // GET con ubicacion → aplica topes y gate de fuente aprobada
    if (ubicacion) {
      const fotos = await obtenerFotosDeUbicacion(sql, ubicacion);
      return NextResponse.json(fotos);
    }

    // GET sin parámetros → [] (no volcar toda la tabla al público)
    return NextResponse.json([]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { url, cloudinary_public_id, titulo, descripcion, ubicaciones, order, posicion } = await request.json();
    if (!url) {
      return NextResponse.json({ error: 'Falta la URL de la foto' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const id = `foto_${Date.now()}`;
    const posicionValida = Number.isFinite(posicion) ? Math.min(100, Math.max(0, Math.round(posicion))) : 50;
    const [nueva] = await sql`
      INSERT INTO fotos (id, url, cloudinary_public_id, titulo, descripcion, ubicaciones, "order", subido_por, posicion)
      VALUES (${id}, ${url}, ${cloudinary_public_id || null}, ${titulo || null}, ${descripcion || null}, ${ubicaciones || []}, ${order ?? 0}, ${usuario.email}, ${posicionValida})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
