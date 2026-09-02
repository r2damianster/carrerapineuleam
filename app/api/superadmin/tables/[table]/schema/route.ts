import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/superadmin-auth';
import { assertValidTable, getTableColumns, getPrimaryKeyColumn } from '@/lib/superadmin-db';

export async function GET(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    await assertValidTable(params.table);
    const [columns, primaryKey] = await Promise.all([
      getTableColumns(params.table),
      getPrimaryKeyColumn(params.table),
    ]);
    return NextResponse.json({ columns, primaryKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
