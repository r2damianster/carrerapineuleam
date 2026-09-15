import { NextResponse } from 'next/server';
import { requireSuperadmin, logSuperadminAction } from '@/lib/superadmin-auth';
import { listTables, setTableComment } from '@/lib/superadmin-db';

export async function GET() {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const tables = await listTables();
    return NextResponse.json({ tables });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { table, description } = await request.json();
    if (!table || typeof table !== 'string') {
      return NextResponse.json({ error: 'Falta "table"' }, { status: 400 });
    }
    await setTableComment(table, description ?? null);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_update',
      tabla_afectada: table,
      detalle: `Descripción de tabla actualizada: ${description ? JSON.stringify(description) : '(borrada)'}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
