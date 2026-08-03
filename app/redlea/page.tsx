import Header from '@/components/Header';
import Footer from '@/components/Footer';
import RedLEAHero from '@/components/redlea/RedLEAHero';
import RedLEAAbout from '@/components/redlea/RedLEAAbout';
import RedLEATestimonios from '@/components/redlea/RedLEATestimonios';
import RedLEAGaleria from '@/components/redlea/RedLEAGaleria';
import RedLEAMemoria from '@/components/redlea/RedLEAMemoria';

export const metadata = {
  title: 'RED LEA — Cambiando Vidas',
  description: 'Red de Cooperación para la Investigación Científica sobre Lectura y Escritura Académica. Transformando la educación mediante la investigación, innovación pedagógica y construcción colaborativa de conocimiento.',
};

export default function REDLEAPage() {
  return (
    <>
      <Header />
      <main>
        <RedLEAHero />
        <RedLEAAbout />
        <RedLEATestimonios />
        <RedLEAGaleria />
        <RedLEAMemoria />
      </main>
      <Footer />
    </>
  );
}
