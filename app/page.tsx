import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';

import Link from 'next/link';

export default function HubPage() {
  const carreraSiteName = 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM';

  return (
    <>
      <Header siteName={carreraSiteName} />
      
      {/* PINE Navigation Block */}
      <div className="bg-blue-900 text-white p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-4 justify-center">
          <Link href="/registro" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded font-semibold">1. Registro</Link>
          <Link href="/vinculacion/test-mcer" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded font-semibold">2. Test MCER</Link>
          <Link href="/docencia" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded font-semibold">3. Gestión Docente</Link>
          <Link href="/vinculacion/difusion" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded font-semibold">4. Difusión (Eventos)</Link>
          <Link href="/vinculacion/encuesta" className="bg-blue-800 hover:bg-blue-700 px-4 py-2 rounded font-semibold">5. Encuestas</Link>
          <Link href="/pine-dashboard" className="bg-yellow-600 hover:bg-yellow-500 px-4 py-2 rounded font-bold">📊 PINE Dashboard (Estadísticas)</Link>
        </div>
      </div>

      <main>
        <HubProjectsSection />
      </main>
      <Footer />
    </>
  );
}
