import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default async function PortalDashboard() {
  const cookieStore = await cookies();
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);

  if (!session) {
    redirect('/portal/login');
  }

  const { modulos_acceso, nombres, rol } = session;
  const esDocente = rol === 'profesor' || rol === 'admin';

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Bienvenido al Portal PINE</h1>
            <p className="text-gray-600 mt-2">Hola, {nombres}. Selecciona el módulo al que deseas acceder:</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Vinculación — Registros: tareas diarias, estudiante-instructor o profesor */}
            {modulos_acceso.includes('vinculacion') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Registros de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Asistencia, beneficiarios, test MCER, encuestas y difusión de tu espacio.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/asistencia" className="text-blue-600 hover:underline">» Registrar Asistencia</Link>
                  <Link href="/vinculacion/beneficiarios" className="text-blue-600 hover:underline">» Registrar Beneficiarios</Link>
                  <Link href="/vinculacion/test-mcer" className="text-blue-600 hover:underline">» Test MCER</Link>
                  <Link href="/vinculacion/encuesta" className="text-blue-600 hover:underline">» Encuesta</Link>
                  <Link href="/vinculacion/difusion" className="text-blue-600 hover:underline">» Difusión / Evento</Link>
                </div>
              </div>
            )}

            {/* Vinculación — Gestión: solo profesor/admin */}
            {modulos_acceso.includes('vinculacion') && esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-purple-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Crear espacios, asignar instructores y supervisar el programa.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/espacios" className="text-purple-600 hover:underline">» Administrar Espacios</Link>
                  <Link href="/vinculacion/pasantes" className="text-purple-600 hover:underline">» Administrar Pasantes</Link>
                </div>
              </div>
            )}

            {/* Módulo: Investigación */}
            {modulos_acceso.includes('investigacion') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestionar Investigación</h3>
                <p className="text-gray-600 mb-4 text-sm">Próximamente: artículos científicos y publicaciones.</p>
                <div className="flex flex-col gap-2">
                  <span className="text-gray-400 text-sm italic">Sin opciones disponibles todavía</span>
                </div>
              </div>
            )}

            {/* Gestión de Carrera: cualquier docente, sin importar el módulo */}
            {esDocente && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de Carrera</h3>
                <p className="text-gray-600 mb-4 text-sm">Registro de eventos y difusión a nivel de carrera (investigación, vinculación o asignatura).</p>
                <div className="flex flex-col gap-2">
                  <Link href="/gestion-carrera" className="text-indigo-600 hover:underline">» Registrar Evento</Link>
                </div>
              </div>
            )}

            {/* Módulo: Dashboard Estadístico (Admin) */}
            {modulos_acceso.includes('admin') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-yellow-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Indicadores</h3>
                <p className="text-gray-600 mb-4 text-sm">Visualización en tiempo real del progreso de las metas e indicadores del proyecto.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/pine-dashboard" className="text-yellow-600 hover:underline">» Ver Dashboard PINE</Link>
                </div>
              </div>
            )}

            {/* Módulo: Gestión de MI PROYECTO — solo líder/colider de este proyecto */}
            {modulos_acceso.includes('contenido_sitio') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-red-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Gestión de MI PROYECTO</h3>
                <p className="text-gray-600 mb-4 text-sm">Contenido del proyecto Innovaciones Pedagógicas e Internacionalización (2026-2028): miembros, publicaciones, videos, noticias, documentos.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/admin" className="text-red-600 hover:underline">» Panel de Contenido</Link>
                </div>
              </div>
            )}

          </div>

          {modulos_acceso.length === 0 && (
            <div className="bg-yellow-50 p-6 rounded-lg text-yellow-800 text-center">
              Tu cuenta no tiene módulos asignados aún. Por favor contacta al administrador.
            </div>
          )}

        </div>
      </div>
      <Footer />
    </>
  );
}
