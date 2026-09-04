'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import type { VideoCategory } from '@/types';

const TAGS_DISPONIBLES = [
  { value: 'docencia', label: 'Docencia' },
  { value: 'vinculacion', label: 'Vinculación' },
  { value: 'investigacion', label: 'Investigación' },
];

export default function SubirVideoPage() {
  const [categorias, setCategorias] = useState<VideoCategory[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    tags: [] as string[],
  });
  const [file, setFile] = useState<File | null>(null);

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
          tags: form.tags,
          youtube_video_id: resultado.id,
        }),
      });
      const registrarJson = await registrarRes.json();
      if (!registrarRes.ok) throw new Error(registrarJson.error || 'Error registrando el video');

      setMensaje('¡Listo! Tu video se subió a YouTube (no listado) y quedó pendiente de aprobación para aparecer en el sitio.');
      setForm({ title: '', description: '', category: '', tags: [] });
      setFile(null);
    } catch (error: any) {
      setMensaje(`Error: ${error.message}`);
    } finally {
      setSubiendo(false);
    }
  };

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Etiquetas (opcional)</label>
              <div className="space-y-2">
                {TAGS_DISPONIBLES.map((tag) => (
                  <label key={tag.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.tags.includes(tag.value)}
                      onChange={(e) => {
                        const tags = e.target.checked
                          ? [...form.tags, tag.value]
                          : form.tags.filter((t) => t !== tag.value);
                        setForm({ ...form, tags });
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>

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
      <Footer context="general" />
    </>
  );
}
