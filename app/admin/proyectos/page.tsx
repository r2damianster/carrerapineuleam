'use client';

import { useState, useEffect } from 'react';
import DataTable from '@/components/admin/DataTable';

interface Proyecto {
  id: string;
  nombre_oficial: string;
  tipo: 'plantilla_simple' | 'personalizada';
  slug: string | null;
  grupo_nav: string | null;
  nav_label: string | null;
  order: number;
  activo: boolean;
  es_red: boolean;
  hero_title1_es: string | null;
  hero_title1_en: string | null;
  hero_title2_es: string | null;
  hero_title2_en: string | null;
  hero_subtitle_es: string | null;
  hero_subtitle_en: string | null;
  hero_description_es: string | null;
  hero_description_en: string | null;
  integration_text_es: string | null;
  integration_text_en: string | null;
  info_text_es: string | null;
  info_text_en: string | null;
  lider_nombre: string | null;
  lider_email: string | null;
  lider_orcid: string | null;
}

const GRUPO_NAV_OPTIONS = [
  { value: 'docencia', label: 'Docencia' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'vinculacion', label: 'Vinculación' },
  { value: 'ninguno', label: 'Ninguno (no aparece en el menú)' },
];

const FORM_INICIAL = {
  nombre_oficial: '',
  slug: '',
  grupo_nav: 'investigacion',
  nav_label: '',
  order: 0,
  hero_title1_es: '', hero_title1_en: '',
  hero_title2_es: '', hero_title2_en: '',
  hero_subtitle_es: '', hero_subtitle_en: '',
  hero_description_es: '', hero_description_en: '',
  integration_text_es: '', integration_text_en: '',
  info_text_es: '', info_text_en: '',
  lider_nombre: '', lider_email: '', lider_orcid: '',
};

export default function AdminProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProyecto, setEditingProyecto] = useState<Proyecto | null>(null);
  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => {
    loadProyectos();
  }, []);

  const loadProyectos = async () => {
    try {
      const res = await fetch('/api/proyectos?all=true');
      if (!res.ok) throw new Error('Failed to fetch proyectos');
      const records = await res.json();
      setProyectos(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Error loading proyectos:', error);
      setProyectos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (proyecto: Proyecto) => {
    try {
      const res = await fetch(`/api/proyectos/${proyecto.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !proyecto.activo }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      loadProyectos();
    } catch (error) {
      console.error('Error toggling proyecto:', error);
      alert('Error al cambiar visibilidad');
    }
  };

  const resetForm = () => {
    setFormData(FORM_INICIAL);
    setEditingProyecto(null);
    setShowForm(false);
  };

  const handleEdit = (proyecto: Proyecto) => {
    setEditingProyecto(proyecto);
    setFormData({
      nombre_oficial: proyecto.nombre_oficial,
      slug: proyecto.slug || '',
      grupo_nav: proyecto.grupo_nav || 'investigacion',
      nav_label: proyecto.nav_label || '',
      order: proyecto.order,
      hero_title1_es: proyecto.hero_title1_es || '', hero_title1_en: proyecto.hero_title1_en || '',
      hero_title2_es: proyecto.hero_title2_es || '', hero_title2_en: proyecto.hero_title2_en || '',
      hero_subtitle_es: proyecto.hero_subtitle_es || '', hero_subtitle_en: proyecto.hero_subtitle_en || '',
      hero_description_es: proyecto.hero_description_es || '', hero_description_en: proyecto.hero_description_en || '',
      integration_text_es: proyecto.integration_text_es || '', integration_text_en: proyecto.integration_text_en || '',
      info_text_es: proyecto.info_text_es || '', info_text_en: proyecto.info_text_en || '',
      lider_nombre: proyecto.lider_nombre || '', lider_email: proyecto.lider_email || '', lider_orcid: proyecto.lider_orcid || '',
    });
    setShowForm(true);
  };

  const esEdicionPlantillaSimple = editingProyecto ? editingProyecto.tipo === 'plantilla_simple' : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProyecto) {
        const res = await fetch(`/api/proyectos/${editingProyecto.slug}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre_oficial: formData.nombre_oficial,
            nav_label: formData.nav_label,
            grupo_nav: formData.grupo_nav,
            order: formData.order,
            ...(esEdicionPlantillaSimple
              ? {
                  hero_title1_es: formData.hero_title1_es, hero_title1_en: formData.hero_title1_en,
                  hero_title2_es: formData.hero_title2_es, hero_title2_en: formData.hero_title2_en,
                  hero_subtitle_es: formData.hero_subtitle_es, hero_subtitle_en: formData.hero_subtitle_en,
                  hero_description_es: formData.hero_description_es, hero_description_en: formData.hero_description_en,
                  integration_text_es: formData.integration_text_es, integration_text_en: formData.integration_text_en,
                  info_text_es: formData.info_text_es, info_text_en: formData.info_text_en,
                  lider_nombre: formData.lider_nombre, lider_email: formData.lider_email, lider_orcid: formData.lider_orcid,
                }
              : {}),
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to update');
        }
      } else {
        const res = await fetch('/api/proyectos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to create');
        }
      }
      resetForm();
      loadProyectos();
    } catch (error: any) {
      console.error('Error saving proyecto:', error);
      alert(error.message || 'Error al guardar el proyecto');
    }
  };

  const columns = [
    { key: 'nombre_oficial', label: 'Nombre' },
    {
      key: 'tipo',
      label: 'Tipo',
      render: (item: Proyecto) => (
        <span className={`px-2 py-1 rounded text-xs font-bold ${item.tipo === 'plantilla_simple' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-700'}`}>
          {item.tipo === 'plantilla_simple' ? 'Editable sin código' : 'Personalizada (código)'}
        </span>
      ),
    },
    { key: 'grupo_nav', label: 'Menú' },
    { key: 'order', label: 'Orden' },
    {
      key: 'activo',
      label: 'Visible en el menú',
      render: (item: Proyecto) => (
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
        <>
          <p className="text-sm text-gray-500 mb-4 max-w-3xl">
            Los proyectos &quot;Editable sin código&quot; se pueden crear/editar completos desde acá
            (hero, integración, equipo, contacto). Los &quot;Personalizados&quot; tienen página propia
            con código a medida (ej. RED LEA) — desde acá solo se puede ocultar/mostrar y reordenar
            su entrada en el menú.
          </p>
          <DataTable
            title="Proyectos"
            columns={columns}
            data={proyectos}
            loading={loading}
            onAdd={() => setShowForm(true)}
            onEdit={handleEdit}
            onDelete={() => alert('Los proyectos no se eliminan — usá "ocultar" para quitarlos del menú sin perder sus datos.')}
          />
        </>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-uleam-blue">
              {editingProyecto ? `Editar: ${editingProyecto.nombre_oficial}` : 'Nuevo Proyecto'}
            </h2>
            <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
              ← Volver
            </button>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-md max-w-3xl">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre oficial *</label>
                <input
                  type="text"
                  value={formData.nombre_oficial}
                  onChange={(e) => setFormData({ ...formData, nombre_oficial: e.target.value })}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>

              {!editingProyecto && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug (URL, sin espacios) *</label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    required
                    placeholder="ej: mi-proyecto-nuevo"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">La página quedará en /proyectos/{formData.slug || '...'}</p>
                </div>
              )}

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Aparece en el menú de</label>
                  <select
                    value={formData.grupo_nav}
                    onChange={(e) => setFormData({ ...formData, grupo_nav: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  >
                    {GRUPO_NAV_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Etiqueta en el menú</label>
                  <input
                    type="text"
                    value={formData.nav_label}
                    onChange={(e) => setFormData({ ...formData, nav_label: e.target.value })}
                    placeholder="Si se deja vacío usa el nombre oficial"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>
                <div className="w-32">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Orden</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>
              </div>

              {esEdicionPlantillaSimple && (
                <>
                  <hr className="my-2" />
                  <h3 className="font-bold text-uleam-blue">Portada del proyecto (Hero)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="Título línea 1 (ES)" value={formData.hero_title1_es} onChange={(e) => setFormData({ ...formData, hero_title1_es: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="Título línea 1 (EN, opcional)" value={formData.hero_title1_en} onChange={(e) => setFormData({ ...formData, hero_title1_en: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="Título línea 2 (ES)" value={formData.hero_title2_es} onChange={(e) => setFormData({ ...formData, hero_title2_es: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="Título línea 2 (EN, opcional)" value={formData.hero_title2_en} onChange={(e) => setFormData({ ...formData, hero_title2_en: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="Subtítulo (ES)" value={formData.hero_subtitle_es} onChange={(e) => setFormData({ ...formData, hero_subtitle_es: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="Subtítulo (EN, opcional)" value={formData.hero_subtitle_en} onChange={(e) => setFormData({ ...formData, hero_subtitle_en: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <textarea placeholder="Descripción (ES)" value={formData.hero_description_es} onChange={(e) => setFormData({ ...formData, hero_description_es: e.target.value })} rows={2} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <textarea placeholder="Descripción (EN, opcional)" value={formData.hero_description_en} onChange={(e) => setFormData({ ...formData, hero_description_en: e.target.value })} rows={2} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                  </div>

                  <h3 className="font-bold text-uleam-blue mt-4">Integración con el proyecto principal</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <textarea placeholder="Texto de integración (ES)" value={formData.integration_text_es} onChange={(e) => setFormData({ ...formData, integration_text_es: e.target.value })} rows={3} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <textarea placeholder="Texto de integración (EN, opcional)" value={formData.integration_text_en} onChange={(e) => setFormData({ ...formData, integration_text_en: e.target.value })} rows={3} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                  </div>

                  <h3 className="font-bold text-uleam-blue mt-4">Información adicional (opcional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <textarea placeholder="Info adicional (ES)" value={formData.info_text_es} onChange={(e) => setFormData({ ...formData, info_text_es: e.target.value })} rows={2} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <textarea placeholder="Info adicional (EN, opcional)" value={formData.info_text_en} onChange={(e) => setFormData({ ...formData, info_text_en: e.target.value })} rows={2} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                  </div>

                  <h3 className="font-bold text-uleam-blue mt-4">Líder / contacto</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <input type="text" placeholder="Nombre" value={formData.lider_nombre} onChange={(e) => setFormData({ ...formData, lider_nombre: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="email" placeholder="Email" value={formData.lider_email} onChange={(e) => setFormData({ ...formData, lider_email: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                    <input type="text" placeholder="ORCID (opcional)" value={formData.lider_orcid} onChange={(e) => setFormData({ ...formData, lider_orcid: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-lg outline-none" />
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-4">
              <button type="submit" className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition">
                {editingProyecto ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
