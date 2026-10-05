'use client';

import { useState } from 'react';
import SubirVideoDifusion from '@/components/SubirVideoDifusion';

interface ProyectoOpcion {
  id: string;
  nombre_oficial: string;
}

interface ActividadPlanOpcion {
  id: number;
  actividad: string;
  unidad: string | null;
  proyecto_id: string;
  ciclo: string | null;
}

const TIPOS_DIFUSION = [
  { id: 'evento_fisico', etiqueta: 'Evento presencial' },
  { id: 'encuentro_comunitario', etiqueta: 'Encuentro comunitario' },
  { id: 'evento_formacion', etiqueta: 'Evento de formación' },
  { id: 'visita_tecnica', etiqueta: 'Visita técnica' },
  { id: 'podcast', etiqueta: 'Podcast' },
];

function formularioVacio(proyectoId: string) {
  return {
    proyecto_id: proyectoId, actividad_plan_id: '', titulo: '', tipo: 'evento_fisico', fecha: new Date().toISOString().slice(0, 10),
    hora: '', audiencia_alcanzada: '', descripcion: '',
  };
}

// Registro de un evento o podcast desde Investigación. Lo aprueba el líder/colíder del proyecto y, aparte,
// valida el aporte. Independiente del formulario de Vinculación (/vinculacion/difusion).
export default function RegistrarDifusionInvestigacion({
  proyectos,
  actividadesPlan,
  onRegistrado,
}: {
  proyectos: ProyectoOpcion[];
  actividadesPlan: ActividadPlanOpcion[];
  onRegistrado: () => void;
}) {
  const [formulario, setFormulario] = useState(formularioVacio(proyectos[0]?.id ?? ''));
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [hayMenores, setHayMenores] = useState(false);
  const [video, setVideo] = useState<{ youtubeVideoId: string; categoryId: string } | null>(null);
  const [avisoSimilitud, setAvisoSimilitud] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);

  const esPodcast = formulario.tipo === 'podcast';
  const actividadesDelProyecto = actividadesPlan.filter((actividad) => actividad.proyecto_id === formulario.proyecto_id);

  const registrar = async (confirmadoSimilitud: boolean) => {
    if (!archivoEvidencia) {
      setMensaje('Adjunta la evidencia (foto del evento o captura del podcast).');
      return;
    }
    if (esPodcast && !video) {
      setMensaje('Para un podcast sube primero el video.');
      return;
    }
    setGuardando(true);
    setMensaje('');
    try {
      const datosArchivo = new FormData();
      datosArchivo.append('file', archivoEvidencia);
      const respuestaArchivo = await fetch('/api/upload', { method: 'POST', body: datosArchivo });
      const resultadoArchivo = await respuestaArchivo.json();
      if (!respuestaArchivo.ok) throw new Error(resultadoArchivo.error || 'No se pudo subir la evidencia');

      const respuesta = await fetch('/api/investigacion/difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formulario,
          audiencia_alcanzada: Number(formulario.audiencia_alcanzada),
          evidencia_url: resultadoArchivo.url,
          hay_menores: hayMenores,
          confirmado_similitud: confirmadoSimilitud,
          ...(video ? { youtube_video_id: video.youtubeVideoId, video_category: video.categoryId } : {}),
        }),
      });
      const resultado = await respuesta.json();
      if (respuesta.status === 409 && resultado.codigo === 'REQUIERE_CONFIRMACION') {
        setAvisoSimilitud('Ya existe una actividad muy parecida. Revisa que no sea la misma; si es distinta, confirma y guarda.');
        return;
      }
      if (!respuesta.ok) throw new Error(resultado.error || 'No se pudo registrar');

      setFormulario(formularioVacio(formulario.proyecto_id));
      setArchivoEvidencia(null);
      setHayMenores(false);
      setVideo(null);
      setAvisoSimilitud('');
      setMensaje('Registrado. Queda pendiente de aprobación del líder del proyecto antes de publicarse.');
      onRegistrado();
    } catch (error: any) {
      setMensaje(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={(evento) => { evento.preventDefault(); registrar(false); }}
      className="mt-8 space-y-3 rounded-lg border bg-white p-4 shadow-sm"
    >
      <h2 className="font-semibold text-gray-800">Registrar un evento o podcast</h2>
      <p className="text-xs text-gray-500">Se publica en el sitio solo cuando lo aprueba el líder de tu proyecto. Además queda como aporte por validar.</p>
      {mensaje && <p className="rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{mensaje}</p>}
      {avisoSimilitud && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {avisoSimilitud}
          <button type="button" onClick={() => registrar(true)} className="ml-3 rounded bg-amber-600 px-3 py-1 text-xs text-white">Confirmar y guardar</button>
        </div>
      )}

      <select required className="w-full rounded border p-2 text-sm" value={formulario.proyecto_id} onChange={(evento) => setFormulario({ ...formulario, proyecto_id: evento.target.value, actividad_plan_id: '' })}>
        {proyectos.map((proyecto) => <option key={proyecto.id} value={proyecto.id}>{proyecto.nombre_oficial}</option>)}
      </select>
      <select className="w-full rounded border p-2 text-sm" value={formulario.actividad_plan_id} onChange={(evento) => setFormulario({ ...formulario, actividad_plan_id: evento.target.value })}>
        <option value="">No corresponde a una meta específica del plan</option>
        {actividadesDelProyecto.map((actividad) => (
          <option key={actividad.id} value={actividad.id}>{actividad.ciclo ? `[${actividad.ciclo}] ` : ''}{actividad.actividad}</option>
        ))}
      </select>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <select className="rounded border p-2 text-sm" value={formulario.tipo} onChange={(evento) => { setFormulario({ ...formulario, tipo: evento.target.value }); setVideo(null); }}>
          {TIPOS_DIFUSION.map((tipo) => <option key={tipo.id} value={tipo.id}>{tipo.etiqueta}</option>)}
        </select>
        <input required placeholder="Título" className="rounded border p-2 text-sm" value={formulario.titulo} onChange={(evento) => setFormulario({ ...formulario, titulo: evento.target.value })} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input required type="date" className="rounded border p-2 text-sm" value={formulario.fecha} onChange={(evento) => setFormulario({ ...formulario, fecha: evento.target.value })} />
        <input type="time" className="rounded border p-2 text-sm" value={formulario.hora} onChange={(evento) => setFormulario({ ...formulario, hora: evento.target.value })} />
        <input required type="number" min="1" placeholder="Audiencia alcanzada" className="rounded border p-2 text-sm" value={formulario.audiencia_alcanzada} onChange={(evento) => setFormulario({ ...formulario, audiencia_alcanzada: evento.target.value })} />
      </div>
      <textarea rows={3} placeholder="Descripción (opcional)" className="w-full rounded border p-2 text-sm" value={formulario.descripcion} onChange={(evento) => setFormulario({ ...formulario, descripcion: evento.target.value })} />

      <label className="block text-sm text-gray-700">
        {esPodcast ? 'Evidencia: captura de métricas o portada' : 'Evidencia: foto del evento'}
        <input required type="file" accept="image/*" className="mt-1 block w-full text-sm" onChange={(evento) => setArchivoEvidencia(evento.target.files?.[0] ?? null)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={hayMenores} onChange={(evento) => setHayMenores(evento.target.checked)} />
        En la foto aparecen menores de edad (no se publicará)
      </label>

      {esPodcast && (
        <SubirVideoDifusion
          titulo={formulario.titulo}
          descripcion={formulario.descripcion}
          onVideoSubido={(youtubeVideoId, categoryId) => setVideo({ youtubeVideoId, categoryId })}
          onVideoQuitado={() => setVideo(null)}
        />
      )}

      <button disabled={guardando} className="rounded bg-green-600 px-4 py-2 text-sm text-white disabled:opacity-50">
        {guardando ? 'Registrando…' : 'Registrar'}
      </button>
    </form>
  );
}
