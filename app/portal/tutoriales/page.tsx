import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { verifySessionCookieValue, SESSION_COOKIE } from '@/lib/session';
import { tutorialesParaRol } from '@/lib/tutoriales';
import Header from '@/components/Header';

export const dynamic = 'force-dynamic';

export default async function PortalTutoriales({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const cookieStore = await cookies();
  const session = await verifySessionCookieValue(cookieStore.get(SESSION_COOKIE.name)?.value);
  if (!session) {
    redirect('/portal/login?redirect=/portal/tutoriales');
  }

  const tutorialesDisponibles = tutorialesParaRol(session.rol);
  const tutorialSolicitadoId = searchParams?.v;
  const tutorialActual =
    tutorialesDisponibles.find(tutorial => tutorial.id === tutorialSolicitadoId) ?? tutorialesDisponibles[0];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-5xl mx-auto">
          <Link href="/portal/dashboard" className="text-sm text-uleam-blue hover:underline">
            &larr; Volver al Portal PINE
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-3">Tutoriales</h1>
          <p className="text-gray-600 mt-2">Videos cortos sobre las funciones del portal que corresponden a tu rol.</p>

          {tutorialActual ? (
            <div className="mt-8 grid gap-8 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-xl bg-black shadow-md">
                  <video
                    key={tutorialActual.id}
                    controls
                    preload="metadata"
                    className="w-full aspect-video"
                    src={tutorialActual.archivo}
                  />
                </div>
                <h2 className="mt-4 text-xl font-bold text-gray-900">{tutorialActual.titulo}</h2>
                <p className="mt-1 text-gray-600">{tutorialActual.descripcion}</p>
              </div>

              <aside className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Disponibles para ti</h3>
                {tutorialesDisponibles.map(tutorial => (
                  <Link
                    key={tutorial.id}
                    href={`/portal/tutoriales?v=${tutorial.id}`}
                    className={`block rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md ${
                      tutorial.id === tutorialActual.id ? 'border-uleam-blue ring-1 ring-uleam-blue' : 'border-gray-200'
                    }`}
                  >
                    <span className="block font-semibold text-gray-900">{tutorial.titulo}</span>
                    <span className="block text-xs text-gray-500 mt-1">{tutorial.duracion}</span>
                  </Link>
                ))}
              </aside>
            </div>
          ) : (
            <div className="mt-8 rounded-lg bg-yellow-50 p-6 text-center text-yellow-800">
              Aún no hay tutoriales para tu rol.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
