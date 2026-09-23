import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { requireSuperadmin, logSuperadminAction } from '@/lib/superadmin-auth';
import { createSessionCookieValue, SESSION_COOKIE, type AppSession } from '@/lib/session';

export async function POST(request: Request) {
  const currentSession = await requireSuperadmin();
  if (!currentSession) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  }

  try {
    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Se requiere ID de usuario objetivo' }, { status: 400 });
    }

    const sql = neon(process.env.DATABASE_URL as string);
    const rows = await sql`
      SELECT id, nombres, apellidos, email, rol, modulos_acceso
      FROM usuarios
      WHERE id = ${Number(targetUserId)}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario objetivo no encontrado' }, { status: 404 });
    }

    const targetUser = rows[0];

    // Mantener la identidad del Superadmin original en impersonatedBy
    const originalActor = currentSession.impersonatedBy || {
      id: currentSession.id,
      email: currentSession.email,
      nombres: currentSession.nombres,
    };

    const targetSession: AppSession = {
      id: targetUser.id.toString(),
      email: targetUser.email,
      nombres: `${targetUser.nombres} ${targetUser.apellidos}`.trim(),
      rol: targetUser.rol,
      modulos_acceso: targetUser.modulos_acceso || [],
      impersonatedBy: originalActor,
    };

    const cookieValue = await createSessionCookieValue(targetSession);

    // Registrar en audit log
    await logSuperadminAction({
      actor: currentSession,
      tipo_accion: 'impersonate',
      tabla_afectada: 'usuarios',
      detalle: `Inicio de 'Ver como': Superadmin (${originalActor.email}) se identificó como ${targetUser.email} (ID: ${targetUser.id}, Rol: ${targetUser.rol})`,
      resultado: 'OK',
    });

    const response = NextResponse.json({
      success: true,
      redirect: '/portal/dashboard',
      target: {
        id: targetSession.id,
        nombres: targetSession.nombres,
        rol: targetSession.rol,
      },
    });

    response.cookies.set({
      name: SESSION_COOKIE.name,
      value: cookieValue,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_COOKIE.maxAge,
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error al iniciar impersonación:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

