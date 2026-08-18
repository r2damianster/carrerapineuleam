import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TaggedVideoSection from '@/components/TaggedVideoSection';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Dinámicas Lingüísticas en Contextos Locales - ULEAM',
  description: 'Proyecto de vinculación con la sociedad de la carrera PINE-ULEAM: dinámicas lingüísticas en contextos locales.',
  keywords: ['ULEAM', 'vinculación', 'PINE', 'dinámicas lingüísticas', 'contextos locales'],
};

export default function VinculacionProjectPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectHero projectKey="vinculacionProject" />
        <ProjectIntegrationNote projectKey="vinculacionProject" />
        <TaggedVideoSection tag="vinculacion" projectKey="vinculacionProject" />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
