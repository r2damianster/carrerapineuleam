'use client';

import { useEffect, useState } from 'react';
import type { VideoCategory } from '@/types';

interface SubirVideoDifusionProps {
  titulo: string;
  descripcion?: string;
  onVideoSubido: (youtubeVideoId: string, categoryId: string) => void;
  onVideoQuitado: () => void;
}

// Se muestra dentro de Difusión/Eventos cuando el tipo elegido es "podcast" —
// mismo mecanismo de app/portal/subir-video/page.tsx (subida reanudable
// directo navegador→YouTube, sin pasar por nuestro servidor), reusado acá
// para no duplicar el formulario en una página aparte.
export default function SubirVideoDifusion({ titulo, descripcion, onVideoSubido, onVideoQuitado }: SubirVideoDifusionProps) {
  const [categorias, setCategorias] = useState<VideoCategory[]>([]);
  const [categoria, setCategoria] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [subido, setSubido] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/video-categories?active=true')
      .then((res) => res.json())
      .then((data) => setCategorias(Array.isArray(data) ? data : []))
      .catch(() => setCategorias([]));
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
          try { resolve(JSON.parse(xhr.responseText)); } catch { reject(new Error('Respuesta inesperada de YouTube')); }
        } else {
          reject(new Error(`YouTube devolvió un error (${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error('Error de red subiendo el archivo a YouTube'));
      xhr.send(archivo);
    });
  };

  const handleSubir = async () => {
    if (!file || !categoria) {
      setError('Selecciona una categoría y un archivo de video');
      return;
    }
    setError('');
    setSubiendo(true);
    setProgreso(0);
    try {
      const iniciarRes = await fetch('/api/youtube/iniciar-subida', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titulo || 'Sin título', description: descripcion || '', fileSize: file.size, mimeType: file.type }),
      });
      const iniciarJson = await iniciarRes.json();
      if (!iniciarRes.ok) throw new Error(iniciarJson.error || 'Error iniciando la subida');

      const resultado = await subirArchivoAYoutube(iniciarJson.uploadUrl, file);

      setSubido(true);
      onVideoSubido(resultado.id, categoria);
    } catch (err: any) {
      setError(err.message);
      onVideoQuitado();
    } finally {
      setSubiendo(false);
    }
  };

  const handleQuitar = () => {
    setFile(null);
    setSubido(false);
    setProgreso(0);
    setError('');
    onVideoQuitado();
  };

  return (
    <div className="pt-4 border-t space-y-3">
      <label className="block text-sm font-medium text-gray-700">Video del podcast (opcional)</label>
      <p className="text-xs text-gray-500">Se sube directo a YouTube (no listado) y queda pendiente de aprobación aparte, antes de aparecer en la galería del sitio.</p>

      {error && <div className="p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

      {subido ? (
        <div className="flex items-center justify-between bg-green-50 text-green-700 text-sm p-3 rounded-md">
          <span>Video subido correctamente — se registrará al enviar el formulario.</span>
          <button type="button" onClick={handleQuitar} className="text-red-600 hover:underline ml-2">Quitar</button>
        </div>
      ) : (
        <div className="space-y-2">
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            disabled={subiendo}
            className="w-full rounded-md border-gray-300 shadow-sm p-2 border"
          >
            <option value="">Selecciona una categoría del video</option>
            {categorias.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <input
            type="file"
            accept="video/*"
            disabled={subiendo}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="block w-full text-sm"
          />
          {subiendo && (
            <div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-uleam-blue h-2 rounded-full transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">Subiendo... {progreso}%</p>
            </div>
          )}
          <button
            type="button"
            onClick={handleSubir}
            disabled={subiendo || !file || !categoria}
            className="px-4 py-2 bg-uleam-blue text-white text-sm font-bold rounded-lg hover:bg-uleam-blue/90 disabled:opacity-50"
          >
            {subiendo ? 'Subiendo...' : 'Subir video'}
          </button>
        </div>
      )}
    </div>
  );
}
