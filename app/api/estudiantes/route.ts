import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { getAppSessionFromCookies } from '@/lib/session';

export async function GET() {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const estudiantes = await sql`
      SELECT u.id, u.nombres, u.apellidos, u.email, u.activado,
             COALESCE(
               json_agg(
                 json_build_object('id', e.id, 'nombre', e.nombre)
               ) FILTER (WHERE e.id IS NOT NULL),
               '[]'
             ) AS espacios
      FROM usuarios u
      LEFT JOIN espacio_instructores ei ON ei.usuario_id = u.id
      LEFT JOIN espacios_enseñanza e ON e.id = ei.espacio_id AND e.area = 'vinculacion'
      WHERE u.rol = 'estudiante'
      GROUP BY u.id, u.nombres, u.apellidos, u.email, u.activado
      ORDER BY u.nombres ASC
    `;

    return NextResponse.json({ success: true, data: estudiantes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Pre-registra un pasante (solo nombres/apellidos/email, sin password —
// activa su cuenta el mismo con la clave que elija en su primer login).
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol) || !usuario.modulos_acceso.includes('vinculacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { nombres, apellidos, email } = await request.json();
    if (!nombres || !apellidos || !email) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);
    const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const [nuevo] = await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado)
      VALUES (${nombres}, ${apellidos}, ${String(email).trim().toLowerCase()}, ${placeholderHash}, 'estudiante', '{}', false)
      RETURNING id, nombres, apellidos, email, activado
    `;

    return NextResponse.json({ success: true, data: nuevo }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 });
    }
    console.error('Pasante create error:', error);
    return NextResponse.json({ error: 'Error registrando el pasante', details: error.message }, { status: 500 });
  }
}
