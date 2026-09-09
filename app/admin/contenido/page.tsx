'use client';

import { useState, useEffect, useMemo } from 'react';
import DataTable from '@/components/admin/DataTable';

interface ContenidoRow {
  id: string;
  origen: string; // 'noticia' | 'actividad' | 'difusion'
  titulo: string;
  descripcion?: string;
  observaciones?: string;
  fecha: string;
  categoria?: string;
  proyecto?: string;
  asignatura?: string;
  tipo?: string;
  hora?: string;
  audiencia_alcanzada?: number;
  profesores_responsables?: number[];
  photos: string[];
  is_featured: boolean;
  slug?: string;
  aprobado_sitio: boolean;
  publicar_noticias: boolean;
  publicar_actividades: boolean;
}

type Filtro = 'todos' | 'pendientes' | 'noticias' | 'actividades';

const TIPO_LABEL: Record<string, string> = {
  podcast: 'Podcast',
  evento_fisico: 'Evento físico',
  encuentro_comunitario: 'Encuentro comunitario',
  evento_formacion: 'Evento de formación',
  visita_tecnica: 'Visita Técnica',
};

const PROYECTOS_INVESTIGACION_IDS = ['internacionalizacion', 'desarrollo_habilidades', 'mentoring'];

const FORM_INICIAL = {
  titulo: '',
  descripcion: '',
  observaciones: '',
  fecha: new Date().toISOString().split('T')[0],
  categoria: 'evento',
  proyecto: '',
  asignatura: '',
  tipo: 'evento_fisico',
  hora: '',
  audiencia_alcanzada: '',
  profesoresResponsables: [] as number[],
  imagen: '',
  slug: '',
  is_featured: false,
  publicar_noticias: false,
  publicar_actividades: false,
};

// Panel único de contenido: fusiona lo que antes eran 3 pantallas separadas
// (Noticias, Actividades, Difusión) sobre la misma tabla `actividades_difusion`
// — ver CLAUDE.md, propuesta de unificación. Los 2 checkboxes de publicación
// (Noticias / Actividades) van juntos en el mismo formulario en vez de cada
// uno viviendo en su propia pantalla con un checkbox "también publicar en la
// otra" — eso fue justo la causa de que una visita técnica quedara invisible
// (se activó el canal equivocado sin que nadie lo notara).
//
// Cuando origen==='difusion' (lo registró un docente/estudiante vía
// /gestion-carrera o /vinculacion/difusion) el form muestra los campos
// propios de ese registro (tipo de evento, categoría investigación/
// vinculación/asignatura + proyecto, hora, asistentes, profesores
// responsables) — antes de esto el edit solo tenía la categoría de "actividad
// admin" (taller/evento/...) y esos 6 campos ni se mostraban ni se guardaban.
export default function AdminContenidoPage() {
  const [rows, setRows] = useState<ContenidoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRow, setEditingRow] = useState<ContenidoRow | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [generandoIA, setGenerandoIA] = useState(false);
  const [errorIA, setErrorIA] = useState('');
  const [profesores, setProfesores] = useState<{ id: number; nombres: string; apellidos: string }[]>([]);
  const [proyectosInvestigacion, setProyectosInvestigacion] = useState<{ id: string; nombre_oficial: string }[]>([]);

  const [formData, setFormData] = useState(FORM_INICIAL);

  useEffect(() => {
    loadRows();

    fetch('/api/profesores')
      .then(res => res.ok ? res.json() : { profesores: [] })
      .then(data => setProfesores(data.profesores || []))
      .catch(() => setProfesores([]));

    fetch('/api/proyectos?all=true')
      .then(res => res.ok ? res.json() : [])
      .then((rows: any[]) => setProyectosInvestigacion(
        (Array.isArray(rows) ? rows : [])
          .filter(p => PROYECTOS_INVESTIGACION_IDS.includes(p.id))
          .sort((a, b) => PROYECTOS_INVESTIGACION_IDS.indexOf(a.id) - PROYECTOS_INVESTIGACION_IDS.indexOf(b.id))
          .map(p => ({ id: p.id, nombre_oficial: p.nombre_oficial }))
      ))
      .catch(() => setProyectosInvestigacion([]));
  }, []);

  const loadRows = async () => {
    try {
      const res = await fetch('/api/actividades-difusion?admin=true');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRows(data.map((r: any) => ({ ...r, id: String(r.id) })));
    } catch (error) {
      console.error('Error loading contenido:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const rowsFiltradas = useMemo(() => {
    switch (filtro) {
      case 'pendientes': return rows.filter(r => !r.aprobado_sitio);
      case 'noticias': return rows.filter(r => r.publicar_noticias);
      case 'actividades': return rows.filter(r => r.publicar_actividades);
      default: return rows;
    }
  }, [rows, filtro]);

  const conteos = useMemo(() => ({
    todos: rows.length,
    pendientes: rows.filter(r => !r.aprobado_sitio).length,
    noticias: rows.filter(r => r.publicar_noticias).length,
    actividades: rows.filter(r => r.publicar_actividades).length,
  }), [rows]);

  const resetForm = () => {
    setFormData(FORM_INICIAL);
    setEditingRow(null);
    setErrorIA('');
    setShowForm(false);
  };

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const esDifusion = editingRow?.origen === 'difusion';

  const handleEdit = (row: ContenidoRow) => {
    setEditingRow(row);
    setFormData({
      titulo: row.titulo,
      descripcion: row.descripcion || '',
      observaciones: row.observaciones || '',
      fecha: row.fecha?.slice(0, 10) || '',
      categoria: row.categoria || (row.origen === 'difusion' ? 'vinculacion' : 'evento'),
      proyecto: row.proyecto || '',
      asignatura: row.asignatura || '',
      tipo: row.tipo || 'evento_fisico',
      hora: row.hora || '',
      audiencia_alcanzada: row.audiencia_alcanzada != null ? String(row.audiencia_alcanzada) : '',
      profesoresResponsables: row.profesores_responsables || [],
      imagen: row.photos?.[0] || '',
      slug: row.slug || '',
      is_featured: row.is_featured || false,
      publicar_noticias: row.publicar_noticias || false,
      publicar_actividades: row.publicar_actividades || false,
    });
    setErrorIA('');
    setShowForm(true);
  };

  const toggleResponsable = (id: number) => {
    setFormData(prev => ({
      ...prev,
      profesoresResponsables: prev.profesoresResponsables.includes(id)
        ? prev.profesoresResponsables.filter(r => r !== id)
        : [...prev.profesoresResponsables, id],
    }));
  };

  const handleDelete = async (row: ContenidoRow) => {
    try {
      const res = await fetch(`/api/actividades-difusion/${row.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      loadRows();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('Error al eliminar');
    }
  };

  const patch = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/actividades-difusion/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update');
    loadRows();
  };

  const handleToggleNoticias = (row: ContenidoRow) =>
    patch(row.id, { publicar_noticias: !row.publicar_noticias }).catch(() => alert('Error al cambiar visibilidad'));
  const handleToggleActividades = (row: ContenidoRow) =>
    patch(row.id, { publicar_actividades: !row.publicar_actividades }).catch(() => alert('Error al cambiar visibilidad'));
  const handleToggleDestacado = (row: ContenidoRow) =>
    patch(row.id, { is_featured: !row.is_featured }).catch(() => alert('Error al cambiar destacado'));
  const handleAprobar = (row: ContenidoRow) =>
    patch(row.id, { aprobar: true, publicar_noticias: true }).catch(() => alert('Error al aprobar'));

  const generarConIA = async () => {
    if (!formData.titulo) {
      setErrorIA('Escribe al menos el título antes de generar con IA.');
      return;
    }
    setGenerandoIA(true);
    setErrorIA('');
    try {
      const res = await fetch('/api/difusion/generar-texto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: formData.titulo,
          tipo: esDifusion ? formData.tipo : undefined,
          categoria: formData.categoria,
          proyecto: formData.proyecto,
          asignatura: formData.asignatura,
          fecha: formData.fecha,
          hora: esDifusion ? formData.hora : undefined,
          audiencia_alcanzada: esDifusion ? formData.audiencia_alcanzada : undefined,
          descripcion_actual: formData.descripcion,
          observaciones_actual: formData.observaciones,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando texto con IA');
      setFormData(prev => ({
        ...prev,
        descripcion: data.descripcion || prev.descripcion,
        observaciones: data.observaciones || prev.observaciones,
      }));
    } catch (error: any) {
      setErrorIA(error.message);
    } finally {
      setGenerandoIA(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const photos = formData.imagen ? [formData.imagen] : [];
    const slug = formData.slug || generateSlug(formData.titulo);

    try {
      if (editingRow) {
        await patch(editingRow.id, {
          titulo: formData.titulo,
          descripcion: formData.descripcion,
          observaciones: formData.observaciones,
          fecha: formData.fecha,
          categoria: formData.categoria,
          photos,
          slug,
          is_featured: formData.is_featured,
          publicar_noticias: formData.publicar_noticias,
          publicar_actividades: formData.publicar_actividades,
          ...(esDifusion ? {
            proyecto: formData.categoria === 'investigacion' ? formData.proyecto : '',
            asignatura: formData.categoria === 'asignatura' ? formData.asignatura : '',
            tipo: formData.tipo,
            hora: formData.hora,
            audiencia_alcanzada: formData.audiencia_alcanzada ? parseInt(formData.audiencia_alcanzada, 10) : null,
            profesores_responsables: formData.profesoresResponsables,
          } : {}),
        });
      } else {
        const res = await fetch('/api/actividades-difusion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            origen: 'actividad',
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            observaciones: formData.observaciones,
            fecha: formData.fecha,
            categoria: formData.categoria,
            photos,
            slug,
            is_featured: formData.is_featured,
            publicar_noticias: formData.publicar_noticias,
            publicar_actividades: formData.publicar_actividades,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to save');
        }
      }
      resetForm();
      loadRows();
    } catch (error: any) {
      console.error('Error saving contenido:', error);
      alert(error.message || 'Error al guardar');
    }
  };

  const columns = [
    { key: 'titulo', label: 'Título' },
    {
      key: 'origen',
      label: 'Origen',
      render: (item: ContenidoRow) => (
        <span className="px-2 py-1 bg-pink-100 text-pink-700 rounded text-xs font-medium capitalize">
          {item.origen}{item.categoria ? ` · ${item.categoria}` : ''}
        </span>
      ),
    },
    {
      key: 'fecha',
      label: 'Fecha',
      render: (item: ContenidoRow) => (
        <span className="text-sm text-gray-600">
          {item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '—'}
        </span>
      ),
    },
    {
      key: 'is_featured',
      label: 'Destacado',
      render: (item: ContenidoRow) => (
        <button onClick={() => handleToggleDestacado(item)} className={`px-2 py-1 rounded text-xs font-bold ${item.is_featured ? 'bg-uleam-gold text-uleam-blue hover:opacity-80' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
          {item.is_featured ? 'Sí' : 'No'}
        </button>
      ),
    },
    {
      key: 'publicar_noticias',
      label: 'Noticias',
      render: (item: ContenidoRow) => (
        <button onClick={() => handleToggleNoticias(item)} className={`px-2 py-1 rounded text-xs font-bold ${item.publicar_noticias ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
          {item.publicar_noticias ? 'Sí — ocultar' : 'Oculta — mostrar'}
        </button>
      ),
    },
    {
      key: 'publicar_actividades',
      label: 'Actividades',
      render: (item: ContenidoRow) => (
        <button onClick={() => handleToggleActividades(item)} className={`px-2 py-1 rounded text-xs font-bold ${item.publicar_actividades ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
          {item.publicar_actividades ? 'Sí — ocultar' : 'Oculta — mostrar'}
        </button>
      ),
    },
    {
      key: 'aprobado_sitio',
      label: 'Estado',
      render: (item: ContenidoRow) =>
        item.aprobado_sitio ? (
          <span className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">Publicado</span>
        ) : (
          <button onClick={() => handleAprobar(item)} className="px-2 py-1 rounded text-xs font-bold bg-yellow-100 text-yellow-700 hover:bg-yellow-200">
            Pendiente — Aprobar
          </button>
        ),
    },
  ];

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: `Todo (${conteos.todos})` },
    { key: 'pendientes', label: `Pendientes de aprobar (${conteos.pendientes})` },
    { key: 'noticias', label: `Noticias (${conteos.noticias})` },
    { key: 'actividades', label: `Actividades (${conteos.actividades})` },
  ];

  if (showForm) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-uleam-blue">
            {editingRow ? 'Editar / Aprobar contenido' : 'Nuevo contenido'}
          </h2>
          <button onClick={resetForm} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
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
                  setFormData({ ...formData, titulo, slug: formData.slug || generateSlug(titulo) });
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
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <button type="button" onClick={generarConIA} disabled={generandoIA} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                  {generandoIA ? 'Generando...' : formData.descripcion ? '✨ Mejorar con IA' : '✨ Generar con IA'}
                </button>
              </div>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
                placeholder="Escribe una descripción breve (opcional) y la IA la mejora, o déjala vacía y la IA la redacta desde el título/fecha/categoría."
              />
              {errorIA && <p className="mt-1 text-xs text-red-600">{errorIA}</p>}
              <p className="mt-1 text-xs text-gray-500">Revisa siempre el texto generado antes de guardar.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones (opcional)</label>
              <textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Imagen destacada (URL)</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha</label>
                <input
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                />
              </div>
              {esDifusion && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hora</label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>
              )}
            </div>

            {esDifusion ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de evento</label>
                    <select
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                    >
                      {Object.entries(TIPO_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
                    <select
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                    >
                      <option value="investigacion">Investigación</option>
                      <option value="vinculacion">Vinculación</option>
                      <option value="asignatura">Asignatura</option>
                    </select>
                  </div>
                </div>

                {formData.categoria === 'investigacion' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">¿Qué proyecto de investigación?</label>
                    <select
                      value={formData.proyecto}
                      onChange={(e) => setFormData({ ...formData, proyecto: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                    >
                      <option value="">Selecciona un proyecto...</option>
                      {proyectosInvestigacion.map(p => (
                        <option key={p.id} value={p.nombre_oficial}>{p.nombre_oficial}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.categoria === 'asignatura' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la asignatura</label>
                    <input
                      type="text"
                      value={formData.asignatura}
                      onChange={(e) => setFormData({ ...formData, asignatura: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">N° Asistentes</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.audiencia_alcanzada}
                    onChange={(e) => setFormData({ ...formData, audiencia_alcanzada: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uleam-blue outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Profesor(es) Responsable(s)</label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                    {profesores.length === 0 && <p className="text-sm text-gray-400">Cargando profesores...</p>}
                    {profesores.map(profesor => (
                      <label key={profesor.id} className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.profesoresResponsables.includes(profesor.id)}
                          onChange={() => toggleResponsable(profesor.id)}
                        />
                        {profesor.nombres} {profesor.apellidos}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : (
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
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_featured}
                onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                className="w-5 h-5"
              />
              <label className="text-sm font-medium text-gray-700">Destacado</label>
            </div>

            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-700 mb-2">¿Dónde se publica? (puede ser en ambos, uno, o ninguno todavía)</p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.publicar_noticias}
                    onChange={(e) => setFormData({ ...formData, publicar_noticias: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">Sección Noticias (<code>/</code>)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.publicar_actividades}
                    onChange={(e) => setFormData({ ...formData, publicar_actividades: e.target.checked })}
                    className="w-5 h-5"
                  />
                  <span className="text-sm text-gray-700">Galería de Actividades</span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button type="submit" className="flex-1 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 transition">
              {editingRow ? 'Actualizar' : 'Crear'}
            </button>
            <button type="button" onClick={resetForm} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filtro === f.key ? 'bg-uleam-blue text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-100'}`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <DataTable
        title="Contenido y Difusión"
        columns={columns}
        data={rowsFiltradas}
        loading={loading}
        onAdd={() => setShowForm(true)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}
