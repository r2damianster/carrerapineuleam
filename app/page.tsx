import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';
import CareerProfileSection from '@/components/CareerProfileSection';
import NewsSection from '@/components/NewsSection';
import ConnectionsSection from '@/components/ConnectionsSection';
import PhotoCarousel from '@/components/PhotoCarousel';
import QRPromoModal from '@/components/QRPromoModal';
import QRFloatingButton from '@/components/QRFloatingButton';

export default function HubPage() {
  return (
    <>
      <QRPromoModal />
      <QRFloatingButton />
      <Header />
      <main>
        <PhotoCarousel ubicacion="portada" />
        <HubProjectsSection />
        <CareerProfileSection />
        <NewsSection />
        <ConnectionsSection compact />
      </main>
      <Footer context="landing" />
    </>
  );
}
