import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { registrarVideoPropuesto } from '@/lib/registrarVideoPropuesto';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const data = await request.json();
    const {
      titulo,
      tipo,
      fecha,
      hora,
      ciclo_id,
      audiencia_alcanzada,
      evidencia_url,
      categoria, // 'investigacion' | 'vinculacion' | 'asignatura'
      proyecto,
      asignatura,
      descripcion,
      observaciones,
      profesores_responsables,
      youtube_video_id,
      video_category,
      video_tags,
    } = data;
    const registrador_id = usuario.id;

    if (!titulo || !tipo || !fecha || !audiencia_alcanzada) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const responsablesIds = Array.isArray(profesores_responsables)
      ? profesores_responsables.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
      : [];

    if (responsablesIds.length === 0) {
      return NextResponse.json({ error: 'Debe seleccionar al menos un profesor responsable' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const profesoresValidos = await sql`
      SELECT id FROM usuarios WHERE id = ANY(${responsablesIds}) AND rol = 'profesor'
    `;
    if (profesoresValidos.length !== responsablesIds.length) {
      return NextResponse.json({ error: 'Uno o más profesores responsables no son válidos' }, { status: 400 });
    }

    const periodo_academico = calcularPeriodoAcademico(new Date(fecha));

    await sql`
      INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, ciclo_id, registrador_id, audiencia_alcanzada, evidencia_url,
         categoria, proyecto, asignatura, descripcion, observaciones, profesores_responsables, periodo_academico)
      VALUES
        (${titulo}, ${tipo}, ${fecha}, ${hora || null}, ${ciclo_id || null}, ${registrador_id}, ${audiencia_alcanzada}, ${evidencia_url || null},
         ${categoria || 'vinculacion'}, ${proyecto || null}, ${asignatura || null}, ${descripcion || null}, ${observaciones || null}, ${responsablesIds}, ${periodo_academico})
    `;

    // Si se subió un video (tipo "podcast", ver components/SubirVideoDifusion.tsx),
    // se registra también en `videos` como propuesta pendiente — aprobación
    // independiente en /admin/videos, separada de la de esta difusión. Mismo
    // chequeo de permiso que /api/youtube/iniciar-subida (el video ya se subió
    // a YouTube en el navegador, pero solo se registra en el sitio si el
    // usuario está autorizado — evita filas basura de alguien sin permiso).
    const puedeProponerVideo = ['profesor', 'admin'].includes(usuario.rol) ||
      (usuario.rol === 'estudiante' && usuario.modulos_acceso.includes('subir_video'));
    if (youtube_video_id && video_category && puedeProponerVideo) {
      await registrarVideoPropuesto(sql, {
        usuarioId: Number(usuario.id),
        youtubeVideoId: youtube_video_id,
        title: titulo,
        description: descripcion,
        category: video_category,
        tags: Array.isArray(video_tags) ? video_tags : [],
      });
    }

    return NextResponse.json({ success: true, message: 'Actividad registrada exitosamente' });
  } catch (error: any) {
    console.error('Difusion save error:', error);
    return NextResponse.json(
      { error: 'Error guardando la actividad de difusión', details: error.message },
      { status: 500 }
    );
  }
}
