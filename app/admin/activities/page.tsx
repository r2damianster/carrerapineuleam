'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/admin/DataTable';

interface ActivityRow {
  id: string;
  origen: string; // 'noticia' | 'actividad' | 'difusion'
  titulo: string;
  descripcion?: string;
  fecha: string;
  categoria?: string;
  photos: string[];
  aprobado_sitio: boolean;
  publicar_noticias: boolean;
  publicar_actividades: boolean;
}

// Cola de moderación: junta lo pendiente de aprobar (registrado por
// docentes/estudiantes vía /vinculacion/difusion o /gestion-carrera) con las
// actividades ya publicadas — fusión News+Activities+Difusión, CLAUDE.md
// Sesión 25. Las noticias tienen su propia página (/admin/news).
export default function AdminActivitiesPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<ActivityRow | null>(null);

  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    categoria: 'taller',
    imagen: '',
    publicar_noticias: false,
  });

  useEffect(() => {
    loadRows();
  }, []);

  const loadRows = async () => {
    try {
      const [pendientesRes, actividadesRes] = await Promise.all([
        fetch('/api/actividades-difusion?pendientes=true'),
        fetch('/api/actividades-difusion?seccion=actividades'),
      ]);
      const pendientes = pendientesRes.ok ? await pendientesRes.json() : [];
      const actividades = actividadesRes.ok ? await actividadesRes.json() : [];
      setRows([...pendientes, ...actividades].map((r: any) => ({ ...r, id: String(r.id) })));
    } catch (error) {
      console.error('Error loading activities:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      fecha: new Date().toISOString().split('T')[0],
      categoria: 'taller',
      imagen: '',
      publicar_noticias: false,
    });
    setEditingRow(null);
    setShowForm(false);
  };

  const handleEdit = (row: ActivityRow) => {
    setEditingRow(row);
    setFormData({
      titulo: row.titulo,
      descripcion: row.descripcion || '',
      fecha: row.fecha?.slice(0, 10) || '',
      categoria: row.categoria || 'taller',
      imagen: row.photos?.[0] || '',
      publicar_noticias: row.publicar_noticias || false,
    });
    setShowForm(true);
  };

  const handleDelete = async (row: ActivityRow) => {
    try {
      const res = await fetch(`/api/actividades-difusion/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadRows();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const handleTogglePublicada = async (row: ActivityRow) => {
    try {
      const res = await fetch(`/api/actividades-difusion/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicar_actividades: !row.publicar_actividades }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadRows();
    } catch (error) {
      console.error('Error toggling actividad:', error);
      alert('Error al cambiar visibilidad');
    }
  };

  const handleAprobar = async (row: ActivityRow) => {
    try {
      const res = await fetch(`/api/actividades-difusion/${row.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprobar: true }),
      });
      if (!res.ok) throw new Error('Failed to approve');
      loadRows();
    } catch (error) {
      console.error('Error approving:', error);
      alert('Error al aprobar');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const photos = formData.imagen ? [formData.imagen] : [];

    try {
      if (editingRow) {
        const res = await fetch(`/api/actividades-difusion/${editingRow.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            fecha: formData.fecha,
            categoria: formData.categoria,
            photos,
            publicar_noticias: formData.publicar_noticias,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
      } else {
        // Actividad creada directo por contenido_sitio -> nace ya aprobada.
        const res = await fetch('/api/actividades-difusion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origen: 'actividad',
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            fecha: formData.fecha,
            categoria: formData.categoria,
            photos,
            publicar_actividades: true,
            publicar_noticias: formData.publicar_noticias,
          }),
        });
        if (!res.ok) throw new Error('Failed to save');
      }

      resetForm();
      loadRows();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert('Error al guardar la actividad.');
    }
  };

  const columns = [
    { key: 'titulo', label: 'Título' },
    {
      key: 'origen',
      label: 'Origen',
      render: (item: ActivityRow) => (
        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium capitalize">
          {item.origen}{item.categoria ? ` · ${item.categoria}` : ''}
        </span>
      ),
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (item: ActivityRow) => (
        <span className="text-sm text-gray-600">
          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
    },
    {
      key: 'publicar_noticias',
      label: 'También en Noticias',
      render: (item: ActivityRow) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${item.publicar_noticias ? 'bg-uleam-gold text-uleam-blue' : 'bg-gray-200 text-gray-500'}`}>
          {item.publicar_noticias ? 'Sí' : 'No'}
        </span>
      ),
    },
    {
      key: 'publicar_actividades',
      label: 'Visible en /actividades',
      render: (item: ActivityRow) => (
        <button
          onClick={() => handleTogglePublicada(item)}
          className={`px-2 py-1 rounded text-xs font-bold ${item.publicar_actividades ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
        >
          {item.publicar_actividades ? 'Sí — ocultar' : 'Oculta — mostrar'}
        </button>
      ),
    },
    {
      key: 'aprobado_sitio',
      label: 'Estado',
      render: (item: ActivityRow) =>
        item.aprobado_sitio ? (
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Publicado</span>
        ) : (
          <button
            onClick={() => handleAprobar(item)}
            className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
          >
            Pendiente — Aprobar
          </button>
        ),
    },
  ];

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-uleam-blue">
            {editingRow ? 'Editar / Enriquecer' : 'Nueva Actividad'}
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
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Foto (ruta o URL)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del evento</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                >
                  <option value="taller">Taller</option>
                  <option value="evento">Evento</option>
                  <option value="interclass">InterClass</option>
                  <option value="feria">Feria</option>
                  <option value="reunion">Reunión</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.publicar_noticias}
                  onChange={(e) => setFormData({ ...formData, publicar_noticias: e.target.checked })}
                  className="w-5 h-5"
                />
                <span className="text-sm font-medium text-gray-700">También publicar en Noticias</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">Un mismo evento puede mostrarse en Actividades y en Noticias a la vez.</p>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition"
            >
              {editingRow ? 'Actualizar' : 'Crear'}
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
      title="Actividades y Difusión"
      columns={columns}
      data={rows}
      loading={loading}
      onAdd={() => setShowForm(true)}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  );
}
