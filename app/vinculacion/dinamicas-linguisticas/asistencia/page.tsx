import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AttendanceForm from '@/components/AttendanceForm';

export const metadata = {
  title: 'Registrar Asistencia - Club de Inglés - ULEAM',
  description: 'Registro de asistencia del Club de Inglés en Escenarios Locales — Proyecto de Vinculación PINE-ULEAM.',
};

export default function AsistenciaPage() {
  return (
    <>
      <Header />
      <main className="py-16 px-4">
        <AttendanceForm />
      </main>
      <Footer />
    </>
  );
}
