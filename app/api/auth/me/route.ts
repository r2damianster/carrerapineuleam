import { NextResponse } from 'next/server';
import { getUserSessionFromCookies } from '@/lib/userSession';

export async function GET() {
  const usuario = await getUserSessionFromCookies();
  if (!usuario) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }
  return NextResponse.json({ usuario });
}
