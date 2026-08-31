import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAppSessionFromCookies } from '@/lib/session';
import { puedeOperarEspacio } from '@/lib/permisos-espacio';

export async function GET(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const espacioIdParam = searchParams.get('espacio_id');

    const sql = neon(process.env.DATABASE_URL!);

    // Con espacio_id: solo los beneficiarios inscritos en ese espacio (requiere
    // ser profesor de vinculación o instructor de ese espacio). Sin espacio_id:
    // lista global (uso del profesor).
    const beneficiarios = espacioIdParam
      ? await (async () => {
          const espacio_id = parseInt(espacioIdParam);
          if (!(await puedeOperarEspacio(usuario, espacio_id))) {
            return null;
          }
          return sql`
            SELECT u.id, u.nombres, u.apellidos
            FROM inscripciones_espacio ie
            JOIN usuarios u ON ie.beneficiario_id = u.id
            WHERE ie.espacio_id = ${espacio_id}
            ORDER BY u.nombres ASC
          `;
        })()
      : await sql`
          SELECT id, nombres, apellidos
          FROM usuarios
          WHERE rol = 'beneficiario'
          ORDER BY nombres ASC
        `;

    if (beneficiarios === null) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: beneficiarios });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Crea un beneficiario nuevo (sin cuenta/password — nunca inicia sesión) y lo
// asigna de una vez al espacio indicado. email/password_hash son NOT NULL en
// Neon; si no hay email real se genera uno interno, y el password_hash es
// aleatorio e inutilizable (nadie lo conoce, no hay flujo de login para esto).
export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const {
      nombres, apellidos, contacto, email, espacio_id,
      edad, tiene_discapacidad, tipo_discapacidad,
      situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso,
    } = await request.json();

    if (!nombres || !apellidos || !espacio_id) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    if (!(await puedeOperarEspacio(usuario, espacio_id))) {
      return NextResponse.json({ error: 'No autorizado en este espacio' }, { status: 403 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const emailFinal = email && email.trim()
      ? email.trim().toLowerCase()
      : `beneficiario+${Date.now()}-${randomBytes(3).toString('hex')}@sin-email.pine`;
    const passwordHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);

    const [nuevoUsuario] = await sql`
      INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso)
      VALUES (${nombres}, ${apellidos}, ${emailFinal}, ${passwordHash}, 'beneficiario', '{}')
      RETURNING id, nombres, apellidos
    `;

    await sql`
      INSERT INTO perfiles_beneficiarios (
        usuario_id, contacto, edad, tiene_discapacidad, tipo_discapacidad,
        situacion_ocupacional, rol_laboral, nivel_educativo, carrera, curso
      )
      VALUES (
        ${nuevoUsuario.id}, ${contacto || null}, ${edad || null}, ${!!tiene_discapacidad}, ${tipo_discapacidad || null},
        ${situacion_ocupacional || null}, ${rol_laboral || null}, ${nivel_educativo || null}, ${carrera || null}, ${curso || null}
      )
    `;

    await sql`
      INSERT INTO inscripciones_espacio (espacio_id, beneficiario_id)
      VALUES (${espacio_id}, ${nuevoUsuario.id})
      ON CONFLICT DO NOTHING
    `;

    return NextResponse.json({ success: true, data: nuevoUsuario }, { status: 201 });
  } catch (error: any) {
    if (error.message?.includes('usuarios_email_key')) {
      return NextResponse.json({ error: 'Ese email ya está registrado' }, { status: 400 });
    }
    console.error('Beneficiario create error:', error);
    return NextResponse.json({ error: 'Error registrando el beneficiario', details: error.message }, { status: 500 });
  }
}
