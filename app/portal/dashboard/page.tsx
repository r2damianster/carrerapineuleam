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

  const { modulos_acceso, nombres } = session;

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
            
            {/* Módulo: Vinculación */}
            {modulos_acceso.includes('vinculacion') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-blue-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Vinculación</h3>
                <p className="text-gray-600 mb-4 text-sm">Gestiona los test MCER, encuestas y reportes de difusión (podcasts/eventos).</p>
                <div className="flex flex-col gap-2">
                  <Link href="/vinculacion/test-mcer" className="text-blue-600 hover:underline">» Tests MCER</Link>
                  <Link href="/vinculacion/difusion" className="text-blue-600 hover:underline">» Difusión / Audiencias</Link>
                  <Link href="/vinculacion/encuesta" className="text-blue-600 hover:underline">» Encuestas de Satisfacción</Link>
                </div>
              </div>
            )}

            {/* Módulo: Investigación / Docencia */}
            {modulos_acceso.includes('investigacion') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-green-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Docencia e Investigación</h3>
                <p className="text-gray-600 mb-4 text-sm">Creación de ciclos, asignación de aulas y carga de calificaciones PINE.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/docencia" className="text-green-600 hover:underline">» Panel de Gestión Docente</Link>
                  <Link href="/registro" className="text-green-600 hover:underline">» Registrar Nuevos Perfiles</Link>
                </div>
              </div>
            )}

            {/* Módulo: Dashboard Estadístico (Admin) */}
            {modulos_acceso.includes('admin') && (
              <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-yellow-500 hover:shadow-lg transition">
                <h3 className="text-xl font-bold text-gray-800 mb-2">Indicadores (Gerencia)</h3>
                <p className="text-gray-600 mb-4 text-sm">Visualización en tiempo real del progreso de las metas e indicadores del proyecto.</p>
                <div className="flex flex-col gap-2">
                  <Link href="/pine-dashboard" className="text-yellow-600 hover:underline">» Ver Dashboard PINE</Link>
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
