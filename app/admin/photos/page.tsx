'use client';

import { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/admin/DataTable';

interface Foto {
  id: string;
  url: string;
  cloudinary_public_id: string | null;
  titulo: string | null;
  descripcion: string | null;
  ubicaciones: string[];
  order: number;
  activo: boolean;
  posicion: number;
}

const UBICACION_OPTIONS = [
  { value: 'portada', label: 'Portada (carrusel principal)' },
  { value: 'docencia-galeria', label: 'Galería de Docencia Innovadora' },
  { value: 'redlea-galeria', label: 'Galería de RED LEA' },
  { value: 'club-ingles', label: 'Club de Inglés en Escenarios Locales' },
];

export default function AdminPhotosPage() {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingFoto, setEditingFoto] = useState<Foto | null>(null);

  const [formData, setFormData] = useState({
    file: null as File | null,
    titulo: '',
    descripcion: '',
    ubicaciones: ['portada'] as string[],
    order: 0,
    posicion: 50,
  });

  // Vista previa en vivo del slider de posición: la foto ya subida (al
  // editar) o la que se acaba de elegir en el input de archivo (al crear).
  const localFileUrl = useMemo(() => (formData.file ? URL.createObjectURL(formData.file) : null), [formData.file]);
  useEffect(() => {
    return () => {
      if (localFileUrl) URL.revokeObjectURL(localFileUrl);
    };
  }, [localFileUrl]);
  const previewUrl = editingFoto?.url || localFileUrl;

  useEffect(() => {
    loadFotos();
  }, []);

  const loadFotos = async () => {
    try {
      const res = await fetch('/api/photos?all=true');
      if (!res.ok) throw new Error('Failed to fetch photos');
      const records = await res.json();
      setFotos(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error loading fotos:', error);
      setFotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (foto: Foto) => {
    try {
      const res = await fetch(`/api/photos/${foto.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !foto.activo }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadFotos();
    } catch (error) {
      console.error('Error toggling foto:', error);
      alert('Error al cambiar visibilidad');
    }
  };

  const resetForm = () => {
    setFormData({ file: null, titulo: '', descripcion: '', ubicaciones: ['portada'], order: 0, posicion: 50 });
    setEditingFoto(null);
    setShowForm(false);
  };

  const handleEdit = (foto: Foto) => {
    setEditingFoto(foto);
    setFormData({
      file: null,
      titulo: foto.titulo || '',
      descripcion: foto.descripcion || '',
      ubicaciones: foto.ubicaciones || [],
      order: foto.order,
      posicion: foto.posicion ?? 50,
    });
    setShowForm(true);
  };

  const handleDelete = async (foto: Foto) => {
    try {
      const res = await fetch(`/api/photos/${foto.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadFotos();
    } catch (error) {
      console.error('Error deleting foto:', error);
      alert('Error al eliminar foto');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingFoto) {
      setUploading(true);
      try {
        const res = await fetch(`/api/photos/${editingFoto.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            ubicaciones: formData.ubicaciones,
            order: formData.order,
            posicion: formData.posicion,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update');
        }
        resetForm();
        loadFotos();
      } catch (error: any) {
        console.error('Error updating foto:', error);
        alert(error.message || 'Error al actualizar la foto');
      } finally {
        setUploading(false);
      }
      return;
    }

    if (!formData.file) {
      alert('Seleccioná una imagen');
      return;
    }

    setUploading(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('file', formData.file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Error subiendo la imagen');

      const res = await fetch('/api/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: uploadData.url,
          cloudinary_public_id: uploadData.public_id,
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          ubicaciones: formData.ubicaciones,
          order: formData.order,
          posicion: formData.posicion,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }

      resetForm();
      loadFotos();
    } catch (error: any) {
      console.error('Error saving foto:', error);
      alert(error.message || 'Error al guardar la foto');
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      key: 'url',
      label: 'Foto',
      render: (item: Foto) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.url} alt={item.titulo || ''} className="w-16 h-16 object-cover rounded-lg border" />
      ),
    },
    { key: 'titulo', label: 'Título' },
    {
      key: 'ubicaciones',
      label: 'Ubicaciones',
      render: (item: Foto) => (
        <span className="text-xs text-gray-500">{(item.ubicaciones || []).join(', ') || '-'}</span>
      ),
    },
    { key: 'order', label: 'Orden' },
    {
      key: 'activo',
      label: 'Visible en el sitio',
      render: (item: Foto) => (
        <button
          onClick={() => handleToggleActivo(item)}
          className={`px-2 py-1 rounded text-xs font-bold ${item.activo ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
        >
          {item.activo ? 'Sí — ocultar' : 'Oculto — mostrar'}
        </button>
      ),
    },
  ];

  return (
    <div>
      {!showForm ? (
        <DataTable
          title="Banco de Fotos"
          columns={columns}
          data={fotos}
          loading={loading}
          onAdd={() => setShowForm(true)}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-uleam-blue">{editingFoto ? 'Editar Foto' : 'Nueva Foto'}</h2>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              ← Volver
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-md max-w-2xl">
            <div className="space-y-4">
              {editingFoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={editingFoto.url} alt={editingFoto.titulo || ''} className="w-32 h-32 object-cover rounded-lg border" />
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Imagen *</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  placeholder="Ej: Graduación de estudiantes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (interno)</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ubicaciones (dónde aparece esta foto)</label>
                <div className="space-y-2">
                  {UBICACION_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.ubicaciones.includes(opt.value)}
                        onChange={(e) => {
                          const ubicaciones = e.target.checked
                            ? [...formData.ubicaciones, opt.value]
                            : formData.ubicaciones.filter((u) => u !== opt.value);
                          setFormData({ ...formData, ubicaciones });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posición vertical de la imagen (ajustá si corta cabezas/rostros): {formData.posicion}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={formData.posicion}
                  onChange={(e) => setFormData({ ...formData, posicion: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>Arriba</span>
                  <span>Centro</span>
                  <span>Abajo</span>
                </div>
                {previewUrl && (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Vista previa"
                      className="w-full h-full object-cover"
                      style={{ objectPosition: `center ${formData.posicion}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-4">
              <button
                type="submit"
                disabled={uploading}
                className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition disabled:opacity-50"
              >
                {uploading ? 'Guardando...' : editingFoto ? 'Actualizar' : 'Crear'}
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
      )}
    </div>
  );
}
