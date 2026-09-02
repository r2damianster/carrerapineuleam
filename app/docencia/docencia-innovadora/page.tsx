import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TaggedVideoSection from '@/components/TaggedVideoSection';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Docencia Innovadora e Interdisciplinaria - ULEAM',
  description: 'Prácticas de docencia innovadora e interdisciplinaria de la carrera PINE-ULEAM.',
  keywords: ['ULEAM', 'docencia', 'PINE', 'innovación educativa', 'interdisciplinariedad'],
};

export default function DocenciaProjectPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectHero projectKey="docenciaProject" />
        <ProjectIntegrationNote projectKey="docenciaProject" />
        <TaggedVideoSection tag="docencia" projectKey="docenciaProject" />
        <Contact />
      </main>
      <Footer context="docencia" />
    </>
  );
}
