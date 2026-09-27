'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface Pendiente {
  id: number;
  titulo: string;
  tipo: string;
  fecha: string;
  evidencia_url: string | null;
  categoria: string | null;
  video_id: string | null;
  youtube_url: string | null;
}

// Sesión 53 — "profesor responsable": aprueba eventos/podcasts sin depender de administración
// del sitio. Cada fila confirma sin menores/calidad antes de aprobar; si falla cualquiera de
// las dos, no se publica y la foto asociada queda descartada por ese motivo.
export default function MisAprobacionesPage() {
  const [pendientes, setPendientes] = useState<Pendiente[] | null>(null);
  const [confirmaciones, setConfirmaciones] = useState<Record<number, { menores: boolean; calidad: boolean }>>({});
  const [procesandoId, setProcesandoId] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');

  const cargar = () => {
    fetch('/api/mis-aprobaciones')
      .then((respuesta) => (respuesta.ok ? respuesta.json() : { data: [] }))
      .then((datos) => setPendientes(datos.data ?? []))
      .catch(() => setPendientes([]));
  };
  useEffect(cargar, []);

  const confirmacionDe = (id: number) => confirmaciones[id] ?? { menores: false, calidad: false };
  const actualizarConfirmacion = (id: number, campo: 'menores' | 'calidad', valor: boolean) => {
    setConfirmaciones((previas) => ({ ...previas, [id]: { ...confirmacionDe(id), [campo]: valor } }));
  };

  const aprobar = async (pendiente: Pendiente) => {
    setProcesandoId(pendiente.id);
    setMensaje('');
    const { menores, calidad } = confirmacionDe(pendiente.id);
    const cuerpo = { hay_menores: menores, calidad_mala: calidad };
    try {
      const respuesta = pendiente.video_id
        ? await fetch(`/api/videos/${pendiente.video_id}/aprobar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
        : await fetch(`/api/actividades-difusion/${pendiente.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ aprobar: true, ...cuerpo }) });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'No se pudo aprobar');
      setMensaje(datos.publicado === false ? (datos.mensaje || 'No se publicó.') : 'Aprobado y publicado.');
      cargar();
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setProcesandoId(null);
    }
  };

  return (
    <>
      <Header />
      <main className="mx-auto mt-16 max-w-3xl px-4 py-10">
        <Link href="/portal/dashboard" className="text-xs font-semibold text-blue-600 hover:underline">&larr; Volver al Portal</Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-800">Mis aprobaciones</h1>
        <p className="mt-1 text-sm text-gray-600">Eventos y podcasts donde te marcaron (o te marcaste) como profesor responsable. Apruébalos aquí sin esperar a administración del sitio.</p>

        {mensaje && <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{mensaje}</div>}

        {pendientes === null && <p className="mt-6 text-sm text-gray-500">Cargando…</p>}
        {pendientes !== null && pendientes.length === 0 && (
          <p className="mt-6 rounded border border-dashed p-8 text-center text-sm text-gray-500">No tienes nada pendiente de aprobar.</p>
        )}

        <div className="mt-6 space-y-4">
          {(pendientes ?? []).map((pendiente) => {
            const confirmacion = confirmacionDe(pendiente.id);
            return (
              <div key={pendiente.id} className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-800">{pendiente.tipo}</span>
                  <span className="font-bold text-gray-800">{pendiente.titulo}</span>
                  <span className="text-sm text-gray-500">{new Date(pendiente.fecha).toLocaleDateString('es-EC')}</span>
                  {pendiente.youtube_url && <a href={pendiente.youtube_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">Ver video</a>}
                </div>
                {pendiente.evidencia_url && !pendiente.video_id && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pendiente.evidencia_url} alt="Evidencia" className="mt-2 h-32 w-32 rounded-lg border object-cover" />
                )}
                <div className="mt-3 space-y-1 text-sm">
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={confirmacion.menores} onChange={(evento) => actualizarConfirmacion(pendiente.id, 'menores', evento.target.checked)} />
                    ¿Aparecen menores de edad sin haberlo declarado?
                  </label>
                  <label className="flex items-start gap-2">
                    <input type="checkbox" className="mt-1" checked={confirmacion.calidad} onChange={(evento) => actualizarConfirmacion(pendiente.id, 'calidad', evento.target.checked)} />
                    ¿La foto/portada es de mala calidad para la web?
                  </label>
                </div>
                <button
                  disabled={procesandoId === pendiente.id}
                  onClick={() => aprobar(pendiente)}
                  className="mt-3 rounded bg-uleam-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {procesandoId === pendiente.id ? 'Guardando…' : (confirmacion.menores || confirmacion.calidad ? 'Descartar foto y no publicar' : 'Aprobar y publicar')}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
