import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/superadmin-auth';
import { listTables } from '@/lib/superadmin-db';

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
