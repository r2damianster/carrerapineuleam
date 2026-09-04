'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SubirVideoDifusion from '@/components/SubirVideoDifusion';

export default function GestionCarreraPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [profesores, setProfesores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [responsables, setResponsables] = useState<number[]>([]);
  const [video, setVideo] = useState<{ youtubeVideoId: string; categoryId: string } | null>(null);

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
        if (data.usuario.rol === 'profesor') {
          setResponsables([parseInt(data.usuario.id, 10)]);
        }
      })
      .catch(() => router.push('/portal/login?redirect=/gestion-carrera'));

    fetch('/api/profesores')
      .then(res => res.ok ? res.json() : { profesores: [] })
      .then(data => setProfesores(data.profesores || []))
      .catch(() => setProfesores([]));
  }, [router]);

  const toggleResponsable = (id: number) => {
    setResponsables(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>
        <h2 className="text-3xl font-bold text-center text-indigo-900 mb-2">Gestión de Carrera</h2>
        <p className="text-center text-gray-600 mb-8">Registro de Eventos y Difusión</p>

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
              </select>
            </div>
          </div>

          {form.categoria === 'investigacion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">¿Qué proyecto de investigación?</label>
              <input type="text" name="proyecto" value={form.proyecto} onChange={handleChange} placeholder="Ej. Innovaciones Pedagógicas" className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
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
            <label className="block text-sm font-medium text-gray-700">Descripción</label>
            <textarea name="descripcion" rows={3} value={form.descripcion} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
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
    </div>
  );
}
