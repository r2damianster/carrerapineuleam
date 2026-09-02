import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';
import ActivityGallery from '@/components/ActivityGallery';
import NewsSection from '@/components/NewsSection';
import ConnectionsSection from '@/components/ConnectionsSection';

export default function HubPage() {
  return (
    <>
      <Header />
      <main>
        <HubProjectsSection />
        <ActivityGallery limit={8} />
        <NewsSection />
        <ConnectionsSection compact />
      </main>
      <Footer context="landing" />
    </>
  );
}
