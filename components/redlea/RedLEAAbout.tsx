'use client';

import { useLanguage } from '@/lib/i18n';

export default function RedLEAAbout() {
  const { t } = useLanguage();
  const a = t.redlea.about;

  return (
    <section id="sobre" className="w-full py-20 px-4 bg-white">
      <div className="max-w-5xl mx-auto">
        {/* Introducción */}
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-uleam-blue mb-8">
            {a.title}
          </h2>

          <div className="prose max-w-none text-lg text-gray-700 space-y-6">
            <p dangerouslySetInnerHTML={{ __html: a.intro1 }} />
            <p dangerouslySetInnerHTML={{ __html: a.intro2 }} />
            <p>{a.intro3}</p>
          </div>
        </div>

        {/* Propósito */}
        <div className="mb-16 bg-blue-50 p-8 rounded-lg border-l-4 border-uleam-blue">
          <h3 className="text-2xl font-bold text-uleam-blue mb-4">{a.purposeTitle}</h3>
          <p className="text-lg text-gray-700">
            {a.purposeText}
          </p>
        </div>

        {/* Quiénes somos */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{a.whoTitle}</h3>
          <p className="text-lg text-gray-700 mb-6">
            {a.who1}
          </p>
          <p className="text-lg text-gray-700" dangerouslySetInnerHTML={{ __html: a.who2 }} />
        </div>

        {/* Universidades co-fundadoras */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{a.universitiesTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {a.universities.map((uni, idx) => (
              <div
                key={idx}
                className="p-4 bg-gradient-to-r from-blue-100 to-blue-50 rounded-lg border border-blue-200 hover:shadow-md transition"
              >
                <p className="font-semibold text-uleam-blue">{uni}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Organización */}
        <div>
          <h3 className="text-2xl font-bold text-uleam-blue mb-6">{a.orgTitle}</h3>
          <p className="text-lg text-gray-700 mb-4">
            {a.orgText}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {a.orgItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
              >
                <div className="w-3 h-3 bg-uleam-gold rounded-full mr-3" />
                <span className="text-gray-700 font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
