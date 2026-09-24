import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';
import { liderProyectoPropio } from '@/lib/data';
import { SUPERADMIN_EMAILS } from '@/lib/superadmin-auth';
import { puedeVerRegistrosVinculacion } from '@/lib/permisos-supervision';
import { obtenerNotificaciones } from '@/lib/notificaciones';
import PendientesPortal from '@/components/PendientesPortal';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default async function PortalDashboard() {
  const cookieStore = await cookies();
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);

  if (!session) {
    redirect('/portal/login');
  }

  const { modulos_acceso, nombres, rol, email } = session;
  const esDocente = rol === 'profesor' || rol === 'admin';
  const proyectoPropio = liderProyectoPropio[email];

  // Horas acreditables por podcast de Vinculación (Sesión 38) — solo cuenta
  // episodios ya aprobados en /admin/videos, ver lib/horasPodcast.ts. Las
  // horas se calculan recién al aprobar (Sesión 40), no al subir — episodiosPendientes
  // cuenta cuántos le faltan por aprobar al profesor, para que el pasante
  // sepa por qué todavía no ve esas horas.
  let horasPodcastAcreditadas = 0;
  let episodiosPendientes = 0;
  let horasAsistenciaAcreditadas = 0;
  if (rol === 'estudiante') {
    const sql = neon(process.env.DATABASE_URL!);
    const usuarioId = parseInt(session.id, 10);
    const [fila] = await sql`
      SELECT COALESCE(SUM(h.horas_total), 0) AS total
      FROM horas_podcast_pasante h
      JOIN videos v ON v.id = h.video_id
      WHERE h.usuario_id = ${usuarioId} AND v.aprobado_sitio = true
    `;
    horasPodcastAcreditadas = Number(fila?.total || 0);

    const [pendientesFila] = await sql`
      SELECT COUNT(*) AS total FROM videos
      WHERE aprobado_sitio = false AND ${usuarioId} = ANY(participantes_estudiantes)
    `;
    episodiosPendientes = Number(pendientesFila?.total || 0);

    const [filaAsistencia] = await sql`
      SELECT COALESCE(SUM(ha.horas), 0) AS total FROM horas_asistencia_instructor ha WHERE ha.usuario_id = ${usuarioId}
    `;
    horasAsistenciaAcreditadas = Number(filaAsistencia?.total || 0);
  }

  const notificaciones = await obtenerNotificaciones(session);

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido al Portal PINE</h1>
            <p className="text-gray-600 mt-2">Hola, {nombres}. Selecciona el módulo al que deseas acceder:</p>
          </div>

          <PendientesPortal notificaciones={notificaciones} />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Yo y la Carrera — datos personales + dashboard PINE (metas e indicadores del proyecto). Cualquier docente/admin. */}
            {esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Yo y la Carrera</h3>
                <p className="text-gray-600 mb-4 text-sm">Tu perfil, tus contribuciones académicas y los indicadores del proyecto.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/portal/perfil" className="text-indigo-600 hover:underline">» Ver/Editar Mi Perfil</Link>
                  <Link href="/contribuciones/new" className="text-indigo-600 hover:underline">» Registrar Contribución (artículo, libro, ponencia…)</Link>
                  <Link href="/gestion-carrera" className="text-indigo-600 hover:underline">» Registrar Evento o Podcast</Link>
                  <Link href="/contribuciones" className="text-indigo-600 hover:underline">» Ver Contribuciones Registradas</Link>
                  <Link href="/pine-dashboard" className="text-indigo-600 hover:underline">» Ver Dashboard PINE (metas e indicadores)</Link>
                </div>
              </div>
            )}


            {/* Vinculación — Registros: tareas diarias. Solo pasantes (rol estudiante),
                superadmin y líder de Vinculación (lib/permisos-supervision.ts). El pasante
                nunca tiene modulos_acceso:vinculacion — su acceso real es por
                espacio_instructores (lib/permisos-espacio.ts). */}
            {puedeVerRegistrosVinculacion(session) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Registros de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Registro+Pre-Test, asistencia, evaluación final y difusión de tu espacio.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/registrar-evaluar" className="text-blue-600 hover:underline">» Registrar y evaluar beneficiario</Link>
                  <Link href="/vinculacion/asistencia" className="text-blue-600 hover:underline">» Asistencia</Link>
                  <Link href="/vinculacion/evaluacion-final" className="text-blue-600 hover:underline">» Evaluación final del beneficiario</Link>
                  {rol === 'estudiante' && (
                    <Link href="/vinculacion/difusion" className="text-blue-600 hover:underline">» Registrar podcast o evento</Link>
                  )}
                </div>
              </div>
            )}

            {/* Pasante de vinculación con funciones de investigación asignadas —
                tarjeta aparte porque la de "Registros de Vinculación" de arriba
                está gateada a modulos_acceso:vinculacion, que un pasante nunca tiene
                (esa lista es solo para profesores). */}
            {rol === 'estudiante' && modulos_acceso.includes('investigacion') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Investigación (Vinculación)</h3>
                <p className="text-gray-600 mb-4 text-sm">Reporta las actividades de investigación que realizas además de tus horas de vinculación.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/investigacion-actividades" className="text-emerald-600 hover:underline">» Reportar Actividades</Link>
                </div>
              </div>
            )}

            {/* Mi Avance (Sesión 40) — siempre visible para el pasante, aunque
                todavía no haya registrado nada: horas, espacios asignados,
                beneficiarios, asistencias, evaluaciones y encuestas de su
                espacio. Antes solo existía esta tarjeta de horas de podcast y
                solo aparecía si ya tenía horas>0 — quedaba sin nada que ver. */}
            {rol === 'estudiante' && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-amber-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">📊 Mi Avance</h3>
                <p className="text-gray-600 mb-2 text-sm">Tus horas acreditables, espacios asignados, beneficiarios y evaluaciones registradas.</p>
                <p className="text-3xl font-bold text-amber-600 mb-1">{horasPodcastAcreditadas + horasAsistenciaAcreditadas} h <span className="text-sm font-normal text-gray-500">acreditadas ({horasPodcastAcreditadas} podcast + {horasAsistenciaAcreditadas} asistencia)</span></p>
                {episodiosPendientes > 0 && (
                  <p className="text-xs text-orange-600 mb-3">⏳ Tienes {episodiosPendientes} episodio(s) esperando aprobación del profesor — sus horas se suman cuando se apruebe.</p>
                )}
                <Link href="/portal/mi-avance" className="text-amber-600 hover:underline">» Ver mi avance completo</Link>
              </div>
            )}

            {/* Vinculación — Gestión: solo profesor/admin */}
            {modulos_acceso.includes('vinculacion') && esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Crear espacios y asignar instructores y pasantes.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/espacios" className="text-purple-600 hover:underline">» Administrar Espacios</Link>
                  <Link href="/vinculacion/pasantes" className="text-purple-600 hover:underline">» Administrar Pasantes</Link>
                  <Link href="/vinculacion/investigacion-actividades" className="text-purple-600 hover:underline">» Ver Actividades de Investigación</Link>
                </div>
              </div>
            )}

            {/* Vinculación — Supervisión: profesores supervisores (Sesión 49). Cada uno ve
                solo sus espacios; superadmin/líderes ven todo (esSuperAdminOLider). */}
            {modulos_acceso.includes('vinculacion') && esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Supervisión de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Aprueba asistencias de tus pasantes y revisa sus indicadores.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/supervisar" className="text-indigo-600 hover:underline">» Supervisar Asistencia</Link>
                  <Link href="/vinculacion/supervisar/indicadores" className="text-indigo-600 hover:underline">» Panel de Supervisión (Indicadores)</Link>
                </div>
              </div>
            )}

            {/* Investigación — espacios + informes mensuales (Groq + selección de registros del período) */}
            {(modulos_acceso.includes('investigacion') || modulos_acceso.includes('admin')) && esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-emerald-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestionar Investigación</h3>
                <p className="text-gray-600 mb-4 text-sm">Espacios de investigación e informes mensuales de actividades.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/investigacion/espacios" className="text-emerald-600 hover:underline">» Administrar Espacios</Link>
                  <Link href="/investigacion/informes" className="text-emerald-600 hover:underline">» Generar Informe Mensual de Investigación</Link>
                </div>
              </div>
            )}

            {/* Proyecto propio del líder (German, Verónica) — sin link todavía, no hay panel de edición por proyecto */}
            {proyectoPropio && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestionar {proyectoPropio}</h3>
                <p className="text-gray-600 mb-4 text-sm">Tu proyecto dentro de la carrera.</p>
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 text-sm italic">Próximamente</span>
                </div>
              </div>
            )}

            {/* Utilidades — cualquier docente */}
            {esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-teal-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Utilidades</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  Generación de documentos administrativos y académicos de la carrera.
                </p>
                <div className="flex flex-col gap-2">
                  <Link href="/utilidades/acta-tecnica" className="text-teal-600 hover:underline">» Acta Técnica</Link>
                  <Link href="/utilidades/oficios" className="text-teal-600 hover:underline">» Generador de Oficios</Link>
                  <Link href="/utilidades/convocatorias" className="text-teal-600 hover:underline">» Convocatorias</Link>
                  <Link href="/utilidades/pat-maestria" className="text-teal-600 hover:underline">» PATs Maestría</Link>
                  <Link href="/utilidades/pares-lectores" className="text-teal-600 hover:underline">» Pares Lectores</Link>
                  <Link href="/utilidades/certificados" className="text-teal-600 hover:underline">» Certificados</Link>
                </div>
              </div>
            )}

            {/* Módulo: Administrador de Sitio — solo líder/colider de este proyecto */}
            {modulos_acceso.includes('contenido_sitio') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Administrador de sitio</h3>
                <p className="text-gray-600 mb-4 text-sm">Contenido del proyecto Innovaciones Pedagógicas e Internacionalización (2026-2028): miembros, publicaciones, videos, noticias, documentos, fotos y proyectos.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/admin" className="text-red-600 hover:underline">» Panel de Contenido</Link>
                </div>
              </div>
            )}

            {/* Superadmin — acceso absoluto a la Neon. Atribuido única y exclusivamente a arturo.rodriguez@uleam.edu.ec */}
            {modulos_acceso.includes('superadmin') && SUPERADMIN_EMAILS.includes(email) && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-gray-800 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Superadmin</h3>
                <p className="text-gray-600 mb-4 text-sm">Acceso absoluto a la base de datos: explorador de tablas, edición directa y consola SQL.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/superadmin" className="text-gray-800 hover:underline">» Panel Superadmin</Link>
                </div>
              </div>
            )}

          </div>

          {modulos_acceso.length === 0 && rol !== 'estudiante' && (
            <div className="bg-yellow-50 p-6 rounded-lg text-yellow-800 text-center">
              Tu cuenta no tiene módulos asignados aún. Por favor contacta al administrador.
            </div>
          )}

        </div>
      </div>
      <Footer context="general" />
    </>
  );
}
