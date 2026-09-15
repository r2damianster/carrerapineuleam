'use client';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLanguage } from '@/lib/i18n';

export default function PoliticaPrivacidadPage() {
  const { t } = useLanguage();
  const sections = [
    { title: t.privacy.section1Title, body: t.privacy.section1Body },
    { title: t.privacy.section2Title, body: t.privacy.section2Body },
    { title: t.privacy.section3Title, body: t.privacy.section3Body },
    { title: t.privacy.section4Title, body: t.privacy.section4Body },
    { title: t.privacy.section5Title, body: t.privacy.section5Body },
  ];

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-24 md:py-28">
        <h1 className="text-3xl md:text-4xl font-bold text-uleam-blue mb-2">{t.privacy.pageTitle}</h1>
        <p className="text-sm text-gray-500 mb-8">{t.privacy.lastUpdated}</p>
        <p className="text-gray-700 leading-relaxed mb-8">{t.privacy.intro}</p>
        {sections.map((section) => (
          <section key={section.title} className="mb-6">
            <h2 className="text-xl font-semibold text-uleam-blue mb-2">{section.title}</h2>
            <p className="text-gray-700 leading-relaxed">{section.body}</p>
          </section>
        ))}
      </main>
      <Footer context="general" />
    </>
  );
}
