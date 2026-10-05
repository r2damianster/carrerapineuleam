import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';
import { registrarVideoPropuesto } from '@/lib/registrarVideoPropuesto';
import { registrarFotoEnBanco } from '@/lib/ingestaFotos';
import { buscarMasParecidoDifusion, evaluarGateSimilitud } from '@/lib/similitudRegistros';
import { lideresDelProyecto, puedeRegistrarAporte } from '@/lib/investigacionAportes';

const TIPOS_DIFUSION = ['podcast', 'evento_fisico', 'encuentro_comunitario', 'evento_formacion', 'visita_tecnica'];

// Evento o podcast que registra un aportante de Investigación (docente o colaborador) en SU proyecto.
// - Nace sin aprobar: lo aprueban el líder/colíder del proyecto (profesores responsables) o la administración
//   del sitio, igual que el resto de difusión. Publicar y validar el aporte son decisiones separadas.
// - Crea además un aporte (investigacion_aportes) ligado a la actividad, por validar por el líder.
// - Un colaborador no es una persona verificada como un docente: sus fotos entran al banco siempre como
//   "menores por revisar" y solo la administración del sitio las libera.
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const datos = await request.json();
    const {
      proyecto_id, actividad_plan_id, titulo, tipo, fecha, hora, audiencia_alcanzada,
      descripcion, evidencia_url, hay_menores, confirmado_similitud,
      youtube_video_id, video_category,
    } = datos;

    const sql = neon(process.env.DATABASE_URL!);
    const proyectoId = String(proyecto_id || '');
    if (!(await puedeRegistrarAporte(sql, usuario, proyectoId))) {
      return NextResponse.json({ error: 'No eres aportante de ese proyecto' }, { status: 403 });
    }
    if (!titulo || !fecha || !TIPOS_DIFUSION.includes(tipo)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    const audiencia = Number(audiencia_alcanzada);
    if (!Number.isInteger(audiencia) || audiencia < 1) {
      return NextResponse.json({ error: 'Indica la audiencia alcanzada (mínimo 1)' }, { status: 400 });
    }
    if (!evidencia_url) {
      return NextResponse.json({ error: 'Falta la evidencia (foto o captura)' }, { status: 400 });
    }
    if (tipo === 'podcast' && !(youtube_video_id && video_category)) {
      return NextResponse.json({ error: 'Para un podcast sube primero el video' }, { status: 400 });
    }

    let actividadPlanId: number | null = null;
    if (actividad_plan_id) {
      const [actividadPlan] = await sql`
        SELECT a.id FROM proyecto_actividades_plan a
        JOIN proyecto_objetivos o ON o.id = a.objetivo_id
        WHERE a.id = ${Number(actividad_plan_id)} AND o.proyecto_id = ${proyectoId}
      `;
      if (!actividadPlan) return NextResponse.json({ error: 'Esa actividad no pertenece al proyecto' }, { status: 400 });
      actividadPlanId = actividadPlan.id;
    }

    const responsables = await lideresDelProyecto(sql, proyectoId);

    const similitud = await buscarMasParecidoDifusion(sql, {
      titulo, tipo, categoria: 'investigacion', hora: hora || null,
      proyectos: [proyectoId], profesoresResponsables: responsables,
    }, fecha);
    const codigoGate = evaluarGateSimilitud(similitud, confirmado_similitud === true);
    if (codigoGate !== 'OK') {
      return NextResponse.json({ error: 'Esta actividad parece duplicada', codigo: codigoGate, similitud }, { status: 409 });
    }

    const usuarioId = Number(usuario.id);
    const fotos = tipo !== 'podcast' ? [evidencia_url] : [];
    const [actividad] = await sql`
      INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, registrador_id, audiencia_alcanzada, evidencia_url, photos,
         categoria, proyecto, descripcion, profesores_responsables, periodo_academico, proyectos)
      VALUES
        (${titulo}, ${tipo}, ${fecha}, ${hora || null}, ${usuarioId}, ${audiencia}, ${evidencia_url}, ${fotos},
         'investigacion', ${proyectoId}, ${descripcion || null}, ${responsables}, ${calcularPeriodoAcademico(new Date(fecha))}, ${[proyectoId]})
      RETURNING id
    `;

    // Aporte por validar, ligado a la actividad de difusión (y a una meta del plan si se eligió).
    await sql`
      INSERT INTO investigacion_aportes (proyecto_id, usuario_id, actividad_plan_id, actividad_difusion_id, fecha, tipo, descripcion, horas)
      VALUES (${proyectoId}, ${usuarioId}, ${actividadPlanId}, ${actividad.id}, ${fecha},
              ${tipo === 'podcast' ? 'podcast' : 'evento'}, ${descripcion ? `${titulo}. ${descripcion}` : titulo}, 0)
    `;

    if (youtube_video_id && video_category) {
      await registrarVideoPropuesto(sql, {
        usuarioId,
        youtubeVideoId: youtube_video_id,
        title: titulo,
        description: descripcion,
        category: video_category,
        tags: ['investigacion'],
        areaSustantiva: 'investigacion',
        proyectoId,
        profesoresResponsables: responsables,
        actividadDifusionId: actividad.id,
        participantesEstudiantes: [],
        audienciaAlcanzada: audiencia,
      });
    }

    // La ingesta al banco de fotos nunca debe tumbar el registro principal.
    await registrarFotoEnBanco(sql, {
      url: evidencia_url,
      titulo,
      origen: tipo === 'podcast' ? 'podcast' : 'evento',
      fuente_id: String(actividad.id),
      fecha_evento: fecha,
      categoria: 'investigacion',
      proyectos: [proyectoId],
      subido_por_id: usuarioId,
      subido_por: usuario.email,
      hayMenores: hay_menores === true,
      esExterno: usuario.rol === 'colaborador',
    });

    return NextResponse.json({ success: true, id: actividad.id }, { status: 201 });
  } catch (error: any) {
    console.error('Difusión de investigación error:', error);
    return NextResponse.json({ error: 'Error registrando la actividad', details: error.message }, { status: 500 });
  }
}
