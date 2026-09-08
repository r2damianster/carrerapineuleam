import { notFound } from 'next/navigation';
import { neon } from '@neondatabase/serverless';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProjectHero from '@/components/ProjectHero';
import ProjectIntegrationNote from '@/components/ProjectIntegrationNote';
import TeamSection from '@/components/TeamSection';
import ProjectInfoPlaceholder from '@/components/ProjectInfoPlaceholder';
import Contact from '@/components/Contact';

// Página genérica para proyectos tipo 'plantilla_simple' creados desde
// /admin/proyectos — sin código nuevo por proyecto, a diferencia de las
// páginas 'personalizada' (vinculación, docencia, RED LEA, internacionalización)
// que siguen siendo código a medida.
interface ProyectoRow {
  id: string;
  nombre_oficial: string;
  grupo_nav: string | null;
  hero_title1_es: string | null; hero_title1_en: string | null;
  hero_title2_es: string | null; hero_title2_en: string | null;
  hero_subtitle_es: string | null; hero_subtitle_en: string | null;
  hero_description_es: string | null; hero_description_en: string | null;
  integration_text_es: string | null; integration_text_en: string | null;
  info_text_es: string | null; info_text_en: string | null;
  lider_nombre: string | null; lider_email: string | null; lider_orcid: string | null;
}

async function getProyecto(slug: string): Promise<ProyectoRow | null> {
  const sql = neon(process.env.DATABASE_URL!, { fetchOptions: { cache: 'no-store' } });
  const [proyecto] = await sql`
    SELECT * FROM proyectos WHERE slug = ${slug} AND tipo = 'plantilla_simple' AND activo = true
  `;
  return (proyecto as ProyectoRow) || null;
}

export default async function ProyectoDinamicoPage({ params }: { params: { slug: string } }) {
  const proyecto = await getProyecto(params.slug);
  if (!proyecto) notFound();

  return (
    <>
      <Header />
      <main>
        <ProjectHero data={proyecto} />
        <ProjectIntegrationNote data={proyecto} />
        <TeamSection project={proyecto.id} />
        {proyecto.info_text_es && <ProjectInfoPlaceholder data={proyecto} />}
        <Contact leaderName={proyecto.lider_nombre} leaderEmail={proyecto.lider_email} leaderOrcid={proyecto.lider_orcid} />
      </main>
      <Footer context={proyecto.id} />
    </>
  );
}
