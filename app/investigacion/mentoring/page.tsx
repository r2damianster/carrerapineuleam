import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TeamSection from '@/components/TeamSection';
import ProjectInfoPlaceholder from '@/components/ProjectInfoPlaceholder';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Mentoring - ULEAM',
  description: 'Proyecto: Desarrollo Humano y perfil profesional en la formación de docentes: Mentoría y Aprendizaje Socioemocional.',
  keywords: ['ULEAM', 'mentoring', 'mentoría', 'aprendizaje socioemocional', 'formación docente', 'investigación'],
};

export default function MentoringPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectHero projectKey="mentoringProject" />
        <ProjectIntegrationNote projectKey="mentoringProject" />
        <TeamSection project="mentoring" />

        <ProjectInfoPlaceholder projectKey="mentoringProject" />

        <Contact projectKey="mentoringProject" />
      </main>
      <Footer context="mentoring" />
    </>
  );
}
