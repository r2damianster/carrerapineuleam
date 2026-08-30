import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttendanceForm from '@/components/AttendanceForm';
import { getSessionFromCookies } from '@/lib/session';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Registrar Asistencia - Club de Inglés - ULEAM',
  description: 'Registro de asistencia del Club de Inglés en Escenarios Locales — Proyecto de Vinculación PINE-ULEAM.',
};

export default async function AsistenciaPage() {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect('/vinculacion/dinamicas-linguisticas/login');
  }

  return (
    <>
      <Header />
      <main className="py-16 px-4">
        <AttendanceForm estudianteSesion={session} />
      </main>
      <Footer />
    </>
  );
}
