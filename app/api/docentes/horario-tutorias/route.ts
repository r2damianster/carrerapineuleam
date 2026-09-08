import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { DEPENDENCIA_PINE } from '@/app/utilidades/_lib/docentes';

interface Franja {
  id: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

const ORDEN_DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`
      SELECT u.id AS usuario_id, u.nombres, u.apellidos, u.titulo_grado,
             h.id, h.dia_semana, h.hora_inicio, h.hora_fin
      FROM usuarios u
      JOIN perfiles_horario_tutorias h ON h.usuario_id = u.id
      WHERE u.rol = 'profesor' AND u.dependencia = ${DEPENDENCIA_PINE} AND u.horario_tutorias_publico = true
      ORDER BY u.apellidos ASC, u.nombres ASC
    `;

    const porProfesor = new Map<number, { usuario_id: number; nombre: string; franjas: Franja[] }>();
    for (const row of rows as any[]) {
      if (!porProfesor.has(row.usuario_id)) {
        const nombre = `${row.titulo_grado ? row.titulo_grado + ' ' : ''}${row.nombres} ${row.apellidos}`.replace(/\s+/g, ' ').trim();
        porProfesor.set(row.usuario_id, { usuario_id: row.usuario_id, nombre, franjas: [] });
      }
      porProfesor.get(row.usuario_id)!.franjas.push({
        id: row.id,
        dia_semana: row.dia_semana,
        hora_inicio: row.hora_inicio,
        hora_fin: row.hora_fin,
      });
    }

    const resultado = Array.from(porProfesor.values());
    for (const profesor of resultado) {
      profesor.franjas.sort((a, b) => {
        const diaDiff = ORDEN_DIAS.indexOf(a.dia_semana) - ORDEN_DIAS.indexOf(b.dia_semana);
        return diaDiff !== 0 ? diaDiff : a.hora_inicio.localeCompare(b.hora_inicio);
      });
    }

    return NextResponse.json(resultado);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
