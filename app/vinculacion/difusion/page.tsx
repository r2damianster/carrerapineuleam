'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SubirVideoDifusion from '@/components/SubirVideoDifusion';
import SelectorParticipantesPodcast from '@/components/SelectorParticipantesPodcast';
import EnlaceDifusionModal from '@/components/EnlaceDifusionModal';
import EnlacesDifusionList from '@/components/EnlacesDifusionList';

export default function DifusionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);
  const [profesores, setProfesores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [responsables, setResponsables] = useState<number[]>([]);
  const [usuario, setUsuario] = useState<{ rol: string; modulos_acceso: string[] } | null>(null);
  const [video, setVideo] = useState<{ youtubeVideoId: string; categoryId: string } | null>(null);
  const [videoResetKey, setVideoResetKey] = useState(0);
  const [mostrarModalEnlace, setMostrarModalEnlace] = useState(false);
  // Este formulario es específicamente de Vinculación — el área del podcast
  // queda fija a 'vinculacion' (mismo id de proyecto en la tabla `proyectos`),
  // solo se pide con quién se hizo (Sesión 38).
  const [participantes, setParticipantes] = useState<number[]>([]);
  const [invitadosInternos, setInvitadosInternos] = useState<string[]>([]);
  const [invitadosExternos, setInvitadosExternos] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => { setUsuario(data.usuario); setCheckingSession(false); })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/difusion'));

    fetch('/api/profesores')
      .then(res => res.ok ? res.json() : { profesores: [] })
      .then(data => setProfesores(data.profesores || []))
      .catch(() => setProfesores([]));
  }, [router]);

  const puedeSubirVideo = !!usuario && (
    ['profesor', 'admin'].includes(usuario.rol) ||
    (usuario.rol === 'estudiante' && usuario.modulos_acceso.includes('subir_video'))
  );

  // Acceso temporal para externos (sin cuenta) — solo profesores con módulo
  // vinculacion/investigacion/contenido_sitio, ver lib/permisos-enlace-difusion.ts
  const puedeGenerarEnlace = !!usuario && ['profesor', 'admin'].includes(usuario.rol) &&
    usuario.modulos_acceso.some(m => ['vinculacion', 'investigacion', 'contenido_sitio'].includes(m));

  const toggleResponsable = (id: number) => {
    setResponsables(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');

  const [formData, setFormData] = useState({
    titulo: '',
    tipo: 'podcast',
    categoria: 'vinculacion',
    fecha: '',
    hora: '',
    audiencia_alcanzada: '',
    descripcion: '',
    observaciones: '',
  });

  const [file, setFile] = useState<File | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const generarConIA = async () => {
    if (!formData.titulo) {
      setErrorIA('Escribe al menos el título antes de generar con IA.');
      return;
    }
    setGenerandoIA(true);
    setErrorIA('');
    try {
      const res = await fetch('/api/difusion/generar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formData.titulo,
          tipo: formData.tipo,
          categoria: formData.categoria,
          fecha: formData.fecha,
          hora: formData.hora,
          audiencia_alcanzada: formData.audiencia_alcanzada,
          descripcion_actual: formData.descripcion,
          observaciones_actual: formData.observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando texto con IA');
      setFormData(prev => ({
        ...prev,
        descripcion: data.descripcion || prev.descripcion,
        observaciones: data.observaciones || prev.observaciones,
      }));
    } catch (error: any) {
      setErrorIA(error.message);
    } finally {
      setGenerandoIA(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Error: Es obligatorio subir una evidencia gráfica');
      return;
    }
    if (responsables.length === 0) {
      setMessage('Error: Debe seleccionar al menos un profesor responsable');
      return;
    }
    if (formData.tipo === 'podcast' && puedeSubirVideo && !video) {
      setMessage('Error: Debe subir el video del podcast (botón "Subir video" de arriba) antes de registrar la actividad');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // 1. Subir evidencia a Cloudinary
      const uploadData = new FormData();
      uploadData.append('file', file);
      
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: uploadData
      });
      
      const uploadJson = await uploadRes.json();
      
      if (!uploadRes.ok) {
        throw new Error(uploadJson.error || 'Error subiendo la evidencia');
      }
      
      const evidencia_url = uploadJson.url;

      // 2. Registrar en base de datos
      const payload = {
        ...formData,
        audiencia_alcanzada: parseInt(formData.audiencia_alcanzada),
        evidencia_url,
        profesores_responsables: responsables,
        ...(video ? {
          youtube_video_id: video.youtubeVideoId,
          video_category: video.categoryId,
          video_tags: [formData.categoria || 'vinculacion'],
          video_area_sustantiva: formData.categoria === 'investigacion' ? 'investigacion' : 'vinculacion',
          video_proyecto_id: 'vinculacion',
          video_participantes: participantes,
          video_invitados_internos: invitadosInternos,
          video_invitados_externos: invitadosExternos,
        } : {}),
      };

      const res = await fetch('/api/difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage(`¡Actividad de difusión registrada correctamente!`);

      // Reiniciar el formulario en la misma página — antes esto mandaba a la
      // web pública (router.push('/')), que parecía sacar a la persona del
      // portal sin avisar. Se queda acá para poder registrar otra actividad.
      setFormData({ titulo: '', tipo: 'podcast', categoria: 'vinculacion', fecha: '', hora: '', audiencia_alcanzada: '', descripcion: '', observaciones: '' });
      setResponsables([]);
      setFile(null);
      setVideo(null);
      setVideoResetKey((k) => k + 1);
      setParticipantes([]);
      setInvitadosInternos([]);
      setInvitadosExternos([]);

    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
          {puedeGenerarEnlace && (
            <button
              type="button"
              onClick={() => setMostrarModalEnlace(true)}
              className="text-sm font-semibold text-uleam-blue hover:underline"
            >
              🔗 Acceso temporal para externos
            </button>
          )}
        </div>
        <h2 className="text-3xl font-bold text-center text-indigo-900 mb-2">Registro de Difusión</h2>
        <p className="text-center text-gray-600 mb-8">Sube tus podcasts o eventos y reporta la audiencia alcanzada</p>
        {puedeGenerarEnlace && <EnlacesDifusionList />}

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Título del Evento / Podcast *</label>
              <input type="text" name="titulo" required value={formData.titulo} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Título del Evento / Podcast</label>
              <input type="text" name="titulo" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              <label className="block text-sm font-medium text-gray-700">Categoría *</label>
              <select name="categoria" value={formData.categoria} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="vinculacion">Vinculación</option>
                <option value="investigacion">Investigación</option>
                <option value="asignatura">Asignatura</option>
                <option value="maestria">Maestría / Posgrado</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Difusión</label>
              <label className="block text-sm font-medium text-gray-700">Tipo de Difusión *</label>
              <select name="tipo" value={formData.tipo} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="podcast">Podcast</option>
                <option value="evento_fisico">Evento Físico</option>
                <option value="encuentro_comunitario">Encuentro Comunitario</option>
                <option value="evento_formacion">Evento de Formación</option>
                <option value="visita_tecnica">Visita Técnica</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" name="fecha" required onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              <label className="block text-sm font-medium text-gray-700">Fecha *</label>
              <input type="date" name="fecha" required value={formData.fecha} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Audiencia Alcanzada (N° Personas)</label>
              <input type="number" name="audiencia_alcanzada" min="1" required onChange={handleChange} placeholder="Ej: 150" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
              <label className="block text-sm font-medium text-gray-700">Hora (opcional)</label>
              <input type="time" name="hora" value={formData.hora} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Audiencia Alcanzada (N° Personas) *</label>
              <input type="number" name="audiencia_alcanzada" min="1" required value={formData.audiencia_alcanzada} onChange={handleChange} placeholder="Ej: 150" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Descripción del Evento / Podcast</label>
              <button
                type="button"
                onClick={generarConIA}
                disabled={generandoIA || !formData.titulo}
                className="px-3 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-semibold rounded-md shadow hover:opacity-90 disabled:opacity-50 transition"
              >
                {generandoIA ? 'Generando con IA...' : '✨ Generar / Pulir con IA'}
              </button>
            </div>
            {errorIA && <p className="text-xs text-red-600">{errorIA}</p>}
            <textarea
              name="descripcion"
              rows={4}
              value={formData.descripcion}
              onChange={handleChange}
              placeholder="Describe en 2-4 líneas de qué trató el evento/podcast, objetivos y logros alcanzados (conectado directamente con /admin/contenido)."
              className="w-full rounded-md border-gray-300 shadow-sm p-3 border text-sm"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones adicionales (opcional)</label>
              <input
                type="text"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                placeholder="Notas breves, recordatorios o contexto adicional"
                className="w-full rounded-md border-gray-300 shadow-sm p-2 border text-sm"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Profesor(es) Responsable(s)</label>
            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
              {profesores.length === 0 && (
                <p className="text-sm text-gray-400">Cargando profesores...</p>
              )}
              {profesores.map(profesor => (
                <label key={profesor.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={responsables.includes(profesor.id)}
                    onChange={() => toggleResponsable(profesor.id)}
                  />
                  {profesor.nombres} {profesor.apellidos}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Puede seleccionar más de un profesor responsable.</p>
          </div>

          {formData.tipo === 'podcast' && puedeSubirVideo && (
            <>
              <SubirVideoDifusion
                key={videoResetKey}
                titulo={formData.titulo}
                onVideoSubido={(youtubeVideoId, categoryId) => setVideo({ youtubeVideoId, categoryId })}
                onVideoQuitado={() => setVideo(null)}
              />
              <SelectorParticipantesPodcast
                areaSustantiva="vinculacion"
                participantes={participantes}
                invitadosInternos={invitadosInternos}
                invitadosExternos={invitadosExternos}
                onParticipantesChange={setParticipantes}
                onInvitadosInternosChange={setInvitadosInternos}
                onInvitadosExternosChange={setInvitadosExternos}
              />
            </>
          )}

          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto / Evidencia del Evento o Podcast</label>
            <input type="file" required accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
            <p className="mt-2 text-xs text-gray-500">Obligatorio subir la captura de las métricas del podcast o la foto del evento físico.</p>
          </div>

          <div className="pt-6">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Subiendo Evidencia y Registrando...' : 'Registrar Actividad de Difusión'}
            </button>
          </div>
        </form>
      </div>
      {mostrarModalEnlace && <EnlaceDifusionModal onClose={() => setMostrarModalEnlace(false)} />}
    </div>
  );
}
