'use client';

import { useState } from 'react';
import Image from 'next/image';

interface EnlaceDifusionModalProps {
  onClose: () => void;
}

function mañana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function enUnaSemana(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export default function EnlaceDifusionModal({ onClose }: EnlaceDifusionModalProps) {
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [expiraFecha, setExpiraFecha] = useState(enUnaSemana());
  const [usoUnico, setUsoUnico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [copiado, setCopiado] = useState(false);

  const generar = async () => {
    if (!nombreInvitado.trim()) {
      setError('Escribe el nombre de la persona a la que le darás el acceso');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/enlaces-difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_invitado: nombreInvitado.trim(),
          expira_en: `${expiraFecha}T23:59:59`,
          uso_unico: usoUnico,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUrl(`${window.location.origin}/vinculacion/publico-difusion/${data.data.token}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartirWhatsapp = () => {
    const texto = encodeURIComponent(`Registra tu evento/podcast aquí: ${url}`);
    window.open(`https://web.whatsapp.com/send?text=${texto}`, '_blank', 'noopener,noreferrer');
  };

  const qrSrc = url ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}` : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-uleam-blue text-white transition hover:bg-yellow-400 hover:text-uleam-blue"
        >
          ✕
        </button>

        <h2 className="mb-1 text-lg font-bold text-uleam-blue">Acceso temporal para externos</h2>
        <p className="mb-4 text-sm text-gray-600">
          Para que alguien sin cuenta registre un evento o podcast. Queda siempre pendiente de aprobación.
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {!url && (
          <div className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">¿Para quién es este acceso?</label>
              <input type="text" value={nombreInvitado} onChange={e => setNombreInvitado(e.target.value)}
                placeholder="Nombre de la persona"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Válido hasta</label>
              <input type="date" value={expiraFecha} min={mañana()}
                onChange={e => setExpiraFecha(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={usoUnico} onChange={e => setUsoUnico(e.target.checked)} className="w-4 h-4" />
              <span className="text-sm text-gray-700">Un solo uso (si no, sirve para varios registros hasta la fecha)</span>
            </label>
            <button onClick={generar} disabled={loading}
              className="w-full px-4 py-2.5 rounded-lg bg-uleam-blue font-semibold text-white transition hover:bg-uleam-blue/90 disabled:opacity-50">
              {loading ? 'Generando...' : 'Generar enlace y QR'}
            </button>
          </div>
        )}

        {url && (
          <>
            <div className="mx-auto mb-4 w-full max-w-[260px]">
              <Image src={qrSrc} alt="Código QR del enlace" width={260} height={260} className="h-auto w-full rounded-lg border border-gray-200" />
            </div>
            <p className="mb-3 break-all text-xs text-gray-500">{url}</p>
            <div className="flex gap-2">
              <button onClick={copiar} className="flex-1 rounded-lg border border-uleam-blue px-3 py-2 text-sm font-semibold text-uleam-blue hover:bg-uleam-blue/5">
                {copiado ? '¡Copiado!' : 'Copiar enlace'}
              </button>
              <button onClick={compartirWhatsapp} className="flex-1 rounded-lg bg-[#25D366] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1ebe5a]">
                WhatsApp
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
