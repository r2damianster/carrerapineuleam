'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DataTable from '@/components/admin/DataTable';
import type { Video, VideoCategory } from '@/types';

interface EstadoYoutube {
  conectado: boolean;
  channel_title: string | null;
}

function AdminVideosPage() {
  const searchParams = useSearchParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [pendientes, setPendientes] = useState<Video[]>([]);
  const [categories, setCategories] = useState<VideoCategory[]>([]);
  const [estadoYoutube, setEstadoYoutube] = useState<EstadoYoutube | null>(null);
  const [publicarAlAprobar, setPublicarAlAprobar] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    youtube_url: '',
    description: '',
    category: '',
    published_date: new Date().toISOString().split('T')[0],
    order: 0,
    is_featured: false,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [videosRes, catsRes, pendientesRes, estadoRes] = await Promise.all([
        fetch('/api/videos?all=true'),
        fetch('/api/video-categories'),
        fetch('/api/videos?pendientes=true'),
        fetch('/api/youtube/estado'),
      ]);
      if (!videosRes.ok || !catsRes.ok) throw new Error('Failed to fetch');
      setVideos(await videosRes.json());
      setCategories(await catsRes.json());
      setPendientes(pendientesRes.ok ? await pendientesRes.json() : []);
      setEstadoYoutube(estadoRes.ok ? await estadoRes.json() : null);
    } catch (error) {
      console.error('Error loading videos:', error);
      setVideos([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const resolverPendiente = async (video: Video, accion: 'aprobar' | 'rechazar') => {
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          accion === 'aprobar'
            ? { aprobar: true, hacerPublicoEnYoutube: !!publicarAlAprobar[video.id] }
            : { rechazar: true }
        ),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      loadData();
    } catch (error) {
      console.error('Error resolviendo video pendiente:', error);
      alert('Error al procesar el video pendiente');
    }
  };

  const handleToggleActivo = async (video: Video) => {
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !video.activo }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadData();
    } catch (error) {
      console.error('Error toggling podcast:', error);
      alert('Error al cambiar visibilidad');
    }
  };

  const handleToggleDestacado = async (video: Video) => {
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !video.is_featured }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadData();
    } catch (error) {
      console.error('Error toggling destacado:', error);
      alert('Error al cambiar destacado');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      youtube_url: '',
      description: '',
      category: categories[0]?.id || '',
      published_date: new Date().toISOString().split('T')[0],
      order: 0,
      is_featured: false,
    });
    setEditingVideo(null);
    setShowForm(false);
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setFormData({
      title: video.title,
      youtube_url: video.youtube_url || '',
      description: video.description || '',
      category: video.category,
      published_date: video.published_date || '',
      order: video.order,
      is_featured: video.is_featured,
    });
    setShowForm(true);
  };

  const handleDelete = async (video: Video) => {
    try {
      const res = await fetch(`/api/videos/${video.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadData();
    } catch (error) {
      console.error('Error deleting video:', error);
      alert('Error al eliminar podcast');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // El link de YouTube ya no es obligatorio — se puede registrar el episodio
    // solo con metadata y completar el link después, editando.
    try {
      const url = editingVideo ? `/api/videos/${editingVideo.id}` : '/api/videos';
      const method = editingVideo ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving video:', error);
      alert('Error al guardar podcast');
    }
  };

  const columns = [
    { key: 'title', label: 'Título' },
    {
      key: 'category',
      label: 'Categoría',
      render: (item: Video) => {
        const categoryName = (item as any).expand?.category?.name || 'Sin categoría';
        return (
          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            {categoryName}
          </span>
        );
      },
    },
    {
      key: 'published_date',
      label: 'Fecha',
      render: (item: Video) => (
        <span className="text-sm text-gray-600">
          {item.published_date ? new Date(item.published_date).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
    },
    {
      key: 'is_featured',
      label: 'Destacado',
      render: (item: Video) => (
        <button
          onClick={() => handleToggleDestacado(item)}
          className={`px-2 py-1 rounded text-xs font-bold ${item.is_featured ? 'bg-uleam-gold text-uleam-blue hover:opacity-80' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
          {item.is_featured ? 'Sí' : 'No'}
        </button>
      ),
    },
    {
      key: 'activo',
      label: 'Visible en el sitio',
      render: (item: Video) => (
        <button
          onClick={() => handleToggleActivo(item)}
          className={`px-2 py-1 rounded text-xs font-bold ${item.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
        >
          {item.activo ? 'Sí — ocultar' : 'Oculto — mostrar'}
        </button>
      ),
    },
  ];

  const youtubeError = searchParams.get('youtube_error');
  const youtubeConectadoOk = searchParams.get('conectado') === 'true';

  const banner = (
    <div className="mb-6 space-y-2">
      {estadoYoutube && (
        <div className={`p-4 rounded-lg flex items-center justify-between gap-4 flex-wrap ${estadoYoutube.conectado ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
          <span className="text-sm">
            {estadoYoutube.conectado
              ? <>Canal de YouTube conectado: <strong>{estadoYoutube.channel_title}</strong></>
              : 'No hay ningún canal de YouTube conectado — los profesores no podrán subir videos hasta que conectes uno.'}
          </span>
          <a href="/api/youtube/oauth-start" className="text-sm font-bold text-uleam-blue hover:underline whitespace-nowrap">
            {estadoYoutube.conectado ? 'Reconectar' : 'Conectar canal'}
          </a>
        </div>
      )}
      {youtubeConectadoOk && (
        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">Canal de YouTube conectado correctamente.</div>
      )}
      {youtubeError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Error conectando el canal de YouTube ({youtubeError}). Intenta de nuevo.
        </div>
      )}
    </div>
  );

  const seccionPendientes = pendientes.length > 0 && (
    <div className="mb-8 bg-white rounded-xl p-6 shadow-md border-2 border-uleam-gold">
      <h2 className="text-xl font-bold text-uleam-blue mb-4">Videos propuestos pendientes ({pendientes.length})</h2>
      <p className="text-sm text-gray-500 mb-4">
        Subidos por profesores directo a YouTube (no listado) desde &quot;Subir Podcast/Video&quot; — no aparecen en el sitio hasta que apruebes.
      </p>
      <div className="space-y-4">
        {pendientes.map((video) => (
          <div key={video.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="font-bold text-gray-800">{video.title}</p>
                {video.description && <p className="text-sm text-gray-600 mt-1">{video.description}</p>}
                {video.embed_id && (
                  <a href={`https://youtu.be/${video.embed_id}`} target="_blank" rel="noopener noreferrer" className="text-sm text-uleam-blue hover:underline">
                    Ver en YouTube (no listado) →
                  </a>
                )}
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!publicarAlAprobar[video.id]}
                    onChange={(e) => setPublicarAlAprobar({ ...publicarAlAprobar, [video.id]: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Publicar también como público en YouTube</span>
                </label>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => resolverPendiente(video, 'aprobar')}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-lg hover:bg-green-700 transition"
                >
                  Aprobar
                </button>
                <button
                  onClick={() => resolverPendiente(video, 'rechazar')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-300 transition"
                >
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (showForm) {
    return (
      <div>
        {banner}
        {seccionPendientes}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-uleam-blue">
            {editingVideo ? 'Editar Podcast' : 'Nuevo Podcast'}
          </h2>
          <button
            onClick={resetForm}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            ← Volver
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-md max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Título *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                placeholder="Título del video"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">URL de YouTube</label>
              <input
                type="url"
                value={formData.youtube_url}
                onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-gray-500 mt-1">Opcional — puedes registrar el episodio antes de tener el link y completarlo después</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
                placeholder="Descripción opcional del video"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              >
                <option value="">Selecciona una categoría</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                ¿No hay categorías? <a href="/admin/categories" className="text-uleam-blue underline">Crear categorías</a>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de publicación</label>
                <input
                  type="date"
                  value={formData.published_date}
                  onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">Marcar como destacado</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
            >
              {editingVideo ? 'Actualizar' : 'Crear'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      {banner}
      {seccionPendientes}
      <DataTable
        title="Podcast"
        columns={columns}
        data={videos}
        loading={loading}
        onAdd={() => {
          if (categories.length === 0) {
            alert('Primero debes crear categorías de video');
            return;
          }
          setShowForm(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default function AdminVideosPageWrapper() {
  return (
    <Suspense fallback={null}>
      <AdminVideosPage />
    </Suspense>
  );
}
