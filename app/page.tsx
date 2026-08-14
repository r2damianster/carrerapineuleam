import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubProjectsSection from '@/components/HubProjectsSection';

export default function HubPage() {
  return (
    <>
      <Header />
      <main>
        <HubProjectsSection />
      </main>
      <Footer />
    </>
  );
}
