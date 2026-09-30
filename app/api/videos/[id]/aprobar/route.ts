import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeAprobarVideo } from '@/lib/permisosAprobacionContenido';
import { publicarFotosDeFuente } from '@/lib/publicarFotoEnProyecto';

export const dynamic = 'force-dynamic';

// Aprobar y publicar un video sin depender solo de administración del sitio (Sesión 53).
// Quién puede: el profesor responsable elegido al registrarlo, o el supervisor del pasante
// que lo subió (si aplica) — ver lib/permisosAprobacionContenido.ts. Administración del sitio
// siempre puede además, y sigue teniendo /admin/videos para lo que no entre por esta vía.
//
// Body: { hay_menores: boolean, calidad_mala: boolean }
// - Si hay_menores o calidad_mala → NO se publica; si hay una foto asociada (podcasts que
//   nacieron junto con un registro de difusión) se descarta con el motivo correspondiente.
// - Si ambas van en false → se aprueba el video y, si tiene actividad de difusión asociada,
//   también esa actividad (mismo botón, misma acción).
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria' || usuario.rol === 'beneficiario') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const [video] = await sql`
      SELECT id, title, propuesto_por, participantes_estudiantes, profesores_responsables, proyecto_id, actividad_difusion_id, aprobado_sitio,
        (SELECT proyectos FROM actividades_difusion WHERE id = videos.actividad_difusion_id) AS proyectos_actividad
      FROM videos WHERE id = ${params.id}
    `;
    if (!video) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (!(await puedeAprobarVideo(sql, usuario, video))) {
      return NextResponse.json({ error: 'No tienes permiso para aprobar este video.' }, { status: 403 });
    }

    const { hay_menores, calidad_mala } = await request.json();

    // Foto asociada (si el video nació junto con una actividad de difusión) — puede no existir
    // (ej. subido directo desde /portal/subir-video, sin registro de difusión).
    const [foto] = video.actividad_difusion_id
      ? await sql`SELECT id, menores, visibilidad, activo FROM fotos WHERE origen = 'podcast' AND fuente_id = ${String(video.actividad_difusion_id)}`
      : [null];

    if (hay_menores === true || calidad_mala === true) {
      if (foto) {
        await sql`
          UPDATE fotos SET
            menores = CASE WHEN ${hay_menores === true} THEN 'si' ELSE menores END,
            calidad = CASE WHEN ${calidad_mala === true} THEN 'mala' ELSE calidad END,
            visibilidad = CASE WHEN ${hay_menores === true} THEN 'interna' ELSE visibilidad END,
            activo = CASE WHEN ${hay_menores === true || calidad_mala === true} THEN false ELSE activo END,
            ubicaciones = CASE WHEN ${hay_menores === true || calidad_mala === true} THEN '{}'::text[] ELSE ubicaciones END,
            calidad_revisada_por = ${Number(usuario.id)}, calidad_revisada_en = now(), updated = now()
          WHERE id = ${foto.id}
        `;
      }
      return NextResponse.json({
        success: true,
        publicado: false,
        motivo: hay_menores ? 'menores' : 'mala_calidad',
        mensaje: 'No se publicó: la foto asociada quedó descartada por el motivo indicado.',
      });
    }

    await sql`UPDATE videos SET aprobado_sitio = true WHERE id = ${params.id}`;
    if (video.actividad_difusion_id) {
      await sql`
        UPDATE actividades_difusion
        SET aprobado_sitio = true,
            aprobado_por = COALESCE(aprobado_por, ${Number(usuario.id)}),
            fecha_aprobacion = COALESCE(fecha_aprobacion, now())
        WHERE id = ${video.actividad_difusion_id}
      `;
    }
    if (foto) {
      await sql`
        UPDATE fotos SET calidad = 'aceptable', calidad_revisada_por = ${Number(usuario.id)}, calidad_revisada_en = now(), updated = now()
        WHERE id = ${foto.id}
      `;
      await publicarFotosDeFuente(sql, ['podcast'], video.actividad_difusion_id);
    }

    return NextResponse.json({ success: true, publicado: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
