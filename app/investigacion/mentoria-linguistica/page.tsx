import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Proyecto de Mentoría en el Desarrollo Lingüístico - ULEAM',
  description: 'Proyecto de Mentoría en el Desarrollo Lingüístico, investigación para mejorar las capacidades orales y escritas de los estudiantes.',
  keywords: ['ULEAM', 'mentoría', 'desarrollo lingüístico', 'inglés', 'educación'],
};

export default function MentoriaLinguisticaPage() {
  return (
    <>
      <Header />
      <main>
        <ProjectHero projectKey="desarrolloProject" />
        <ProjectIntegrationNote projectKey="desarrolloProject" />
        
        <section className="py-20 bg-white">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-uleam-blue mb-4">Proyecto de Mentoría en el Desarrollo Lingüístico</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Este proyecto, liderado por Veronika, está enfocado en la mentoría académica para potenciar el desarrollo de habilidades lingüísticas en los estudiantes.
            </p>
          </div>
        </section>

        <Contact projectKey="desarrolloProject" />
      </main>
      <Footer />
    </>
  );
}
