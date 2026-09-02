'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/admin/DataTable';

interface NewsRow {
  id: string;
  titulo: string;
  descripcion?: string;
  fecha: string;
  is_featured: boolean;
  slug?: string;
  photos: string[];
}

export default function AdminNewsPage() {
  const [news, setNews] = useState<NewsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsRow | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    is_featured: false,
    slug: '',
    imagen: '',
  });

  useEffect(() => {
    loadNews();
  }, []);

  const loadNews = async () => {
    try {
      const res = await fetch('/api/actividades-difusion?origen=noticia');
      if (!res.ok) throw new Error('Failed to fetch news');
      const rows = await res.json();
      setNews(rows.map((r: any) => ({ ...r, id: String(r.id) })));
    } catch (error) {
      console.error('Error loading news:', error);
      setNews([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      is_featured: false,
      slug: '',
      imagen: '',
    });
    setEditingNews(null);
    setShowForm(false);
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleEdit = (item: NewsRow) => {
    setEditingNews(item);
    setFormData({
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      fecha: item.fecha?.slice(0, 10) || '',
      is_featured: item.is_featured,
      slug: item.slug || '',
      imagen: item.photos?.[0] || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (item: NewsRow) => {
    try {
      const res = await fetch(`/api/actividades-difusion/${item.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadNews();
    } catch (error) {
      console.error('Error deleting news:', error);
      alert('Error al eliminar noticia');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const slug = formData.slug || generateSlug(formData.titulo);
    const payload = {
      origen: 'noticia',
      titulo: formData.titulo,
      descripcion: formData.descripcion,
      fecha: formData.fecha,
      is_featured: formData.is_featured,
      slug,
      photos: formData.imagen ? [formData.imagen] : [],
    };

    try {
      const url = editingNews ? `/api/actividades-difusion/${editingNews.id}` : '/api/actividades-difusion';
      const method = editingNews ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      resetForm();
      loadNews();
    } catch (error) {
      console.error('Error saving news:', error);
      alert('Error al guardar noticia');
    }
  };

  const columns = [
    { key: 'titulo', label: 'Título' },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (item: NewsRow) => (
        <span className="text-sm text-gray-600">
          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
    },
    {
      key: 'is_featured',
      label: 'Destacado',
      render: (item: NewsRow) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_featured ? 'bg-uleam-gold text-uleam-blue' : 'bg-gray-200 text-gray-700'}`}>
          {item.is_featured ? 'Sí' : 'No'}
        </span>
      ),
    },
  ];

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-uleam-blue">
            {editingNews ? 'Editar Noticia' : 'Nueva Noticia'}
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
                value={formData.titulo}
                onChange={(e) => {
                  const titulo = e.target.value;
                  setFormData({ ...formData, titulo, slug: generateSlug(titulo) });
                }}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Slug</label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                placeholder="se-genera-automaticamente"
              />
              <p className="text-xs text-gray-500 mt-1">Se genera automáticamente del título</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contenido *</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
                placeholder="Escribe el contenido de la noticia aquí..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen destacada (ruta o URL)</label>
              <input
                type="text"
                value={formData.imagen}
                onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                placeholder="/images/activities/foto.jpeg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de publicación</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-gray-700">Destacada</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
            >
              {editingNews ? 'Actualizar' : 'Crear'}
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
    <DataTable
      title="Noticias"
      columns={columns}
      data={news}
      loading={loading}
      onAdd={() => setShowForm(true)}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
