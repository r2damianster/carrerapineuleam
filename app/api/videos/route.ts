import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { registrarHorasPodcast } from '@/lib/horasPodcast';
import { puedeAdministrarSitio, proyectosAsignables } from '@/lib/permisosProyecto';

function extractEmbedId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&\?]{10,12})/);
  return match?.[1] || null;
}

export async function GET(request: Request) {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category');
    const featuredOnly = searchParams.get('featured') === 'true';
    // ?all=true (usado solo por /admin/videos) trae también los ocultos
    // (activo=false) para poder reactivarlos — el sitio público nunca lo manda.
    const incluirInactivos = searchParams.get('all') === 'true';
    // ?pendientes=true — cola de videos propuestos por profesores, sin aprobar
    // todavía (aprobado_sitio=false). Protegido, solo contenido_sitio.
    const soloPendientes = searchParams.get('pendientes') === 'true';
    if (soloPendientes) {
      const usuario = await getAppSessionFromCookies();
      if (!usuario || !usuario.modulos_acceso.includes('contenido_sitio')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      const pendientes = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand,
               u.nombres AS proponente_nombres, u.apellidos AS proponente_apellidos, u.email AS proponente_email
        FROM videos v
        LEFT JOIN video_categories c ON c.id = v.category
        LEFT JOIN usuarios u ON u.id = v.propuesto_por
        WHERE v.aprobado_sitio = false
        ORDER BY v.created DESC
      `;
      return NextResponse.json(pendientes.map((r: any) => {
        const { category_expand, proponente_nombres, proponente_apellidos, proponente_email, ...video } = r;
        return {
          ...video,
          expand: { category: category_expand },
          proponente: proponente_nombres ? { nombres: proponente_nombres, apellidos: proponente_apellidos, email: proponente_email } : null,
        };
      }));
    }

    let rows;
    if (categoryId) {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE v.category = ${categoryId} AND (${incluirInactivos} OR v.activo = true) AND v.aprobado_sitio = true
        ORDER BY v."order" ASC
      `;
    } else if (featuredOnly) {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE v.is_featured = true AND (${incluirInactivos} OR v.activo = true) AND v.aprobado_sitio = true
        ORDER BY v."order" ASC LIMIT 6
      `;
    } else {
      rows = await sql`
        SELECT v.*, row_to_json(c.*) AS category_expand
        FROM videos v LEFT JOIN video_categories c ON c.id = v.category
        WHERE (${incluirInactivos} OR v.activo = true) AND v.aprobado_sitio = true
        ORDER BY v."order" ASC
      `;
    }

    const videos = rows.map((r: any) => {
      const { category_expand, ...video } = r;
      return { ...video, expand: { category: category_expand } };
    });
    return NextResponse.json(videos);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const esAdminContenido = usuario.modulos_acceso.includes('contenido_sitio');
    // Un profesor sin contenido_sitio, o un estudiante con el permiso
    // 'subir_video' activado por su profesor, puede proponer un video (ya
    // subido a YouTube como no listado vía /api/youtube/iniciar-subida) —
    // nace pendiente de aprobación. contenido_sitio sigue creando directo,
    // ya aprobado, como siempre.
    const puedeProponer = ['profesor', 'admin'].includes(usuario.rol) ||
      (usuario.rol === 'estudiante' && usuario.modulos_acceso.includes('subir_video'));
    if (!esAdminContenido && !puedeProponer) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const {
      title, youtube_url, description, category, published_date, order, is_featured, tags, youtube_video_id,
      area_sustantiva, proyecto_id, participantes_estudiantes, invitados_internos, invitados_externos, audiencia_alcanzada,
    } = await request.json();
    if (!title || !category) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    // El link ya no es obligatorio — se puede registrar solo con metadata y
    // completar el link después, editando (pedido del usuario, Sesión 24).
    // Si viene youtube_video_id (subida directa vía la API), se compone el
    // link/embed_id directo del id devuelto por YouTube — no hace falta parsear URL.
    const embed_id = youtube_video_id || (youtube_url ? extractEmbedId(youtube_url) : null);
    const url_final = youtube_video_id ? `https://youtu.be/${youtube_video_id}` : (youtube_url || null);

    const sql = neon(process.env.DATABASE_URL!);
    const id = `video_${Date.now()}`;
    // WP5b: el proyecto principal solo puede ser uno que la persona pueda asignar
    // (pasante: solo Vinculación; docente: los suyos; administración del sitio: cualquiera).
    // 'internacionalizacion' lo agrega el servidor abajo y no se valida (regla de la Sesión 38).
    if (proyecto_id && !puedeAdministrarSitio(usuario)) {
      const permitidos = usuario.rol === 'estudiante'
        ? new Set(['vinculacion'])
        : new Set((await proyectosAsignables(sql, usuario)).map(proyecto => proyecto.id));
      if (!permitidos.has(String(proyecto_id))) {
        return NextResponse.json({ error: `No puedes asignar el proyecto "${proyecto_id}".` }, { status: 403 });
      }
    }
    const proyectoIds = proyecto_id ? Array.from(new Set([proyecto_id, 'internacionalizacion'])) : null;
    const participantesIds = Array.isArray(participantes_estudiantes)
      ? participantes_estudiantes.map((pid: any) => Number(pid)).filter((pid: number) => !isNaN(pid))
      : [];
    // Sesión 40: si quien sube es un pasante, se autoincluye como participante
    // aunque no se haya marcado a sí mismo en el checklist — evita que se
    // quede sin horas por un simple olvido en el formulario (caso real: Keyla
    // Pin Bello subió un episodio sin marcarse, video_1789480797649).
    if (usuario.rol === 'estudiante' && !participantesIds.includes(Number(usuario.id))) {
      participantesIds.push(Number(usuario.id));
    }
    const [nuevo] = await sql`
      INSERT INTO videos
        (id, title, youtube_url, embed_id, description, category, published_date, "order", is_featured, tags, aprobado_sitio, propuesto_por,
         area_sustantiva, proyecto_id, participantes_estudiantes, invitados_internos, invitados_externos, audiencia_alcanzada)
      VALUES
        (${id}, ${title}, ${url_final}, ${embed_id}, ${description || null}, ${category}, ${published_date || null}, ${order ?? 0}, ${!!is_featured}, ${tags || null},
         ${esAdminContenido}, ${esAdminContenido ? null : Number(usuario.id)},
         ${area_sustantiva || null}, ${proyectoIds}, ${participantesIds}, ${invitados_internos || []}, ${invitados_externos || []}, ${audiencia_alcanzada || 0})
      RETURNING *
    `;

    // Sesión 40: las horas de podcast ya no dependen del área elegida — un
    // pasante puede adscribir su episodio a docencia/investigación/vinculación
    // y de todos modos cuenta como horas de Vinculación en cuanto hay
    // participantes marcados (ver lib/registrarVideoPropuesto.ts). Pero solo
    // se acreditan de inmediato si el video ya nace aprobado (lo crea
    // contenido_sitio directo) — si queda pendiente, las horas se calculan
    // recién cuando el profesor lo aprueba en /admin/videos (app/api/videos/[id]/route.ts),
    // no al subirlo.
    if (participantesIds.length > 0) {
      await registrarHorasPodcast(sql, {
        videoId: id,
        participantesEstudiantes: participantesIds,
        invitadosInternos: invitados_internos || [],
        invitadosExternos: invitados_externos || [],
        audienciaAlcanzada: audiencia_alcanzada || 0,
      });
    }

    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
