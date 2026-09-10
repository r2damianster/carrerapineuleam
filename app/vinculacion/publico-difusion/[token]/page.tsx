'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type EnlaceInfo = {
  nombre_invitado: string;
  profesores: { id: number; nombres: string; apellidos: string }[];
  proyectos: { id: string; nombre_oficial: string }[];
};

const TIPO_LABEL: Record<string, string> = {
  podcast: 'Podcast',
  evento_fisico: 'Evento Físico',
  encuentro_comunitario: 'Encuentro Comunitario',
  evento_formacion: 'Evento de Formación',
  visita_tecnica: 'Visita Técnica',
};

export default function EnlaceDifusionPublicoPage() {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [enlace, setEnlace] = useState<EnlaceInfo | null>(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [responsables, setResponsables] = useState<number[]>([]);

  const [form, setForm] = useState({
    registrador_externo_nombre: '',
    registrador_externo_contacto: '',
    titulo: '',
    tipo: 'evento_fisico',
    categoria: 'vinculacion',
    proyecto: '',
    asignatura: '',
    fecha: '',
    hora: '',
    audiencia_alcanzada: '',
    descripcion: '',
    observaciones: '',
  });

  useEffect(() => {
    fetch(`/api/enlaces-difusion/${token}`)
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setEnlace(data.data);
      })
      .catch(err => setErrorCarga(err.message || 'Este enlace ya no está disponible'))
      .finally(() => setLoading(false));
  }, [token]);

  const toggleResponsable = (id: number) => {
    setResponsables(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.registrador_externo_nombre.trim()) {
      setMensaje('Error: Escribe tu nombre');
      return;
    }
    if (responsables.length === 0) {
      setMensaje('Error: Debe seleccionar al menos un profesor responsable');
      return;
    }

    setEnviando(true);
    setMensaje('');
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

      const res = await fetch(`/api/enlaces-difusion/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          audiencia_alcanzada: form.audiencia_alcanzada ? parseInt(form.audiencia_alcanzada, 10) : null,
          evidencia_url,
          profesores_responsables: responsables,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnviado(true);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
      window.scrollTo(0, 0);
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Cargando...</div>;
  }

  if (errorCarga || !enlace) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-red-700 mb-2">Enlace no disponible</h2>
          <p className="text-gray-600">{errorCarga || 'Este enlace ya no está disponible.'}</p>
          <p className="text-sm text-gray-400 mt-4">Pide un enlace nuevo a quien te lo compartió.</p>
        </div>
      </div>
    );
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md text-center bg-white p-8 rounded-xl shadow-md border-t-4 border-green-500">
          <h2 className="text-xl font-bold text-green-700 mb-2">¡Registrado!</h2>
          <p className="text-gray-600">
            Tu evento/podcast fue registrado y quedó pendiente de revisión del equipo de la carrera. Gracias por compartirlo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <h2 className="text-3xl font-bold text-center text-uleam-blue mb-1">Registro de Evento / Podcast</h2>
        <p className="text-center text-gray-600 mb-8">Acceso temporal otorgado a {enlace.nombre_invitado}</p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-md ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tu nombre completo</label>
              <input type="text" name="registrador_externo_nombre" required value={form.registrador_externo_nombre} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Tu contacto (email o teléfono, opcional)</label>
              <input type="text" name="registrador_externo_contacto" value={form.registrador_externo_contacto} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Título del Evento / Podcast</label>
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
                {Object.entries(TIPO_LABEL).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {form.categoria === 'investigacion' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">¿Qué proyecto de investigación?</label>
              <select name="proyecto" required value={form.proyecto} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border">
                <option value="">Selecciona un proyecto...</option>
                {enlace.proyectos.map(p => (
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
              <input type="number" name="audiencia_alcanzada" min="0" value={form.audiencia_alcanzada} onChange={handleChange} className="mt-1 w-full rounded-md border-gray-300 shadow-sm p-2 border" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profesor(es) Responsable(s) — obligatorio</label>
            <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto space-y-1">
              {enlace.profesores.length === 0 && (
                <p className="text-sm text-gray-400">No hay profesores registrados.</p>
              )}
              {enlace.profesores.map(profesor => (
                <label key={profesor.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={responsables.includes(profesor.id)} onChange={() => toggleResponsable(profesor.id)} />
                  {profesor.nombres} {profesor.apellidos}
                </label>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-500">Debe respaldar el registro al menos un profesor real de la carrera.</p>
          </div>

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

          <div className="p-4 rounded-md bg-yellow-50 text-yellow-800 text-sm">
            Este registro quedará pendiente de revisión del equipo de la carrera antes de publicarse.
          </div>

          <button type="submit" disabled={enviando} className="w-full flex justify-center py-3 rounded-md shadow-sm text-lg font-medium text-white bg-uleam-blue hover:bg-uleam-blue/90 disabled:opacity-50">
            {enviando ? 'Enviando...' : 'Registrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
