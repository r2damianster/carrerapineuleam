import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { esDocente } from '@/lib/modulos';
import { obtenerFotosDeUbicacion } from '@/lib/fotosPublicas';
import { puedeAdministrarSitio, proyectosGestionables } from '@/lib/permisosProyecto';

export const dynamic = 'force-dynamic';

// GET público: devuelve las fotos publicables de UNA ubicación, ya con el tope
// (fotos_ubicaciones.max_fotos) y el relleno automático aplicados. Misma forma de
// respuesta de siempre (arreglo de filas de `fotos`), así los componentes públicos
// (PhotoCarousel, ActivityGallery, EnglishClubSection, RedLEAGaleria) no cambian.
// Sin `ubicacion` → [] (ya no se vuelca toda la tabla al público).
// `?all=true` dejó de ser público: ahora es solo para administración del sitio.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const incluirTodas = searchParams.get('all') === 'true';
    const ubicacion = searchParams.get('ubicacion');

    // GET público, no llama cookies() en el camino normal -> Next lo trataría
    // como estático y el Data Cache de @neondatabase/serverless cachearía
    // la query para siempre (bug real ya mordido en Sesión 31, ver
    // CLAUDE.md). cache:'no-store' lo desactiva explícitamente.
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });

    if (incluirTodas) {
      const sesion = await getAppSessionFromCookies();
      if (!sesion || !puedeAdministrarSitio(sesion)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
      }
      const filas = await sql`SELECT * FROM fotos ORDER BY "order" ASC, created DESC`;
      return NextResponse.json(filas);
    }

    if (!ubicacion) return NextResponse.json([]);
    return NextResponse.json(await obtenerFotosDeUbicacion(sql, ubicacion));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: crear una foto directamente (subida del admin o de un líder/colíder).
// Administración del sitio: cualquier proyecto/ubicación. Líder/colíder: solo `proyectos`
// que gestiona y solo ubicaciones de esos proyectos. El servidor NO confía en `origen`,
// `menores` ni `visibilidad` del cliente: los fuerza aquí.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    if (!esDocente(usuario)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const cuerpo = await request.json();
    const {
      url, cloudinary_public_id, titulo, descripcion, order, posicion,
      ubicaciones: ubicacionesPedidas, proyectos: proyectosPedidos, hay_menores,
    } = cuerpo;
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Falta la URL de la foto' }, { status: 400 });
    }
    if (typeof hay_menores !== 'boolean') {
      return NextResponse.json({ error: 'Debes declarar si aparecen menores de edad (hay_menores).' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const esAdmin = puedeAdministrarSitio(usuario);

    const proyectos: string[] = Array.isArray(proyectosPedidos)
      ? Array.from(new Set(proyectosPedidos.filter((valor: unknown): valor is string => typeof valor === 'string')))
      : [];
    const ubicaciones: string[] = Array.isArray(ubicacionesPedidas)
      ? Array.from(new Set(ubicacionesPedidas.filter((valor: unknown): valor is string => typeof valor === 'string')))
      : [];

    // Proyectos: deben existir y (si no es admin) estar entre los que gestiona.
    if (!esAdmin && proyectos.length === 0) {
      return NextResponse.json({ error: 'Debes indicar al menos un proyecto.' }, { status: 400 });
    }
    if (proyectos.length > 0) {
      const existentes = await sql`SELECT id FROM proyectos WHERE id = ANY(${proyectos}::text[]) AND activo = true`;
      if (existentes.length !== proyectos.length) {
        return NextResponse.json({ error: 'Alguno de los proyectos no existe o está inactivo.' }, { status: 400 });
      }
    }
    if (!esAdmin) {
      const gestionables = new Set((await proyectosGestionables(sql, usuario)).map(proyecto => proyecto.id));
      const ajeno = proyectos.find(proyecto => !gestionables.has(proyecto));
      if (ajeno) return NextResponse.json({ error: `No puedes asignar el proyecto "${ajeno}".` }, { status: 403 });
    }

    // Ubicaciones: existen, activas, y (si no es admin) de proyectos que gestiona y nunca solo_admin.
    const menores = hay_menores ? 'si' : 'no';
    const visibilidad = hay_menores ? 'interna' : 'publicable';
    let ubicacionesFinales = ubicaciones;
    if (hay_menores) {
      ubicacionesFinales = []; // con menores NUNCA se publica
    } else if (ubicaciones.length > 0) {
      const catalogo = await sql`
        SELECT slug, proyecto_id, solo_admin FROM fotos_ubicaciones WHERE slug = ANY(${ubicaciones}::text[]) AND activo = true
      `;
      if (catalogo.length !== ubicaciones.length) {
        return NextResponse.json({ error: 'Alguna ubicación no existe o está inactiva.' }, { status: 400 });
      }
      if (!esAdmin) {
        const gestionables = new Set((await proyectosGestionables(sql, usuario)).map(proyecto => proyecto.id));
        for (const fila of catalogo) {
          if (fila.solo_admin || !fila.proyecto_id || !gestionables.has(fila.proyecto_id) || !proyectos.includes(fila.proyecto_id)) {
            return NextResponse.json({ error: `No puedes publicar en la ubicación "${fila.slug}".` }, { status: 403 });
          }
        }
      }
    }

    const id = `foto_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const posicionValida = Number.isFinite(posicion) ? Math.min(100, Math.max(0, Math.round(posicion))) : 50;
    const [nueva] = await sql`
      INSERT INTO fotos (id, url, cloudinary_public_id, titulo, descripcion, ubicaciones, "order", subido_por, subido_por_id,
                         posicion, origen, proyectos, menores, visibilidad, activo)
      VALUES (${id}, ${url}, ${cloudinary_public_id || null}, ${titulo || null}, ${descripcion || null}, ${ubicacionesFinales},
              ${Number.isFinite(order) ? Math.round(order) : 0}, ${usuario.email}, ${Number(usuario.id)},
              ${posicionValida}, ${esAdmin ? 'admin' : 'lider'}, ${proyectos}, ${menores}, ${visibilidad}, ${!hay_menores})
      RETURNING *
    `;
    return NextResponse.json(nueva, { status: 201 });
  } catch (error: any) {
    if (error.code === '23514') {
      return NextResponse.json({ error: 'La foto viola una restricción de integridad (menores/ubicaciones).' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
