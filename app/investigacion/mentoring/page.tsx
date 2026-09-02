import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TeamSection from '@/components/TeamSection';
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

        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-uleam-blue mb-4">Información del Proyecto</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Actualmente este proyecto se encuentra en su fase inicial. Pronto publicaremos más detalles, actividades y resultados relacionados al desarrollo humano y perfil profesional en la formación de docentes.
            </p>
          </div>
        </section>

        <Contact projectKey="mentoringProject" />
      </main>
      <Footer context="mentoring" />
    </>
  );
}
