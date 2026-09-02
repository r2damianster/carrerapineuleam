import { NextResponse } from 'next/server';
import { requireSuperadmin, logSuperadminAction } from '@/lib/superadmin-auth';
import { isDestructiveSql, runRawSql } from '@/lib/superadmin-db';

export async function POST(request: Request) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  const { query, confirmed } = await request.json();
  if (!query || typeof query !== 'string' || !query.trim()) {
    return NextResponse.json({ error: 'Query vacío' }, { status: 400 });
  }
  if (query.includes(';') && query.trim().indexOf(';') !== query.trim().length - 1) {
    return NextResponse.json({ error: 'Una sola sentencia SQL por ejecución (el driver HTTP de Neon no soporta multi-statement)' }, { status: 400 });
  }
  if (isDestructiveSql(query) && !confirmed) {
    return NextResponse.json(
      { requiresConfirmation: true, error: 'Sentencia destructiva (DROP/TRUNCATE/ALTER, o DELETE/UPDATE sin WHERE) — confirma para ejecutar' },
      { status: 409 }
    );
  }

  try {
    const rows = await runRawSql(query);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'sql',
      detalle: query,
      resultado: `OK — ${Array.isArray(rows) ? rows.length : 0} filas`,
    });
    return NextResponse.json({ rows });
  } catch (error: any) {
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'sql',
      detalle: query,
      resultado: `ERROR: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
