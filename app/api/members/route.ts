import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { crearPersonaDirectorio, sincronizarProyectosDePersona } from '@/lib/equipoProyecto';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const project = searchParams.get('project');
    // ?all=true (usado solo por /admin/members) trae también los ocultos
    // (activo=false) para poder reactivarlos — el sitio público nunca lo manda.
    const incluirInactivos = searchParams.get('all') === 'true';

    const sql = neon(process.env.DATABASE_URL!);
    // El nombre sale de la persona (usuarios) cuando la tarjeta está enlazada; los equipos y roles
    // salen de proyecto_miembros (Sesión 51). El correo NO se toma de usuarios: las personas de
    // directorio tienen correos internos que no deben publicarse.
    const filas = project
      ? await sql`
          SELECT to_jsonb(m) || jsonb_build_object(
                   'name', COALESCE(NULLIF(trim(u.nombres || ' ' || u.apellidos), ''), m.name),
                   'rol_en_proyecto', pm.rol_en_proyecto,
                   'order', pm.orden
                 ) AS data
          FROM proyecto_miembros pm
          JOIN members m ON m.usuario_id = pm.usuario_id
          LEFT JOIN usuarios u ON u.id = m.usuario_id
          WHERE pm.proyecto_id = ${project} AND (${incluirInactivos} OR (pm.activo AND m.activo))
          ORDER BY pm.orden ASC, m.id ASC
        `
      : await sql`
          SELECT to_jsonb(m) || jsonb_build_object(
                   'name', COALESCE(NULLIF(trim(u.nombres || ' ' || u.apellidos), ''), m.name),
                   'projects', COALESCE((SELECT array_agg(pm.proyecto_id ORDER BY pm.proyecto_id) FROM proyecto_miembros pm WHERE pm.usuario_id = m.usuario_id), '{}'),
                   'roles_proyecto', COALESCE((SELECT jsonb_object_agg(pm.proyecto_id, pm.rol_en_proyecto) FROM proyecto_miembros pm WHERE pm.usuario_id = m.usuario_id), '{}'::jsonb)
                 ) AS data
          FROM members m
          LEFT JOIN usuarios u ON u.id = m.usuario_id
          WHERE (${incluirInactivos} OR m.activo = true)
          ORDER BY m."order" ASC
        `;
    return NextResponse.json(filas.map((fila: any) => fila.data));
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

    const { name, role, orcid, email, photo, is_leader, order, projects, roles_proyecto, usuario_id, genero, fecha_nacimiento, grado, posgrado, titulo_especifico } = await request.json();
    if (!name || !role) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    // Toda tarjeta pública queda enlazada a una persona (usuarios): la elegida en el formulario,
    // la que ya tenga ese correo, o una persona de directorio nueva (sin cuenta) con este nombre.
    let personaId: number | null = usuario_id ? Number(usuario_id) : null;
    if (!personaId && email) {
      const [existente] = await sql`SELECT id FROM usuarios WHERE lower(email) = lower(${email}) LIMIT 1`;
      personaId = existente ? Number(existente.id) : null;
    }
    if (!personaId) personaId = await crearPersonaDirectorio(sql, name);
    const [yaEnlazada] = await sql`SELECT id FROM members WHERE usuario_id = ${personaId} LIMIT 1`;
    if (yaEnlazada) {
      return NextResponse.json({ error: 'Esa persona ya tiene una tarjeta pública. Edítala en lugar de crear otra.' }, { status: 409 });
    }

    const id = `member_${Date.now()}`;
    const [nuevo] = await sql`
      INSERT INTO members (id, name, role, orcid, email, photo, is_leader, "order", genero, fecha_nacimiento, grado, posgrado, titulo_especifico, usuario_id)
      VALUES (${id}, ${name}, ${role}, ${orcid || null}, ${email || ''}, ${photo || null}, ${!!is_leader}, ${order ?? 0}, ${genero || null}, ${fecha_nacimiento || null}, ${grado || null}, ${posgrado || null}, ${titulo_especifico || null}, ${personaId})
      RETURNING *
    `;
    await sincronizarProyectosDePersona(sql, personaId, projects || [], roles_proyecto, order ?? 0);
    return NextResponse.json(nuevo, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
