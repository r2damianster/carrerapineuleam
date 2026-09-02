import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TeamSection from '@/components/TeamSection';
import ProjectInfoPlaceholder from '@/components/ProjectInfoPlaceholder';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Desarrollo de las habilidades lingüísticas - ULEAM',
  description: 'Proyecto: Desarrollo de las habilidades lingüísticas del idioma inglés de los estudiantes de la Educación Superior.',
  keywords: ['ULEAM', 'habilidades lingüísticas', 'inglés', 'educación superior', 'investigación'],
};

export default function DesarrolloHabilidadesPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectHero projectKey="desarrolloProject" />
        <ProjectIntegrationNote projectKey="desarrolloProject" />
        <TeamSection project="desarrollo_habilidades" />

        <ProjectInfoPlaceholder projectKey="desarrolloProject" />

        <Contact projectKey="desarrolloProject" />
      </main>
      <Footer context="linguistica" />
    </>
  );
}
