import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { getAppSessionFromCookies, createSessionCookieValue, SESSION_COOKIE, type AppSession } from '@/lib/session';
import { SUPERADMIN_EMAILS, logSuperadminAction } from '@/lib/superadmin-auth';

export async function POST() {
  const currentSession = await getAppSessionFromCookies();

  if (!currentSession || !currentSession.impersonatedBy) {
    return NextResponse.json({ error: 'No hay una sesión de impersonación activa' }, { status: 400 });
  }

  const originalEmail = currentSession.impersonatedBy.email;

  if (!SUPERADMIN_EMAILS.includes(originalEmail)) {
    return NextResponse.json({ error: 'No autorizado para restaurar sesión' }, { status: 403 });
  }

  try {
    const sql = neon(process.env.DATABASE_URL as string);

    // Obtener los datos frescos del Superadmin original desde la DB
    const rows = await sql`
      SELECT id, nombres, apellidos, email, rol, modulos_acceso
      FROM usuarios
      WHERE email = ${originalEmail}
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Usuario Superadmin original no encontrado' }, { status: 404 });
    }

    const superUser = rows[0];

    const restoredSession: AppSession = {
      id: superUser.id.toString(),
      email: superUser.email,
      nombres: `${superUser.nombres} ${superUser.apellidos}`.trim(),
      rol: superUser.rol,
      modulos_acceso: superUser.modulos_acceso || [],
    };

    const cookieValue = await createSessionCookieValue(restoredSession);

    // Registrar en audit log
    await logSuperadminAction({
      actor: currentSession,
      tipo_accion: 'impersonate_revert',
      tabla_afectada: 'usuarios',
      detalle: `Fin de 'Ver como': Superadmin (${superUser.email}) regresó a su rol original desde usuario ${currentSession.email} (ID: ${currentSession.id})`,
      resultado: 'OK',
    });

    const response = NextResponse.json({
      success: true,
      redirect: '/superadmin',
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
    console.error('Error al restaurar sesión de Superadmin:', error);
    return NextResponse.json({ error: error.message || 'Error del servidor' }, { status: 500 });
  }
}

