import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import About from '@/components/About';
import TeamSection from '@/components/TeamSection';
import GaleriaProyecto from '@/components/GaleriaProyecto';
import VideoGallery from '@/components/VideoGallery';
import SubstantiveFunctionsSection from '@/components/SubstantiveFunctionsSection';
import PublicationsSection from '@/components/PublicationsSection';
import Contact from '@/components/Contact';

export const metadata = {
  title: 'Innovaciones Pedagógicas e Internacionalización - ULEAM',
  description: 'Proyecto de investigación sobre innovaciones pedagógicas e internacionalización en la ULEAM',
  keywords: ['ULEAM', 'innovación pedagógica', 'internacionalización', 'investigación', 'educación'],
  authors: [{ name: 'Arturo Rodríguez' }, { name: 'Jhonny Villafuerte' }],
};

export default function PineProjectPage() {
  return (
    <>
      <Header logoSrc="/images/logos/logo-proyecto.png" logoAlt="Logo Proyecto" />
      <main>
        <Hero />
        <About />
        <TeamSection project="internacionalizacion" />
        <VideoGallery />
        <SubstantiveFunctionsSection />
        <PublicationsSection />
        <GaleriaProyecto ubicacion="internacionalizacion-galeria" claveTexto="internacionalizacion" />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
