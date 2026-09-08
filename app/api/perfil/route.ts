import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { solicitarPublicacionPerfil } from '@/lib/perfilSync';

const GENEROS_VALIDOS = ['femenino', 'masculino', 'otro', 'prefiero_no_decir'];
const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const sql = neon(process.env.DATABASE_URL!);
    const [fila] = await sql`
      SELECT nombres, apellidos, email, cedula, orcid, genero, fecha_nacimiento, foto_url,
             titulo_grado, post_grado, cargo_institucional, dependencia, es_director,
             horario_tutorias_publico
      FROM usuarios WHERE id = ${Number(usuario.id)}
    `;
    if (!fila) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const titulos = await sql`
      SELECT id, nivel, tipo, titulo_especifico, institucion, anio, es_principal
      FROM perfiles_titulos_academicos
      WHERE usuario_id = ${Number(usuario.id)}
      ORDER BY nivel ASC, es_principal DESC, id ASC
    `;

    const horarioTutorias = (await sql`
      SELECT id, dia_semana, hora_inicio, hora_fin
      FROM perfiles_horario_tutorias
      WHERE usuario_id = ${Number(usuario.id)}
    `).sort((a: any, b: any) => {
      const diaDiff = ORDEN_DIAS.indexOf(a.dia_semana) - ORDEN_DIAS.indexOf(b.dia_semana);
      return diaDiff !== 0 ? diaDiff : a.hora_inicio.localeCompare(b.hora_inicio);
    });

    const [member] = await sql`
      SELECT pending_photo, pending_grado, pending_posgrado, pending_orcid, pending_titulo_especifico
      FROM members WHERE email = ${usuario.email}
    `;
    const tienePendientesEnWeb = !!member && !!(
      member.pending_photo || member.pending_grado || member.pending_posgrado ||
      member.pending_orcid || member.pending_titulo_especifico
    );

    return NextResponse.json({ ...fila, titulos, horarioTutorias, tieneTarjetaPublica: !!member, tienePendientesEnWeb });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const data = await request.json();
    const cedula = data.cedula !== undefined ? String(data.cedula).trim() : undefined;
    const orcid = data.orcid !== undefined ? (data.orcid ? String(data.orcid).trim() : null) : undefined;
    const genero = data.genero !== undefined ? data.genero : undefined;
    const fecha_nacimiento = data.fecha_nacimiento !== undefined ? data.fecha_nacimiento : undefined;
    const foto_url = data.foto_url !== undefined ? data.foto_url : undefined;
    const horario_tutorias_publico = data.horario_tutorias_publico !== undefined ? !!data.horario_tutorias_publico : undefined;

    if (cedula !== undefined && !/^\d{10}$/.test(cedula)) {
      return NextResponse.json({ error: 'La cédula debe tener 10 dígitos' }, { status: 400 });
    }
    if (orcid && !/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(orcid)) {
      return NextResponse.json({ error: 'ORCID inválido (formato 0000-0000-0000-0000)' }, { status: 400 });
    }
    if (genero !== undefined && genero && !GENEROS_VALIDOS.includes(genero)) {
      return NextResponse.json({ error: 'Género no válido' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    if (cedula !== undefined) {
      const existente = await sql`SELECT id FROM usuarios WHERE cedula = ${cedula} AND id != ${Number(usuario.id)}`;
      if (existente.length > 0) {
        return NextResponse.json({ error: 'La cédula ya está registrada por otro usuario' }, { status: 400 });
      }
    }

    // Se actualiza siempre con el valor recibido (o se conserva el actual vía
    // COALESCE si el campo no vino en el body) — la página de perfil manda
    // siempre el estado completo del formulario, no parches parciales.
    const [actualizado] = await sql`
      UPDATE usuarios
      SET cedula = COALESCE(${cedula ?? null}, cedula),
          orcid = CASE WHEN ${orcid !== undefined} THEN ${orcid ?? null} ELSE orcid END,
          genero = CASE WHEN ${genero !== undefined} THEN ${genero || null} ELSE genero END,
          fecha_nacimiento = CASE WHEN ${fecha_nacimiento !== undefined} THEN ${fecha_nacimiento || null} ELSE fecha_nacimiento END,
          foto_url = CASE WHEN ${foto_url !== undefined} THEN ${foto_url || null} ELSE foto_url END,
          horario_tutorias_publico = CASE WHEN ${horario_tutorias_publico !== undefined} THEN ${horario_tutorias_publico ?? false} ELSE horario_tutorias_publico END
      WHERE id = ${Number(usuario.id)}
      RETURNING orcid, foto_url, horario_tutorias_publico
    `;

    if (orcid !== undefined || foto_url !== undefined) {
      await solicitarPublicacionPerfil(sql, Number(usuario.id), usuario.email, {
        orcid: orcid !== undefined ? orcid : undefined,
        foto_url: foto_url !== undefined ? foto_url : undefined,
      });
    }

    return NextResponse.json({ success: true, ...actualizado });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
