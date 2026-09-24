'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import SelectorAreaProyectoPodcast from '@/components/SelectorAreaProyectoPodcast';
import SelectorParticipantesPodcast from '@/components/SelectorParticipantesPodcast';
import type { VideoCategory } from '@/types';

export default function SubirVideoPage() {
  const router = useRouter();
  const [categorias, setCategorias] = useState<VideoCategory[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');
  const [enviadoExitoso, setEnviadoExitoso] = useState(false);
  const [conteo, setConteo] = useState(5);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (enviadoExitoso && conteo > 0) {
      timer = setTimeout(() => setConteo(prev => prev - 1), 1000);
    } else if (enviadoExitoso && conteo === 0) {
      router.push('/portal/dashboard');
    }
    return () => clearTimeout(timer);
  }, [enviadoExitoso, conteo, router]);

  const resetFormulario = () => {
    setEnviadoExitoso(false);
    setConteo(5);
    setMensaje('');
    setForm({ title: '', description: '', category: '' });
    setFile(null);
    setProyectoId('');
    setAudienciaAlcanzada('');
    setParticipantes([]);
    setInvitadosInternos([]);
    setInvitadosExternos([]);
  };

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [area, setArea] = useState('vinculacion');
  const [proyectoId, setProyectoId] = useState('');
  const [audienciaAlcanzada, setAudienciaAlcanzada] = useState('');
  const [participantes, setParticipantes] = useState<number[]>([]);
  const [invitadosInternos, setInvitadosInternos] = useState<string[]>([]);
  const [invitadosExternos, setInvitadosExternos] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/video-categories?active=true')
      .then((res) => res.json())
      .then((data) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]))
      .finally(() => setLoadingCategorias(false));
  }, []);

  const subirArchivoAYoutube = (uploadUrl: string, archivo: File): Promise<{ id: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', archivo.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgreso(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error('Respuesta inesperada de YouTube'));
          }
        } else {
          reject(new Error(`YouTube devolvió un error (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red subiendo el archivo a YouTube'));
      xhr.send(archivo);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMensaje('Error: selecciona un archivo de video');
      return;
    }
    if (!form.category) {
      setMensaje('Error: selecciona una categoría');
      return;
    }
    if (!proyectoId) {
      setMensaje('Error: selecciona el proyecto del podcast');
      return;
    }

    setSubiendo(true);
    setProgreso(0);
    setMensaje('');

    try {
      // 1. Pedir al servidor que inicie la sesión reanudable en YouTube
      const iniciarRes = await fetch('/api/youtube/iniciar-subida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          fileSize: file.size,
          mimeType: file.type,
        }),
      });
      const iniciarJson = await iniciarRes.json();
      if (!iniciarRes.ok) throw new Error(iniciarJson.error || 'Error iniciando la subida');

      // 2. Subir el archivo directo a YouTube (no pasa por nuestro servidor)
      const resultado = await subirArchivoAYoutube(iniciarJson.uploadUrl, file);

      // 3. Registrar el video en nuestro sitio, pendiente de aprobación
      const registrarRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          category: form.category,
          tags: [area],
          youtube_video_id: resultado.id,
          area_sustantiva: area,
          proyecto_id: proyectoId,
          participantes_estudiantes: participantes,
          invitados_internos: invitadosInternos,
          invitados_externos: invitadosExternos,
          audiencia_alcanzada: audienciaAlcanzada ? parseInt(audienciaAlcanzada, 10) : 0,
        }),
      });
      const registrarJson = await registrarRes.json();
      if (!registrarRes.ok) throw new Error(registrarJson.error || 'Error registrando el video');

      setEnviadoExitoso(true);
      setConteo(5);
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  if (enviadoExitoso) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12 mt-16">
          <div className="max-w-md w-full text-center bg-white p-8 rounded-xl shadow-md border-t-4 border-green-500">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Video Subido Exitosamente!</h2>
            <p className="text-gray-600 mb-6 text-sm">
              Tu video se subió a YouTube (no listado) y quedó pendiente de aprobación para aparecer en la galería del sitio.
            </p>
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 mb-6">
              Redirigiendo automáticamente al Portal PINE en <span className="font-bold text-sm">{conteo}</span> segundo{conteo !== 1 ? 's' : ''}...
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => router.push('/portal/dashboard')}
                className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition shadow-sm"
              >
                Ir al Portal PINE Ahora
              </button>
              <button
                type="button"
                onClick={resetFormulario}
                className="w-full py-2 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition text-sm"
              >
                Subir Otro Video
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 mt-16">
        <div className="max-w-2xl mx-auto">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium mb-4">
            &larr; Volver al Portal PINE
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Subir Podcast / Video</h1>
            <p className="text-gray-600 mt-2">
              Se sube directo a YouTube (como &quot;no listado&quot;) y queda pendiente de aprobación antes de aparecer en la galería del sitio.
            </p>
          </div>

          {mensaje && (
            <div className={`p-4 mb-6 rounded-md ${mensaje.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {mensaje}
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-md space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                disabled={loadingCategorias}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              >
                <option value="">Selecciona una categoría</option>
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <SelectorAreaProyectoPodcast
              area={area}
              proyectoId={proyectoId}
              onAreaChange={setArea}
              onProyectoChange={setProyectoId}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Audiencia en vivo (N° personas, opcional)</label>
              <input
                type="number"
                min="0"
                value={audienciaAlcanzada}
                onChange={(e) => setAudienciaAlcanzada(e.target.value)}
                placeholder="Ej: 15"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              />
            </div>

            <SelectorParticipantesPodcast
              areaSustantiva={area}
              participantes={participantes}
              invitadosInternos={invitadosInternos}
              invitadosExternos={invitadosExternos}
              onParticipantesChange={setParticipantes}
              onInvitadosInternosChange={setInvitadosInternos}
              onInvitadosExternosChange={setInvitadosExternos}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Archivo de video *</label>
              <input
                type="file"
                accept="video/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm"
              />
            </div>

            {subiendo && (
              <div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-uleam-blue h-3 rounded-full transition-all" style={{ width: `${progreso}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">Subiendo a YouTube... {progreso}%</p>
              </div>
            )}

            <button
              type="submit"
              disabled={subiendo}
              className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 disabled:opacity-50"
            >
              {subiendo ? 'Subiendo...' : 'Subir Video'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
