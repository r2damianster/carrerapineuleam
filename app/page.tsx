import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';
import NewsSection from '@/components/NewsSection';
import ConnectionsSection from '@/components/ConnectionsSection';
import PhotoCarousel from '@/components/PhotoCarousel';

export default function HubPage() {
  return (
    <>
      <Header />
      <main>
        <PhotoCarousel ubicacion="portada" />
        <HubProjectsSection />
        <NewsSection />
        <ConnectionsSection compact />
      </main>
      <Footer context="landing" />
    </>
  );
}
