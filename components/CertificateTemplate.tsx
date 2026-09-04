import type { CertificateData, CertificateLogo } from '@/types';

const ENTITY_LABELS: Record<CertificateData['entity'], string> = {
  carrera: 'Carrera de Pedagogía de los Idiomas Nacionales y Extranjeros (PINE)',
  proyecto: 'Proyecto de Innovaciones Pedagógicas e Internacionalización',
  grupo_investigacion:
    'Grupo de Investigación: Innovaciones pedagógicas para el desarrollo sostenible: inclusión, interculturalidad e interdisciplinaridad',
};

export const SECONDARY_LOGO_PATHS: Record<CertificateLogo, string | null> = {
  proyecto: '/images/logos/logo-proyecto.png',
  grupo_investigacion: '/images/logos/logo-grupo-investigacion.png',
  red_lea: '/images/logos/logo-red-lea.jpeg',
  ninguno: null,
};

export const ULEAM_LOGO_PATH = '/images/logos/logo-uleam.png';

function bodyText(data: CertificateData): { intro: string; showMotive: boolean } {
  switch (data.type) {
    case 'participacion':
      return {
        intro: `Por su participación destacada en ${data.eventName || 'el evento'}, con la ponencia titulada:`,
        showMotive: true,
      };
    case 'expositor':
      return {
        intro: `Por su destacada participación como expositor(a) en ${data.eventName || 'el evento'}, presentando:`,
        showMotive: true,
      };
    case 'reconocimiento':
      return {
        intro: `En reconocimiento a ${data.motiveText || 'su valioso aporte y compromiso'}${data.eventName ? ` en ${data.eventName}` : ''}.`,
        showMotive: false,
      };
    case 'asistencia':
      return {
        intro: `Por su asistencia a ${data.eventName || 'el evento'}.`,
        showMotive: false,
      };
    case 'capacitador':
      return {
        intro: `Por su destacada labor como capacitador(a) en ${data.eventName || 'el evento'}, impartiendo:`,
        showMotive: true,
      };
    case 'voluntariado':
      return {
        intro: `Por su valiosa labor de voluntariado en ${data.eventName || 'el evento'}.`,
        showMotive: false,
      };
  }
}

export default function CertificateTemplate({ data }: { data: CertificateData }) {
  const { intro, showMotive } = bodyText(data);
  const secondaryLogoPath = SECONDARY_LOGO_PATHS[data.secondaryLogo];

  return (
    <div
      id="certificate-render"
      className="relative bg-white mx-auto"
      style={{ width: 1000, fontFamily: 'Georgia, serif' }}
    >
      <div className="border-[10px] p-8" style={{ borderColor: '#003366' }}>
        <div className="border-[2px] p-10 flex flex-col items-center text-center" style={{ borderColor: '#FFD700' }}>
          {/* Logos */}
          <div className="w-full flex items-center justify-between mb-2">
            <img src={ULEAM_LOGO_PATH} alt="Logo ULEAM" style={{ height: 64 }} />
            {secondaryLogoPath && <img src={secondaryLogoPath} alt="Logo" style={{ height: 64 }} />}
          </div>

          <h1 className="text-4xl tracking-[0.3em] font-bold" style={{ color: '#003366' }}>
            CERTIFICADO
          </h1>
          <p className="mt-3 text-sm leading-snug max-w-2xl" style={{ color: '#003366' }}>
            Facultad de Educación y Turismo de la Universidad Laica Eloy Alfaro de Manabí
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug max-w-2xl" style={{ color: '#003366' }}>
            {ENTITY_LABELS[data.entity]}
          </p>

          <p className="mt-7 text-base" style={{ color: '#1a1a1a' }}>
            Otorgado a
          </p>
          <p className="mt-1 text-3xl font-bold" style={{ color: '#FFD700', textShadow: '0 1px 0 #003366' }}>
            {data.recipientName || 'Nombre del participante'}
          </p>

          <p className="mt-5 text-base leading-relaxed max-w-2xl" style={{ color: '#1a1a1a' }}>
            {intro}
          </p>
          {showMotive && (
            <p className="mt-2 text-base italic font-semibold max-w-2xl" style={{ color: '#003366' }}>
              &ldquo;{data.motiveText || 'Título de la ponencia'}&rdquo;
            </p>
          )}

          <p className="mt-5 text-sm" style={{ color: '#1a1a1a' }}>
            {data.place || 'Manta'}, {data.date || 'fecha'}
          </p>

          {/* Firmas */}
          <div className="mt-10 flex w-full justify-center gap-14">
            {data.signers.map((signer, i) => (
              <div key={i} className="flex flex-col items-center" style={{ minWidth: 200 }}>
                <div className="w-full border-t pt-2" style={{ borderColor: '#003366' }}>
                  <p className="text-sm font-semibold" style={{ color: '#003366' }}>
                    {signer.name || 'Nombre del firmante'}
                  </p>
                  <p className="text-xs" style={{ color: '#1a1a1a' }}>
                    {signer.role || 'Cargo'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
