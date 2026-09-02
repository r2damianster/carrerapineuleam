import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireSuperadmin } from '@/lib/superadmin-auth';

export async function GET(request: Request) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 500);

    const sql = neon(process.env.DATABASE_URL as string);
    const rows = await sql`
      SELECT id, actor_email, creado_en, tipo_accion, tabla_afectada, detalle, resultado
      FROM superadmin_audit_log
      ORDER BY creado_en DESC
      LIMIT ${limit}
    `;
    return NextResponse.json({ rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
