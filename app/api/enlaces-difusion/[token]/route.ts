import { NextResponse } from 'next/server';
import { neon, Pool } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeGenerarEnlaceDifusion } from '@/lib/permisos-enlace-difusion';
import { calcularPeriodoAcademico } from '@/lib/periodoAcademico';

// Público (sin sesión) — valida el token y devuelve lo necesario para armar
// el formulario: a quién se le dio el acceso (para saludarlo) y las listas
// reales de profesores/proyectos (el visitante no tiene sesión para pedirlas
// a /api/profesores o /api/proyectos, que exigen login).
export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { token: string } }) {
  try {
    const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
    const rows = await sql`
      SELECT nombre_invitado, tipo_contenido, expira_en, max_usos, usos_actuales, activo
      FROM enlaces_difusion WHERE token = ${params.token}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }

    const enlace = rows[0];
    const expirado = new Date(enlace.expira_en).getTime() <= Date.now();
    const agotado = enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos;

    if (!enlace.activo || expirado || agotado) {
      return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
    }

    const profesores = await sql`
      SELECT id, nombres, apellidos FROM usuarios WHERE rol = 'profesor' ORDER BY nombres, apellidos
    `;
    // Los 3 proyectos de investigación propios del grupo (no toda la tabla
    // `proyectos`, que también incluye RED LEA y Docencia Innovadora) — mismo
    // ID fijo que ya usan /gestion-carrera y /admin/contenido.
    const PROYECTOS_INVESTIGACION_IDS = ['internacionalizacion', 'desarrollo_habilidades', 'mentoring'];
    const proyectos = await sql`
      SELECT id, nombre_oficial FROM proyectos WHERE id = ANY(${PROYECTOS_INVESTIGACION_IDS}) ORDER BY "order"
    `;

    return NextResponse.json({
      success: true,
      data: {
        nombre_invitado: enlace.nombre_invitado,
        tipo_contenido: enlace.tipo_contenido,
        profesores,
        proyectos,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Público (sin sesión) — registra el evento/podcast. Siempre nace con
// origen='externo_temporal' y aprobado_sitio=false (default de columna, no
// se incluye en el INSERT): jamás visible en el sitio hasta que alguien con
// contenido_sitio lo apruebe en /admin/contenido.
export async function POST(request: Request, { params }: { params: { token: string } }) {
  const body = await request.json();
  const {
    registrador_externo_nombre, registrador_externo_contacto,
    titulo, tipo, fecha, hora, audiencia_alcanzada, evidencia_url,
    categoria, proyecto, asignatura, descripcion, observaciones,
    profesores_responsables, youtube_video_id, video_category,
  } = body;

  if (!registrador_externo_nombre || !registrador_externo_nombre.trim()) {
    return NextResponse.json({ error: 'Escribe tu nombre' }, { status: 400 });
  }
  if (!titulo || !tipo || !fecha) {
    return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
  }
  const responsablesIds = Array.isArray(profesores_responsables)
    ? profesores_responsables.map((id: any) => parseInt(id, 10)).filter((id: number) => !isNaN(id))
    : [];
  if (responsablesIds.length === 0) {
    return NextResponse.json({ error: 'Debe seleccionar al menos un profesor responsable' }, { status: 400 });
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: enlaceRows } = await client.query(
      `SELECT creado_por, tipo_contenido, expira_en, max_usos, usos_actuales, activo FROM enlaces_difusion WHERE token = $1 FOR UPDATE`,
      [params.token]
    );
    if (enlaceRows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    const enlace = enlaceRows[0];
    const expirado = new Date(enlace.expira_en).getTime() <= Date.now();
    const agotado = enlace.max_usos !== null && enlace.usos_actuales >= enlace.max_usos;
    if (!enlace.activo || expirado || agotado) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace ya no está disponible' }, { status: 410 });
    }

    // El profesor eligió al generar el enlace si es para podcast (video) o
    // evento (foto) — se valida acá, no se confía en lo que mande el
    // cliente: un enlace de 'evento' no puede registrar tipo='podcast' y
    // viceversa, ni traer youtube_video_id si es de 'evento'.
    if (enlace.tipo_contenido === 'podcast' && tipo !== 'podcast') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace es solo para registrar un podcast' }, { status: 400 });
    }
    if (enlace.tipo_contenido === 'evento' && tipo === 'podcast') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace es solo para registrar un evento' }, { status: 400 });
    }
    if (enlace.tipo_contenido !== 'podcast' && youtube_video_id) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Este enlace no permite subir video' }, { status: 400 });
    }

    const { rows: profesoresValidos } = await client.query(
      `SELECT id FROM usuarios WHERE id = ANY($1::int[]) AND rol = 'profesor'`,
      [responsablesIds]
    );
    if (profesoresValidos.length !== responsablesIds.length) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Uno o más profesores responsables no son válidos' }, { status: 400 });
    }

    const periodo_academico = calcularPeriodoAcademico(new Date(fecha));
    const photos = evidencia_url && tipo !== 'podcast' ? [evidencia_url] : [];

    await client.query(
      `INSERT INTO actividades_difusion
        (titulo, tipo, fecha, hora, registrador_id, audiencia_alcanzada, evidencia_url, photos,
         categoria, proyecto, asignatura, descripcion, observaciones, profesores_responsables, periodo_academico,
         origen, registrador_externo_nombre, registrador_externo_contacto)
       VALUES
        ($1, $2, $3, $4, NULL, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'externo_temporal', $15, $16)`,
      [
        titulo, tipo, fecha, hora || null, audiencia_alcanzada || null, evidencia_url || null, photos,
        categoria || 'vinculacion', proyecto || null, asignatura || null, descripcion || null, observaciones || null,
        responsablesIds, periodo_academico, registrador_externo_nombre.trim(), registrador_externo_contacto || null,
      ]
    );

    // Video del podcast (opcional, Sesión 37) — ya se subió a YouTube en el
    // navegador vía /api/youtube/iniciar-subida (autorizado con este mismo
    // token). Se registra en `videos` como propuesta pendiente, atribuida al
    // profesor que generó el enlace (enlace.creado_por) — el externo no tiene
    // usuarios.id, pero el profesor ya lo vetó al generar el acceso. Mismo
    // patrón/columnas que lib/registrarVideoPropuesto.ts, adaptado a client.query.
    if (youtube_video_id && video_category) {
      const videoId = `video_${Date.now()}`;
      await client.query(
        `INSERT INTO videos (id, title, youtube_url, embed_id, description, category, "order", is_featured, tags, aprobado_sitio, propuesto_por)
         VALUES ($1, $2, $3, $4, $5, $6, 0, false, $7, false, $8)`,
        [videoId, titulo, `https://youtu.be/${youtube_video_id}`, youtube_video_id, descripcion || null, video_category, ['vinculacion'], enlace.creado_por]
      );
    }

    await client.query(`UPDATE enlaces_difusion SET usos_actuales = usos_actuales + 1 WHERE token = $1`, [params.token]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Enlace difusión submit error:', error);
    return NextResponse.json({ error: 'Error registrando la actividad', details: error.message }, { status: 500 });
  } finally {
    client.release();
    await pool.end();
  }
}

// Protegido — revoca el enlace antes de tiempo. Solo quien lo creó, o
// contenido_sitio.
export async function PATCH(request: Request, { params }: { params: { token: string } }) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !puedeGenerarEnlaceDifusion(usuario)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const puedeRevocarCualquiera = usuario.modulos_acceso.includes('contenido_sitio');
    const [actualizado] = puedeRevocarCualquiera
      ? await sql`UPDATE enlaces_difusion SET activo = false WHERE token = ${params.token} RETURNING token`
      : await sql`UPDATE enlaces_difusion SET activo = false WHERE token = ${params.token} AND creado_por = ${Number(usuario.id)} RETURNING token`;

    if (!actualizado) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
