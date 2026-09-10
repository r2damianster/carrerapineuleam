'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SubirVideoDifusion from '@/components/SubirVideoDifusion';
import EnlaceDifusionModal from '@/components/EnlaceDifusionModal';
import EnlacesDifusionList from '@/components/EnlacesDifusionList';

export default function GestionCarreraPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [profesores, setProfesores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [proyectosInvestigacion, setProyectosInvestigacion] = useState<{ id: string; nombre_oficial: string }[]>([]);
  const [responsables, setResponsables] = useState<number[]>([]);
  const [video, setVideo] = useState<{ youtubeVideoId: string; categoryId: string } | null>(null);
  const [modulosAcceso, setModulosAcceso] = useState<string[]>([]);
  const [mostrarModalEnlace, setMostrarModalEnlace] = useState(false);

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'evento_formacion',
    categoria: 'vinculacion',
    proyecto: '',
    asignatura: '',
    audiencia_alcanzada: '',
    descripcion: '',
    fecha: '',
    hora: '',
    observaciones: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (!['profesor', 'admin'].includes(data.usuario.rol)) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        setModulosAcceso(data.usuario.modulos_acceso || []);
        if (data.usuario.rol === 'profesor') {
          setResponsables([parseInt(data.usuario.id, 10)]);
        }
      })
      .catch(() => router.push('/portal/login?redirect=/gestion-carrera'));

    fetch('/api/profesores')
      .then(res => res.ok ? res.json() : { profesores: [] })
      .then(data => setProfesores(data.profesores || []))
      .catch(() => setProfesores([]));

    // Los 3 proyectos de investigación propios del grupo (Internacionalización,
    // Desarrollo de Habilidades Lingüísticas, Mentoring) — no todo lo que tenga
    // area='investigacion' en la tabla `proyectos` (esa también incluye RED LEA,
    // que es una red no un proyecto propio, y Docencia Innovadora, que no tiene
    // líder de investigación propio, ver lib/data.ts:liderProyectoPropio).
    const PROYECTOS_INVESTIGACION_IDS = ['internacionalizacion', 'desarrollo_habilidades', 'mentoring'];
    fetch('/api/proyectos?all=true')
      .then(res => res.ok ? res.json() : [])
      .then((rows: any[]) => setProyectosInvestigacion(
        (Array.isArray(rows) ? rows : [])
          .filter(p => PROYECTOS_INVESTIGACION_IDS.includes(p.id))
          .sort((a, b) => PROYECTOS_INVESTIGACION_IDS.indexOf(a.id) - PROYECTOS_INVESTIGACION_IDS.indexOf(b.id))
          .map(p => ({ id: p.id, nombre_oficial: p.nombre_oficial }))
      ))
      .catch(() => setProyectosInvestigacion([]));
  }, [router]);

  // Acceso temporal para externos (sin cuenta) — solo profesores con módulo
  // vinculacion/investigacion/contenido_sitio, ver lib/permisos-enlace-difusion.ts
  const puedeGenerarEnlace = modulosAcceso.some(m => ['vinculacion', 'investigacion', 'contenido_sitio'].includes(m));

  const toggleResponsable = (id: number) => {
    setResponsables(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generarConIA = async () => {
    if (!form.titulo) {
      setErrorIA('Escribe al menos el título del evento antes de generar con IA.');
      return;
    }
    setGenerandoIA(true);
    setErrorIA('');
    try {
      const res = await fetch('/api/difusion/generar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: form.titulo,
          tipo: form.tipo,
          categoria: form.categoria,
          proyecto: form.proyecto,
          asignatura: form.asignatura,
          fecha: form.fecha,
          hora: form.hora,
          audiencia_alcanzada: form.audiencia_alcanzada,
          descripcion_actual: form.descripcion,
          observaciones_actual: form.observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando texto con IA');
      setForm(prev => ({
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (responsables.length === 0) {
      setMessage('Error: Debe seleccionar al menos un profesor responsable');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      let evidencia_url = '';
      if (file) {
        const uploadData = new FormData();
        uploadData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || 'Error subiendo la evidencia');
        evidencia_url = uploadJson.url;
      }

      const tagPorCategoria: Record<string, string> = { investigacion: 'investigacion', vinculacion: 'vinculacion', asignatura: 'docencia' };

      const res = await fetch('/api/difusion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          audiencia_alcanzada: parseInt(form.audiencia_alcanzada),
          evidencia_url,
          profesores_responsables: responsables,
          ...(video ? { youtube_video_id: video.youtubeVideoId, video_category: video.categoryId, video_tags: [tagPorCategoria[form.categoria] || 'vinculacion'] } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage('¡Evento registrado correctamente!');
      setForm({ titulo: '', tipo: 'evento_formacion', categoria: 'vinculacion', proyecto: '', asignatura: '', audiencia_alcanzada: '', descripcion: '', fecha: '', hora: '', observaciones: '' });
      setFile(null);
      setVideo(null);
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
        <h2 className="text-3xl font-bold text-center text-indigo-900 mb-2">Gestión de Carrera</h2>
        <p className="text-center text-gray-600 mb-8">Registro de Eventos y Difusión</p>
        {puedeGenerarEnlace && <EnlacesDifusionList />}

        {message && (
          <div className={`p-4 mb-6 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título del Evento</label>
            <input type="text" name="titulo" required value={form.titulo} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
              <select name="categoria" value={form.categoria} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="investigacion">Investigación</option>
                <option value="vinculacion">Vinculación</option>
                <option value="asignatura">Asignatura</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo de Evento</label>
              <select name="tipo" value={form.tipo} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="podcast">Podcast</option>
                <option value="evento_fisico">Evento Físico</option>
                <option value="encuentro_comunitario">Encuentro Comunitario</option>
                <option value="evento_formacion">Evento de Formación</option>
                <option value="visita_tecnica">Visita Técnica</option>
              </select>
            </div>
          </div>

          {form.categoria === 'investigacion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">¿Qué proyecto de investigación?</label>
              <select name="proyecto" required value={form.proyecto} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona un proyecto...</option>
                {proyectosInvestigacion.map(p => (
                  <option key={p.id} value={p.nombre_oficial}>{p.nombre_oficial}</option>
                ))}
              </select>
            </div>
          )}
          {form.categoria === 'asignatura' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Nombre de la Asignatura</label>
              <input type="text" name="asignatura" value={form.asignatura} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input type="date" name="fecha" required value={form.fecha} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Hora</label>
              <input type="time" name="hora" value={form.hora} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">N° Asistentes</label>
              <input type="number" name="audiencia_alcanzada" min="0" required value={form.audiencia_alcanzada} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div>
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

          {form.tipo === 'podcast' && (
            <SubirVideoDifusion
              titulo={form.titulo}
              descripcion={form.descripcion}
              onVideoSubido={(youtubeVideoId, categoryId) => setVideo({ youtubeVideoId, categoryId })}
              onVideoQuitado={() => setVideo(null)}
            />
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <button
                type="button"
                onClick={generarConIA}
                disabled={generandoIA}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
              >
                {generandoIA ? 'Generando...' : form.descripcion ? '✨ Mejorar con IA' : '✨ Generar con IA'}
              </button>
            </div>
            <textarea name="descripcion" rows={3} value={form.descripcion} onChange={handleChange} placeholder="Escribe una descripción breve (opcional) y la IA la mejora, o déjala vacía y la IA la redacta desde cero." className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            {errorIA && <p className="mt-1 text-xs text-red-600">{errorIA}</p>}
            <p className="mt-1 text-xs text-gray-500">Usa el título, tipo, categoría, fecha y asistentes ya ingresados (y lo que escribas aquí) para redactar/mejorar descripción y observaciones — revísalo antes de guardar.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observaciones (opcional)</label>
            <textarea name="observaciones" rows={2} value={form.observaciones} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Foto / Captura (opcional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-gray-500" />
          </div>

          <button type="submit" disabled={loading} className="w-full flex justify-center py-3 rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Guardando...' : 'Registrar Evento'}
          </button>
        </form>
      </div>
      {mostrarModalEnlace && <EnlaceDifusionModal onClose={() => setMostrarModalEnlace(false)} />}
    </div>
  );
}
