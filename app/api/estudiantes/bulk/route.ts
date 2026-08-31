import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { getAppSessionFromCookies } from '@/lib/session';

interface FilaEntrada {
  nombres?: string;
  apellidos?: string;
  email?: string;
}

interface FilaResultado {
  nombres: string;
  apellidos: string;
  email: string;
  status: 'ok' | 'error' | 'creado' | 'omitido';
  motivo?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarFilas(rows: FilaEntrada[], existentes: Set<string>): FilaResultado[] {
  const vistosEnArchivo = new Set<string>();
  return rows.map((row): FilaResultado => {
    const nombres = (row.nombres ?? '').trim();
    const apellidos = (row.apellidos ?? '').trim();
    const email = (row.email ?? '').trim().toLowerCase();

    if (!nombres || !apellidos || !email) {
      return { nombres, apellidos, email, status: 'error', motivo: 'Faltan datos (nombres/apellidos/email)' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { nombres, apellidos, email, status: 'error', motivo: 'Email con formato inválido' };
    }
    if (vistosEnArchivo.has(email)) {
      return { nombres, apellidos, email, status: 'error', motivo: 'Email repetido en el mismo archivo' };
    }
    if (existentes.has(email)) {
      return { nombres, apellidos, email, status: 'error', motivo: 'Ese email ya está registrado' };
    }
    vistosEnArchivo.add(email);
    return { nombres, apellidos, email, status: 'ok' };
  });
}

export async function POST(request: Request) {
  try {
    const usuario = await getAppSessionFromCookies();
    if (!usuario || !['profesor', 'admin'].includes(usuario.rol) || !usuario.modulos_acceso.includes('vinculacion')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { rows, dryRun } = await request.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No hay filas para procesar' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL!);

    const emailsCandidatos = rows
      .map((r: FilaEntrada) => (r.email ?? '').trim().toLowerCase())
      .filter(Boolean);
    const existentesRows = emailsCandidatos.length > 0
      ? await sql`SELECT email FROM usuarios WHERE email = ANY(${emailsCandidatos})`
      : [];
    const existentes = new Set(existentesRows.map((r: any) => r.email));

    const validadas = validarFilas(rows, existentes);

    if (dryRun) {
      return NextResponse.json({ success: true, data: validadas });
    }

    // Crear solo las filas válidas
    const resultado: FilaResultado[] = [];
    for (const fila of validadas) {
      if (fila.status !== 'ok') {
        resultado.push({ ...fila, status: 'omitido' });
        continue;
      }
      try {
        const placeholderHash = await bcrypt.hash(randomBytes(24).toString('hex'), 10);
        await sql`
          INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol, modulos_acceso, activado)
          VALUES (${fila.nombres}, ${fila.apellidos}, ${fila.email}, ${placeholderHash}, 'estudiante', '{}', false)
        `;
        resultado.push({ ...fila, status: 'creado' });
      } catch (err: any) {
        resultado.push({ ...fila, status: 'omitido', motivo: err.message?.includes('usuarios_email_key') ? 'Ese email ya está registrado' : 'Error al crear' });
      }
    }

    return NextResponse.json({ success: true, data: resultado });
  } catch (error: any) {
    console.error('Bulk pasantes error:', error);
    return NextResponse.json({ error: 'Error procesando el archivo', details: error.message }, { status: 500 });
  }
}
