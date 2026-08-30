import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';

export default function HubPage() {
  const carreraSiteName = 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjero - ULEAM';

  return (
    <>
      <Header siteName={carreraSiteName} />
      <main>
        <HubProjectsSection />
      </main>
      <Footer />
    </>
  );
}
