import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { registrarVideoPropuesto } from '@/lib/registrarVideoPropuesto';
import { registrarFotoEnBanco } from '@/lib/ingestaFotos';
import { validarProyectosAsignables } from '@/lib/permisosProyecto';
import { esDocente } from '@/lib/modulos';

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
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
      video_area_sustantiva,
      video_proyecto_id,
      video_participantes,
      video_invitados_internos,
      video_invitados_externos,
      // WP5.2 nuevos
      hay_menores,    // boolean — declaración de menores en la foto de evidencia
      // WP5b nuevo
      proyectos: proyectosPedidos, // string[] — proyectos a los que pertenece esta actividad
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

    // WP5b — validar proyectos asignables por el usuario
    // Pasantes (estudiante) tienen proyectos fijos; docentes los validan aquí.
    let proyectosValidados: string[] = [];
    if (usuario.rol === 'estudiante') {
      // D5: pasantes → eventos=['vinculacion'], podcasts=['vinculacion','internacionalizacion']
      proyectosValidados = tipo === 'podcast'
        ? ['vinculacion', 'internacionalizacion']
        : ['vinculacion'];
    } else if (esDocente(usuario)) {
      // Docentes eligen proyectos — validar contra sus asignables
      const validacion = await validarProyectosAsignables(sql, usuario, proyectosPedidos);
      if (!validacion.valido) {
        return NextResponse.json({ error: validacion.error }, { status: validacion.status });
      }
      proyectosValidados = validacion.ids;
    }

    const periodo_academico = calcularPeriodoAcademico(new Date(fecha));

    // `evidencia_url` en tipo 'podcast' suele ser una captura de métricas
    // (analytics de Spotify/YouTube), no una foto presentable — no la usamos
    // como imagen pública. En el resto de tipos (evento_fisico, visita_tecnica,
    // encuentro_comunitario, evento_formacion) sí es la foto real del evento,
    // así que la copiamos a `photos[]` (lo que leen NewsSection/ActivityGallery
    // como imagen destacada) — si no, quedaba subida a Cloudinary pero invisible.
    const photos = evidencia_url && tipo !== 'podcast' ? [evidencia_url] : [];

    // WP5b: guardar proyectosValidados en actividades_difusion.proyectos (columna nueva WP1)
    // Seguimos escribiendo `proyecto` y `categoria` como antes (los informes los leen).
    const [actividad] = await sql`
      INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, ciclo_id, registrador_id, audiencia_alcanzada, evidencia_url, photos,
         categoria, proyecto, asignatura, descripcion, observaciones, profesores_responsables, periodo_academico,
         proyectos)
      VALUES
        (${titulo}, ${tipo}, ${fecha}, ${hora || null}, ${ciclo_id || null}, ${registrador_id}, ${audiencia_alcanzada}, ${evidencia_url || null}, ${photos},
         ${categoria || 'vinculacion'}, ${proyecto || null}, ${asignatura || null}, ${descripcion || null}, ${observaciones || null}, ${responsablesIds}, ${periodo_academico},
         ${proyectosValidados})
      RETURNING id
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
      // Sesión 40: si quien sube es un pasante, se autoincluye como
      // participante aunque no se haya marcado a sí mismo — evita quedarse
      // sin horas por un olvido en el checklist (ver app/api/videos/route.ts).
      const participantesIds = Array.isArray(video_participantes)
        ? video_participantes.map((id: any) => Number(id)).filter((id: number) => !isNaN(id))
        : [];
      if (usuario.rol === 'estudiante' && !participantesIds.includes(Number(usuario.id))) {
        participantesIds.push(Number(usuario.id));
      }
      await registrarVideoPropuesto(sql, {
        usuarioId: Number(usuario.id),
        youtubeVideoId: youtube_video_id,
        title: titulo,
        description: descripcion,
        category: video_category,
        tags: Array.isArray(video_tags) ? video_tags : [],
        areaSustantiva: video_area_sustantiva || null,
        proyectoId: video_proyecto_id || null,
        participantesEstudiantes: participantesIds,
        invitadosInternos: Array.isArray(video_invitados_internos) ? video_invitados_internos : [],
        invitadosExternos: Array.isArray(video_invitados_externos) ? video_invitados_externos : [],
        audienciaAlcanzada: audiencia_alcanzada || 0,
      });
    }

    // WP5.2: ingestar foto al banco si hay evidencia_url (solo para eventos, no podcasts).
    // Podcasts: evidencia_url es captura de métricas, no una foto de difusión.
    // Nunca debe fallar el registro principal.
    if (evidencia_url && actividad?.id) {
      const origenFoto = tipo === 'podcast' ? 'podcast' : 'evento';
      await registrarFotoEnBanco(sql, {
        url: evidencia_url,
        origen: origenFoto,
        fuente_id: String(actividad.id),
        fecha_evento: fecha,
        categoria: categoria || 'vinculacion',
        proyectos: proyectosValidados,
        subido_por_id: Number(usuario.id),
        subido_por: usuario.email,
        hayMenores: hay_menores === true,
        esExterno: false,
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
