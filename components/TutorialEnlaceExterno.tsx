'use client';

import { useState } from 'react';
import { TUTORIAL_CONTRIBUCION_EXTERNA } from '@/lib/tutoriales';

// Video explicativo para quien recibe un enlace/QR de contribución (sin cuenta).
// Colapsado por defecto: no descarga el MP4 hasta que la persona lo abre (preload="none"),
// para no gastar datos móviles ni empujar el formulario hacia abajo.
export default function TutorialEnlaceExterno() {
  const [estaAbierto, setEstaAbierto] = useState(false);

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div className="rounded-lg border border-uleam-blue/30 bg-blue-50">
        <button
          type="button"
          onClick={() => setEstaAbierto(valorAnterior => !valorAnterior)}
          aria-expanded={estaAbierto}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="font-semibold text-uleam-blue">
            ▶ Mira cómo enviar tu contribución ({TUTORIAL_CONTRIBUCION_EXTERNA.duracion})
          </span>
          <span className="text-sm text-gray-500">{estaAbierto ? 'Ocultar' : 'Ver video'}</span>
        </button>

        {estaAbierto && (
          <div className="px-4 pb-4">
            <div className="overflow-hidden rounded-lg bg-black">
              <video
                controls
                preload="none"
                playsInline
                poster={TUTORIAL_CONTRIBUCION_EXTERNA.poster}
                className="w-full aspect-video"
                src={TUTORIAL_CONTRIBUCION_EXTERNA.archivo}
              />
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-700">
              <li>Ten a mano tu libro o artículo en PDF: casi todos los datos están ahí.</li>
              <li>Escribe tu nombre y usa «Buscar por DOI» o sube el PDF para autocompletar.</li>
              <li>Revisa los campos y agrega a los autores en orden (1 a 5, sin repetir).</li>
              <li>Pulsa «Guardar»: el docente revisará y aprobará tu registro.</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
