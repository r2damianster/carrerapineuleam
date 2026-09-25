import { NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';
import { registrarFotoEnBanco } from '@/lib/ingestaFotos';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || usuario.rol === 'secretaria') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacio_id = searchParams.get('espacio_id');
    if (!espacio_id) {
      return NextResponse.json({ success: true, data: [] });
    }
    if (!(await puedeOperarEspacio(usuario, parseInt(espacio_id)))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const registros = await sql`
      SELECT id, fecha, observaciones, creado_en
      FROM asistencia_espacio
      WHERE espacio_id = ${parseInt(espacio_id)}
      ORDER BY fecha DESC
    `;
    return NextResponse.json({ success: true, data: registros });
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

    const {
      espacio_id, fecha, beneficiarios_presentes, observaciones, hora_inicio, hora_fin, foto_url, foto_public_id,
      instructores_presentes, invitados_presentes,
      hay_menores, // WP5.1 — declaración de menores al subir la foto de evidencia
    } = await request.json();

    if (!espacio_id || !fecha) {
      return NextResponse.json({ error: 'espacio_id y fecha son requeridos' }, { status: 400 });
    }
    if (!Array.isArray(beneficiarios_presentes) || beneficiarios_presentes.length === 0) {
      return NextResponse.json({ error: 'Selecciona al menos un beneficiario presente' }, { status: 400 });
    }
    const titulares: number[] = Array.isArray(instructores_presentes) ? instructores_presentes : [];
    const invitados: number[] = Array.isArray(invitados_presentes) ? invitados_presentes : [];
    const repetidos = invitados.filter((id) => titulares.includes(id));
    if (repetidos.length > 0) {
      return NextResponse.json({ error: 'Un pasante ya titular del espacio no puede marcarse también como invitado' }, { status: 400 });
    }
    if (!hora_inicio || !hora_fin) {
      return NextResponse.json({ error: 'Hora de inicio y de fin son requeridas' }, { status: 400 });
    }
    if (hora_fin <= hora_inicio) {
      return NextResponse.json({ error: 'La hora de fin debe ser posterior a la hora de inicio' }, { status: 400 });
    }
    if (!foto_url) {
      return NextResponse.json({ error: 'La foto de evidencia es obligatoria' }, { status: 400 });
    }
    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    // Ventana de 48h: no se puede registrar asistencia de un día futuro ni de más de 2 días atrás
    // (fecha solo guarda el día, sin hora — se usa el día calendario de Ecuador, UTC-5)
    const hoyEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const fechaClub = new Date(`${fecha}T00:00:00Z`);
    const fechaLimite = new Date(`${hoyEcuador}T00:00:00Z`);
    const diffDias = Math.floor((fechaLimite.getTime() - fechaClub.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDias < 0) {
      return NextResponse.json({ error: 'No puedes registrar asistencia de una fecha futura' }, { status: 400 });
    }
    if (diffDias > 2) {
      return NextResponse.json({ error: 'Solo puedes registrar asistencia hasta 48 horas después del día del club' }, { status: 400 });
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    let asistenciaId: number | null = null;
    try {
      await client.query('BEGIN');

      if (titulares.length > 0) {
        const { rows: validos } = await client.query(
          `SELECT usuario_id FROM espacio_instructores WHERE espacio_id = $1 AND usuario_id = ANY($2::int[])`,
          [espacio_id, titulares]
        );
        if (validos.length !== titulares.length) {
          throw new Error('Uno o más instructores no pertenecen a este espacio');
        }
      }
      if (invitados.length > 0) {
        const { rows: validos } = await client.query(
          `SELECT id FROM usuarios WHERE rol = 'estudiante' AND activado = true AND id = ANY($1::int[])`,
          [invitados]
        );
        if (validos.length !== invitados.length) {
          throw new Error('Uno o más pasantes invitados no son válidos');
        }
      }

      const { rows: [asistencia] } = await client.query(
        `INSERT INTO asistencia_espacio (espacio_id, fecha, observaciones, registrado_por, hora_inicio, hora_fin, foto_url, foto_public_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [espacio_id, fecha, observaciones ?? null, usuario.id, hora_inicio, hora_fin, foto_url ?? null, foto_public_id ?? null]
      );
      asistenciaId = asistencia.id;

      for (const beneficiarioId of beneficiarios_presentes as number[]) {
        await client.query(
          `INSERT INTO asistencia_beneficiarios (asistencia_id, beneficiario_id) VALUES ($1, $2)`,
          [asistencia.id, beneficiarioId]
        );
      }

      for (const usuarioId of titulares) {
        await client.query(
          `INSERT INTO asistencia_instructores (asistencia_id, usuario_id, tipo) VALUES ($1, $2, 'titular')`,
          [asistencia.id, usuarioId]
        );
      }
      for (const usuarioId of invitados) {
        await client.query(
          `INSERT INTO asistencia_instructores (asistencia_id, usuario_id, tipo) VALUES ($1, $2, 'invitado')`,
          [asistencia.id, usuarioId]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
      await pool.end();
    }

    // WP5.1: ingestar la foto al banco DESPUÉS del COMMIT principal.
    // Una falla aquí NO revierte la asistencia ya guardada.
    // Todos los espacios son area='vinculacion' → proyectos=['vinculacion'] (asunción validada en WP0).
    if (foto_url && asistenciaId !== null) {
      const sql = neon(process.env.DATABASE_URL!);
      // Título legible: "Nombre del espacio — dd/mm/aaaa" (si el nombre no se puede leer, la ingesta pone "Foto #n").
      let tituloFoto: string | null = null;
      try {
        const [espacio] = await sql`SELECT nombre FROM "espacios_enseñanza" WHERE id = ${espacio_id}`;
        if (espacio?.nombre) tituloFoto = `${espacio.nombre} — ${String(fecha).slice(0, 10).split('-').reverse().join('/')}`;
      } catch { /* sin título: la ingesta lo numera */ }
      await registrarFotoEnBanco(sql, {
        titulo: tituloFoto,
        url: foto_url,
        cloudinary_public_id: foto_public_id ?? null,
        origen: 'asistencia',
        fuente_id: String(asistenciaId),
        fecha_evento: fecha,
        proyectos: ['vinculacion'],
        subido_por_id: Number(usuario.id),
        subido_por: usuario.email,
        hayMenores: hay_menores === true,
        esExterno: false,
      });
    }

    return NextResponse.json({ success: true, id: asistenciaId }, { status: 201 });
  } catch (error: any) {
    console.error('Asistencia insert error:', error);
    return NextResponse.json({ error: 'Error al guardar', details: error.message }, { status: 500 });
  }
}
