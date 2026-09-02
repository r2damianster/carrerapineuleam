'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/admin/DataTable';
import type { Publication } from '@/types';

export default function AdminPublicationsPage() {
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    authors: '',
    abstract: '',
    publication_date: new Date().toISOString().split('T')[0],
    doi_link: '',
    type: 'article' as Publication['type'],
    category: 'regional' as Publication['category'],
  });

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      const res = await fetch('/api/publications');
      if (!res.ok) throw new Error('Failed to fetch publications');
      const records = await res.json();
      setPublications(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error loading publications:', error);
      setPublications([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      authors: '',
      abstract: '',
      publication_date: new Date().toISOString().split('T')[0],
      doi_link: '',
      type: 'article',
      category: 'regional',
    });
    setEditingPub(null);
    setShowForm(false);
  };

  const handleEdit = (pub: Publication) => {
    setEditingPub(pub);
    setFormData({
      title: pub.title,
      authors: pub.authors,
      abstract: pub.abstract,
      publication_date: pub.publication_date,
      doi_link: pub.doi_link || '',
      type: pub.type,
      category: pub.category,
    });
    setShowForm(true);
  };

  const handleDelete = async (pub: Publication) => {
    try {
      const res = await fetch(`/api/publications/${pub.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadPublications();
    } catch (error) {
      console.error('Error deleting publication:', error);
      alert('Error al eliminar publicación');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingPub ? `/api/publications/${editingPub.id}` : '/api/publications';
      const method = editingPub ? 'PATCH' : 'POST';
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
      loadPublications();
    } catch (error) {
      console.error('Error saving publication:', error);
      alert('Error al guardar publicación');
    }
  };

  const columns = [
    { key: 'title', label: 'Título' },
    { key: 'authors', label: 'Autores' },
    {
      key: 'category',
      label: 'Categoría',
      render: (item: Publication) => {
        const labels: Record<string, string> = {
          regional: 'Regional',
          libros: 'Libros',
          impacto: 'De Impacto',
        };
        const colors: Record<string, string> = {
          regional: 'bg-blue-100 text-blue-700',
          libros: 'bg-green-100 text-green-700',
          impacto: 'bg-red-100 text-red-700',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${colors[item.category]}`}>
            {labels[item.category]}
          </span>
        );
      },
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (item: Publication) => {
        const types: Record<string, string> = {
          article: 'Artículo',
          conference: 'Conferencia',
          book: 'Libro',
          other: 'Otro',
        };
        const colors: Record<string, string> = {
          article: 'bg-blue-100 text-blue-700',
          conference: 'bg-purple-100 text-purple-700',
          book: 'bg-green-100 text-green-700',
          other: 'bg-gray-100 text-gray-700',
        };
        return (
          <span className={`px-2 py-1 rounded text-xs font-bold ${colors[item.type]}`}>
            {types[item.type]}
          </span>
        );
      },
    },
    {
      key: 'publication_date',
      label: 'Fecha',
      render: (item: Publication) => (
        <span className="text-sm text-gray-600">
          {new Date(item.publication_date).toLocaleDateString('es-EC')}
        </span>
      ),
    },
  ];

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-uleam-blue">
            {editingPub ? 'Editar Publicación' : 'Nueva Publicación'}
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
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Autores *</label>
              <input
                type="text"
                value={formData.authors}
                onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                placeholder="Ej: Rodríguez, A., Villafuerte, J."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resumen *</label>
              <textarea
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                >
                  <option value="article">Artículo Científico</option>
                  <option value="conference">Conferencia</option>
                  <option value="book">Libro/Capítulo</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                >
                  <option value="regional">Regional</option>
                  <option value="libros">Libros</option>
                  <option value="impacto">De Impacto</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de publicación</label>
                <input
                  type="date"
                  value={formData.publication_date}
                  onChange={(e) => setFormData({ ...formData, publication_date: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Link DOI</label>
                <input
                  type="url"
                  value={formData.doi_link}
                  onChange={(e) => setFormData({ ...formData, doi_link: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="https://doi.org/..."
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
            >
              {editingPub ? 'Actualizar' : 'Crear'}
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
      title="Publicaciones Científicas"
      columns={columns}
      data={publications}
      loading={loading}
      onAdd={() => setShowForm(true)}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
