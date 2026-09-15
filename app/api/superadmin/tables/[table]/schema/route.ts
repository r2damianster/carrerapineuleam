import { NextResponse } from 'next/server';
import { requireSuperadmin, logSuperadminAction } from '@/lib/superadmin-auth';
import {
  assertValidTable,
  getTableColumns,
  getPrimaryKeyColumn,
  getTableComment,
  setTableComment,
} from '@/lib/superadmin-db';

export async function GET(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    await assertValidTable(params.table);
    const [columns, primaryKey, description] = await Promise.all([
      getTableColumns(params.table),
      getPrimaryKeyColumn(params.table),
      getTableComment(params.table),
    ]);
    return NextResponse.json({ columns, primaryKey, description });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { description } = await request.json();
    await setTableComment(params.table, description ?? null);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_update',
      tabla_afectada: params.table,
      detalle: `Descripción de tabla actualizada: ${description ? JSON.stringify(description) : '(borrada)'}`,
    });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
