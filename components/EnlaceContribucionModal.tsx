'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import {
  TIPOS_PUBLICACION,
  TIPO_PUBLICACION_LABEL,
  MAX_AUTORES,
  motivoEnlaceNoVigente,
  type TipoPublicacionEnlace,
} from '@/lib/enlaceContribucion';

interface EnlaceContribucionModalProps {
  onClose: () => void;
}

interface EnlaceListado {
  token: string;
  nombre_invitado: string;
  tipo_publicacion: TipoPublicacionEnlace;
  docente_es_autor: boolean;
  docente_orden: number | null;
  expira_en: string;
  max_usos: number | null;
  usos_actuales: number;
  activo: boolean;
}

function enUnaSemana(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  return fecha.toISOString().slice(0, 10);
}

function mañana(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return fecha.toISOString().slice(0, 10);
}

const ESTADO_LABEL = { revocado: 'Revocado', expirado: 'Vencido', agotado: 'Agotado' } as const;

export default function EnlaceContribucionModal({ onClose }: EnlaceContribucionModalProps) {
  const [nombreInvitado, setNombreInvitado] = useState('');
  const [tipoPublicacion, setTipoPublicacion] = useState<TipoPublicacionEnlace>('ARTICULO_REGIONAL');
  const [soyAutor, setSoyAutor] = useState(false);
  const [miOrden, setMiOrden] = useState(1);
  const [expiraFecha, setExpiraFecha] = useState(enUnaSemana());
  const [usoUnico, setUsoUnico] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [enlaces, setEnlaces] = useState<EnlaceListado[]>([]);
  const [verEnlaces, setVerEnlaces] = useState(false);

  const cargarEnlaces = useCallback(async () => {
    try {
      const respuesta = await fetch('/api/enlaces-contribucion', { cache: 'no-store' });
      const datos = await respuesta.json();
      if (respuesta.ok) setEnlaces(datos.data);
    } catch {
      /* el listado es secundario: si falla, el modal sigue sirviendo para generar */
    }
  }, []);

  useEffect(() => {
    if (verEnlaces) cargarEnlaces();
  }, [verEnlaces, cargarEnlaces]);

  const generar = async () => {
    if (!nombreInvitado.trim()) {
      setError('Escribe el nombre de la persona a la que le darás el acceso');
      return;
    }
    setCargando(true);
    setError('');
    try {
      const respuesta = await fetch('/api/enlaces-contribucion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_invitado: nombreInvitado.trim(),
          tipo_publicacion: tipoPublicacion,
          docente_es_autor: soyAutor,
          docente_orden: soyAutor ? miOrden : null,
          expira_en: `${expiraFecha}T23:59:59`,
          uso_unico: usoUnico,
        }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error);
      setUrl(`${window.location.origin}/enviar-contribucion/${datos.data.token}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const revocar = async (token: string) => {
    if (!confirm('¿Revocar este enlace? Ya no se podrá usar.')) return;
    const respuesta = await fetch(`/api/enlaces-contribucion/${token}`, { method: 'PATCH' });
    if (respuesta.ok) cargarEnlaces();
  };

  const copiar = async () => {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const compartirWhatsapp = () => {
    const texto = encodeURIComponent(`Registra tu contribución académica aquí: ${url}`);
    window.open(`https://web.whatsapp.com/send?text=${texto}`, '_blank', 'noopener,noreferrer');
  };

  const qrSrc = url ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}` : '';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4" role="dialog" aria-modal="true">
      <div className="relative max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-uleam-blue text-white transition hover:bg-yellow-400 hover:text-uleam-blue"
        >
          ✕
        </button>

        <h2 className="mb-1 text-lg font-bold text-uleam-blue">Recibir una contribución por enlace</h2>
        <p className="mb-4 text-sm text-gray-600">
          Para que alguien sin cuenta registre un artículo, libro u otra contribución. Queda pendiente hasta que tú la apruebes.
        </p>

        {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        {!url && (
          <div className="space-y-4 text-left">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">¿Para quién es este acceso?</label>
              <input
                type="text"
                value={nombreInvitado}
                onChange={e => setNombreInvitado(e.target.value)}
                placeholder="Nombre de la persona"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-uleam-blue"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">¿Qué va a registrar?</label>
              <select
                value={tipoPublicacion}
                onChange={e => setTipoPublicacion(e.target.value as TipoPublicacionEnlace)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-uleam-blue"
              >
                {TIPOS_PUBLICACION.map(tipo => (
                  <option key={tipo} value={tipo}>{TIPO_PUBLICACION_LABEL[tipo]}</option>
                ))}
              </select>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={soyAutor} onChange={e => setSoyAutor(e.target.checked)} className="h-4 w-4" />
                <span className="text-sm font-medium text-gray-700">Yo soy autor/coautor</span>
              </label>
              {soyAutor && (
                <div className="mt-2">
                  <label className="mb-1 block text-xs text-gray-600">Mi número de autoría (1 = primer autor)</label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_AUTORES}
                    value={miOrden}
                    onChange={e => setMiOrden(Math.min(MAX_AUTORES, Math.max(1, Number(e.target.value) || 1)))}
                    className="w-24 rounded-lg border border-gray-300 px-3 py-1.5 outline-none focus:border-uleam-blue"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tu nombre llegará precargado en esa posición; la persona agrega a los demás autores.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Válido hasta</label>
              <input
                type="date"
                value={expiraFecha}
                min={mañana()}
                onChange={e => setExpiraFecha(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:border-uleam-blue"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="checkbox" checked={usoUnico} onChange={e => setUsoUnico(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm text-gray-700">Un solo uso (si no, sirve para varios envíos hasta la fecha)</span>
            </label>
            <button
              onClick={generar}
              disabled={cargando}
              className="w-full rounded-lg bg-uleam-blue px-4 py-2.5 font-semibold text-white transition hover:bg-uleam-blue/90 disabled:opacity-50"
            >
              {cargando ? 'Generando...' : 'Generar enlace y QR'}
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

        <div className="mt-5 border-t pt-3 text-left">
          <button onClick={() => setVerEnlaces(!verEnlaces)} className="text-sm font-medium text-uleam-blue hover:underline">
            {verEnlaces ? '▾' : '▸'} Mis enlaces generados
          </button>
          {verEnlaces && (
            <ul className="mt-2 space-y-2">
              {enlaces.length === 0 && <li className="text-xs text-gray-500">Aún no has generado enlaces.</li>}
              {enlaces.map(enlace => {
                const motivo = motivoEnlaceNoVigente(enlace);
                return (
                  <li key={enlace.token} className="rounded-lg border border-gray-200 p-2 text-xs">
                    <div className="font-medium text-gray-800">
                      {enlace.nombre_invitado} · {TIPO_PUBLICACION_LABEL[enlace.tipo_publicacion]}
                    </div>
                    <div className="text-gray-500">
                      {enlace.docente_es_autor ? `Autor #${enlace.docente_orden} · ` : ''}
                      Usos: {enlace.usos_actuales}{enlace.max_usos ? `/${enlace.max_usos}` : ''} ·{' '}
                      {motivo ? ESTADO_LABEL[motivo] : 'Activo'}
                    </div>
                    {!motivo && (
                      <button onClick={() => revocar(enlace.token)} className="mt-1 text-red-600 hover:underline">Revocar</button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
