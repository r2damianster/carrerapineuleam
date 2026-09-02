import { NextResponse } from 'next/server';
import { requireSuperadmin, logSuperadminAction } from '@/lib/superadmin-auth';
import { getRows, insertRow, updateRow, deleteRow } from '@/lib/superadmin-db';

export async function GET(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? '1');
    const limit = Number(searchParams.get('limit') ?? '50');
    const sortColumn = searchParams.get('sortColumn') ?? undefined;
    const sortDir = (searchParams.get('sortDir') as 'asc' | 'desc' | null) ?? undefined;

    const result = await getRows(params.table, { page, limit, sortColumn, sortDir });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function POST(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const data = await request.json();
    const row = await insertRow(params.table, data);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_insert',
      tabla_afectada: params.table,
      detalle: JSON.stringify(data),
      resultado: 'OK',
    });
    return NextResponse.json({ row });
  } catch (error: any) {
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_insert',
      tabla_afectada: params.table,
      detalle: '(ver body del request)',
      resultado: `ERROR: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { pkValue, data } = await request.json();
    if (pkValue === undefined) return NextResponse.json({ error: 'Falta pkValue' }, { status: 400 });

    const row = await updateRow(params.table, pkValue, data);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_update',
      tabla_afectada: params.table,
      detalle: JSON.stringify({ pkValue, data }),
      resultado: 'OK',
    });
    return NextResponse.json({ row });
  } catch (error: any) {
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_update',
      tabla_afectada: params.table,
      detalle: '(ver body del request)',
      resultado: `ERROR: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(request: Request, { params }: { params: { table: string } }) {
  const usuario = await requireSuperadmin();
  if (!usuario) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

  try {
    const { pkValue } = await request.json();
    if (pkValue === undefined) return NextResponse.json({ error: 'Falta pkValue' }, { status: 400 });

    const row = await deleteRow(params.table, pkValue);
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_delete',
      tabla_afectada: params.table,
      detalle: JSON.stringify({ pkValue }),
      resultado: 'OK',
    });
    return NextResponse.json({ row });
  } catch (error: any) {
    await logSuperadminAction({
      actor: usuario,
      tipo_accion: 'crud_delete',
      tabla_afectada: params.table,
      detalle: '(ver body del request)',
      resultado: `ERROR: ${error.message}`,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
