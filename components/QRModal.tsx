'use client';

import Image from 'next/image';

const SITE_URL = 'https://carrerapineuleam.vercel.app/investigación/proyecto-innovacion.html';
const QR_API = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(SITE_URL)}`;

interface QRModalProps {
  onClose: () => void;
}

export default function QRModal({ onClose }: QRModalProps) {
  const handleShare = () => {
    const text = encodeURIComponent(
      `¡Descubre el Proyecto de Innovaciones Pedagógicas e Internacionalización de la ULEAM! ${SITE_URL}`
    );
    window.open(`https://web.whatsapp.com/send?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-[#003366] text-white transition hover:bg-[#FFD700] hover:text-[#003366]"
        >
          ✕
        </button>

        <h2 className="mb-1 text-lg font-bold text-[#003366]">
          Visítanos también desde tu celular
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Escanea el código QR para acceder a nuestro proyecto
        </p>

        <div className="mx-auto mb-4 w-full max-w-[260px]">
          <Image
            src={QR_API}
            alt="Código QR del Proyecto Innovaciones Pedagógicas e Internacionalización"
            width={260}
            height={260}
            className="h-auto w-full rounded-lg border border-gray-200"
          />
        </div>

        <button
          onClick={handleShare}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 font-semibold text-white transition hover:bg-[#1ebe5a]"
        >
          Compartir vía WhatsApp
        </button>
      </div>
    </div>
  );
}
